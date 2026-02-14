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
    <main className="min-h-screen bg-white text-gray-900 p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">
            Debt Manager
          </h1>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
            }}
            className="text-sm text-gray-400 hover:text-black transition"
          >
            Logout
          </button>
        </div>

        {/* Formular */}
        <div className="border border-gray-200 p-6 rounded-2xl mb-8">
          <input
            type="text"
            placeholder="Name"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            className="w-full border border-gray-300 p-3 rounded-lg mb-4 focus:outline-none focus:border-black"
          />

          <input
            type="number"
            placeholder="Betrag in €"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-300 p-3 rounded-lg mb-4 focus:outline-none focus:border-black"
          />

          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as "toMe" | "iOwe")
            }
            className="w-full border border-gray-300 p-3 rounded-lg mb-4 focus:outline-none focus:border-black"
          >
            <option value="toMe">Forderung</option>
            <option value="iOwe">Verbindlichkeit</option>
          </select>

          <button
            onClick={addEntry}
            className="w-full bg-black text-white p-3 rounded-lg hover:bg-gray-800 transition"
          >
            Hinzufügen
          </button>
        </div>

        {/* Übersicht */}
        <div className="grid grid-cols-2 gap-6 mb-10">
          <div className="border border-gray-200 p-6 rounded-2xl">
            <p className="text-sm text-gray-500 mb-1">Forderungen</p>
            <p className="text-2xl font-semibold text-green-600">
              {toMeTotal} €
            </p>
          </div>

          <div className="border border-gray-200 p-6 rounded-2xl">
            <p className="text-sm text-gray-500 mb-1">
              Verbindlichkeiten
            </p>
            <p className="text-2xl font-semibold text-red-600">
              {iOweTotal} €
            </p>
          </div>
        </div>

        {/* Liste */}
        <div className="border border-gray-200 rounded-2xl divide-y divide-gray-100">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="p-5 flex justify-between items-center"
            >
              <div>
                <div className="font-medium">
                  {entry.person}
                </div>
                <div className="text-sm text-gray-400">
                  {entry.type === "toMe"
                    ? "Forderung"
                    : "Verbindlichkeit"}
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-medium">
                  {entry.amount - entry.paid_amount} €
                </div>

                {entry.status === "paid" && (
                  <div className="text-sm text-green-600">
                    Bezahlt
                  </div>
                )}

                <div className="flex gap-3 mt-2 justify-end text-sm">
                  {entry.status !== "paid" && (
                    <>
                      <button
                        onClick={() =>
                          markAsPaid(entry)
                        }
                        className="text-gray-400 hover:text-black transition"
                      >
                        Bezahlt
                      </button>

                      <input
                        type="number"
                        placeholder="+ Zahlung"
                        className="border border-gray-300 rounded px-2 py-1 w-24 focus:outline-none focus:border-black"
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
                    className="text-gray-400 hover:text-red-600 transition"
                  >
                    Löschen
                  </button>
                </div>
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
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="border border-gray-200 p-8 rounded-2xl w-80">
        <h2 className="text-xl font-semibold mb-6 text-center">
          Login
        </h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded-lg mb-4 focus:outline-none focus:border-black"
        />

        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded-lg mb-4 focus:outline-none focus:border-black"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-black text-white p-3 rounded-lg hover:bg-gray-800 transition"
        >
          Einloggen
        </button>
      </div>
    </div>
  );
}
