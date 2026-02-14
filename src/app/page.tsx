"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

type Entry = {
  id: string;
  person: string;
  amount: number;
  paid_amount: number;
  status: "open" | "paid";
  type: "toMe" | "iOwe";
  user_id: string;
  created_at: string;
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"toMe" | "iOwe">("toMe");

  // 🔐 Session prüfen
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 📥 Einträge laden
  const fetchEntries = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setEntries(data || []);
  };

  useEffect(() => {
    if (user) fetchEntries();
  }, [user]);

  // ➕ Eintrag hinzufügen
  const addEntry = async () => {
    if (!person || !amount || !user) return;

    await supabase.from("entries").insert([
      {
        person,
        amount: Number(amount),
        paid_amount: 0,
        status: "open",
        type,
        user_id: user.id,
      },
    ]);

    fetchEntries();
    setPerson("");
    setAmount("");
  };

  // ❌ Löschen
  const deleteEntry = async (id: string) => {
    await supabase.from("entries").delete().eq("id", id);
    setEntries(entries.filter((e) => e.id !== id));
  };

  // ✅ Als bezahlt markieren
  const markAsPaid = async (entry: Entry) => {
    await supabase
      .from("entries")
      .update({
        paid_amount: entry.amount,
        status: "paid",
      })
      .eq("id", entry.id);

    fetchEntries();
  };

  // 💰 Teilzahlung
  const addPayment = async (entry: Entry, payment: number) => {
    const newPaidAmount = entry.paid_amount + payment;
    const newStatus =
      newPaidAmount >= entry.amount ? "paid" : "open";

    await supabase
      .from("entries")
      .update({
        paid_amount: newPaidAmount,
        status: newStatus,
      })
      .eq("id", entry.id);

    fetchEntries();
  };

  // 📊 Summen
  const toMeTotal = entries
    .filter((e) => e.type === "toMe")
    .reduce((sum, e) => sum + (e.amount - e.paid_amount), 0);

  const iOweTotal = entries
    .filter((e) => e.type === "iOwe")
    .reduce((sum, e) => sum + (e.amount - e.paid_amount), 0);

  // 🔒 Login anzeigen wenn nicht eingeloggt
  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <main className="min-h-screen bg-gray-50 text-black p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">
            Schulden Manager
          </h1>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
            }}
            className="text-sm text-gray-600 hover:underline"
          >
            Logout
          </button>
        </div>

        {/* Formular */}
        <div className="bg-white p-6 rounded-xl border shadow-sm mb-8">
          <input
            type="text"
            placeholder="Name"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            className="w-full border p-2 rounded mb-3"
          />

          <input
            type="number"
            placeholder="Betrag in €"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border p-2 rounded mb-3"
          />

          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as "toMe" | "iOwe")
            }
            className="w-full border p-2 rounded mb-3"
          >
            <option value="toMe">Andere schulden mir</option>
            <option value="iOwe">Ich schulde anderen</option>
          </select>

          <button
            onClick={addEntry}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          >
            Hinzufügen
          </button>
        </div>

        {/* Übersicht */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <p className="text-gray-600 mb-2">Ich bekomme</p>
            <p className="text-2xl font-bold text-green-700">
              {toMeTotal} €
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <p className="text-gray-600 mb-2">Ich schulde</p>
            <p className="text-2xl font-bold text-red-700">
              {iOweTotal} €
            </p>
          </div>
        </div>

        {/* Liste */}
        <div className="bg-white rounded-xl shadow border">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="p-5 border-b last:border-none"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-lg">
                    {entry.person}
                  </div>
                  <div className="text-sm text-gray-500">
                    {entry.type === "toMe"
                      ? "Schuldet mir"
                      : "Ich schulde"}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold">
                    {entry.amount - entry.paid_amount} €
                  </div>

                  {entry.status === "paid" && (
                    <div className="text-green-600 text-sm font-medium">
                      Bezahlt
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-3 text-sm">
                {entry.status !== "paid" && (
                  <>
                    <button
                      onClick={() =>
                        markAsPaid(entry)
                      }
                      className="text-green-600 hover:underline"
                    >
                      Als bezahlt markieren
                    </button>

                    <input
                      type="number"
                      placeholder="Teilzahlung"
                      className="border rounded px-2 py-1 w-28"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const value = Number(
                            (
                              e.target as HTMLInputElement
                            ).value
                          );
                          if (value > 0) {
                            addPayment(
                              entry,
                              value
                            );
                            (
                              e.target as HTMLInputElement
                            ).value = "";
                          }
                        }
                      }}
                    />
                  </>
                )}

                <button
                  onClick={() =>
                    deleteEntry(entry.id)
                  }
                  className="text-red-600 hover:underline"
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

// 🔐 Login Component
function Login({ onLogin }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (!error && data.user) {
      onLogin(data.user);
    } else {
      alert("Login fehlgeschlagen");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border shadow-sm p-8 rounded-xl w-80">
        <h2 className="text-xl font-bold mb-6 text-center text-gray-700">
          Login
        </h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 rounded mb-3 text-black"
        />

        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 rounded mb-4 text-black"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 "
        >
          Einloggen
        </button>
      </div>
    </div>
  );
}
