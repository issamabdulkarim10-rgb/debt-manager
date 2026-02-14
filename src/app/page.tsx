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

  // 📥 Daten laden
  useEffect(() => {
  fetchEntries();
}, []);


    const fetchEntries = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!error) setEntries(data || []);
};


  // ➕ Eintrag hinzufügen
const addEntry = async () => {
  if (!person || !amount) return;

  // 🔐 Aktuell eingeloggten User holen
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert("Nicht eingeloggt!");
    return;
  }

  // 📦 In Supabase speichern
  const { error } = await supabase.from("entries").insert([
    {
      person,
      amount: Number(amount),
      type,
      user_id: user.id, // 🔥 WICHTIG
    },
  ]);

  if (error) {
    console.error("Insert error:", error);
    return;
  }

  // 🔄 Danach neu laden
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

    setEntries((prev) =>
      prev.map((e) =>
        e.id === entry.id
          ? { ...e, paid_amount: e.amount, status: "paid" }
          : e
      )
    );
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

    setEntries((prev) =>
      prev.map((e) =>
        e.id === entry.id
          ? {
              ...e,
              paid_amount: newPaidAmount,
              status: newStatus,
            }
          : e
      )
    );
  };

  // 📊 Summen
  const toMeTotal = entries
    .filter((e) => e.type === "toMe")
    .reduce((sum, e) => sum + (e.amount - e.paid_amount), 0);

  const iOweTotal = entries
    .filter((e) => e.type === "iOwe")
    .reduce((sum, e) => sum + (e.amount - e.paid_amount), 0);

  // 🔒 Wenn nicht eingeloggt → Login anzeigen
  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 text-black">
      <div className="max-w-2xl mx-auto">

        <div className="flex justify-between mb-4">
          <h1 className="text-2xl font-bold">Schulden-Manager</h1>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
            }}
            className="text-sm text-gray-600"
          >
            Logout
          </button>
        </div>

        {/* Formular */}
        <div className="bg-white p-6 rounded-xl shadow mb-6">
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
            className="w-full bg-blue-600 text-white p-2 rounded"
          >
            Hinzufügen
          </button>
        </div>

        {/* Übersicht */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-100 p-4 rounded-xl text-center">
            <p>ich bekomme</p>
            <p className="font-bold text-green-700">
              {toMeTotal} €
            </p>
          </div>

          <div className="bg-red-100 p-4 rounded-xl text-center">
            <p>Ich schulde</p>
            <p className="font-bold text-red-700">
              {iOweTotal} €
            </p>
          </div>
        </div>

        {/* Liste */}
        <div className="bg-white p-6 rounded-xl shadow">
          {entries.map((entry) => (
            <div key={entry.id} className="border-b py-3">
              <div className="flex justify-between">
                <span>
                  {entry.person} (
                  {entry.type === "toMe"
                    ? "schuldet mir"
                    : "ich schulde"}
                  )
                </span>

                <div className="text-right">
                  <div>
                    {entry.amount - entry.paid_amount} € offen
                  </div>
                  {entry.status === "paid" && (
                    <div className="text-green-600 text-sm">
                      Bezahlt ✅
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-2 flex-wrap">
                {entry.status !== "paid" && (
                  <>
                    <button
                      onClick={() => markAsPaid(entry)}
                      className="text-green-600 text-sm"
                    >
                      Als bezahlt markieren
                    </button>

                    <input
                      type="number"
                      placeholder="Teilzahlung"
                      className="border p-1 text-sm w-28"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const value = Number(
                            (
                              e.target as HTMLInputElement
                            ).value
                          );
                          if (value > 0) {
                            addPayment(entry, value);
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
                  onClick={() => deleteEntry(entry.id)}
                  className="text-red-600 text-sm"
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-xl shadow w-80">
        <h2 className="text-xl font-bold mb-4 text-center">
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
          className="w-full border p-2 rounded mb-3 text-black"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-black p-2 rounded"
        >
          Einloggen
        </button>
      </div>
    </div>
  );
}
