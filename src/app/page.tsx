"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

type Payment = {
  id: string;
  entry_id: string;
  amount: number;
  payment_date: string;
};

type Entry = {
  id: string;
  person: string;
  amount: number;
  type: "toMe" | "iOwe";
  note: string | null;
  user_id: string;
  created_at: string;
  payments?: Payment[];
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState<"toMe" | "iOwe">("toMe");

  // 🔐 Session prüfen
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    };
    getSession();
  }, []);

  // 📥 Einträge laden
  const fetchEntries = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("entries")
      .select(`*, payments(*)`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setEntries(data || []);
  };

  useEffect(() => {
    if (user) fetchEntries();
  }, [user]);

  // ➕ Neue Schuld
  const addEntry = async () => {
    if (!person || !amount || !user) return;

    await supabase.from("entries").insert([
      {
        person,
        amount: Number(amount),
        type,
        note: note || null,
        user_id: user.id,
      },
    ]);

    fetchEntries();
    setPerson("");
    setAmount("");
    setNote("");
  };

  // 💰 Zahlung hinzufügen
  const addPayment = async (
    entry: Entry,
    paymentAmount: number,
    date: string
  ) => {
    if (!user) return;

    await supabase.from("payments").insert([
      {
        entry_id: entry.id,
        amount: paymentAmount,
        payment_date: date,
        user_id: user.id,
      },
    ]);

    fetchEntries();
  };

  // ❌ Löschen
  const deleteEntry = async (id: string) => {
    await supabase.from("entries").delete().eq("id", id);
    fetchEntries();
  };

  // 📊 Restbetrag berechnen
  const getRemaining = (entry: Entry) => {
    const totalPaid =
      entry.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

    return entry.amount - totalPaid;
  };

  const toMeTotal = entries
    .filter((e) => e.type === "toMe")
    .reduce((sum, e) => sum + getRemaining(e), 0);

  const iOweTotal = entries
    .filter((e) => e.type === "iOwe")
    .reduce((sum, e) => sum + getRemaining(e), 0);

  const saldo = toMeTotal - iOweTotal;

  if (!user) return <Login onLogin={setUser} />;

  return (
    <main className="min-h-screen bg-gray-100 p-6 text-black">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex justify-between mb-8">
          <h1 className="text-2xl font-bold">
            Schulden Manager
          </h1>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-gray-600 hover:underline"
          >
            Logout
          </button>
        </div>

        {/* Formular */}
        <div className="bg-white p-6 rounded-xl shadow mb-8">
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

          <input
            type="text"
            placeholder="Vermerk (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
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

        {/* 🔥 Saldo Box */}
        <div className="bg-white p-8 rounded-2xl shadow mb-8 text-center">
          <p className="text-gray-500 text-sm uppercase tracking-wide">
            Saldo
          </p>

          <p
            className={`text-4xl font-bold mt-2 ${
              saldo >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {saldo >= 0 ? "+" : ""}
            {saldo} €
          </p>

          <div className="mt-4 text-sm text-gray-500">
            <span className="text-green-600 font-medium">
              {toMeTotal} € offen
            </span>
            {" · "}
            <span className="text-red-600 font-medium">
              {iOweTotal} € schulde ich
            </span>
          </div>
        </div>

        {/* Liste */}
        <div className="bg-white rounded-xl shadow">
          {entries.map((entry) => {
            const remaining = getRemaining(entry);

            return (
              <div key={entry.id} className="p-5 border-b">
                <div className="flex justify-between">
                  <div>
                    <div className="font-semibold text-lg">
                      {entry.person}
                    </div>

                    {entry.note && (
                      <div className="text-sm text-gray-500 italic">
                        Vermerk: {entry.note}
                      </div>
                    )}

                    <div
                      className={`text-xs font-medium inline-block px-2 py-1 rounded-full mt-1 ${
                        entry.type === "toMe"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {entry.type === "toMe"
                        ? "Schuldet mir"
                        : "Ich schulde"}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {remaining} €
                    </div>
                  </div>
                </div>

                {/* Zahlungen */}
                {entry.payments &&
                  entry.payments.length > 0 && (
                    <div className="mt-3 text-sm text-gray-600 space-y-1">
                      {entry.payments.map((p) => (
                        <div key={p.id}>
                          ✔ Erfolgte Zahlung von{" "}
                          <span className="font-medium">
                            {p.amount} €
                          </span>{" "}
                          am{" "}
                          {new Date(
                            p.payment_date
                          ).toLocaleDateString("de-DE")}
                        </div>
                      ))}
                    </div>
                  )}

                {/* Neue Zahlung */}
                <div className="flex gap-2 mt-3">
                  <input
                    type="number"
                    placeholder="Betrag"
                    className="border rounded px-2 py-1 w-24"
                    id={`amount-${entry.id}`}
                  />
                  <input
                    type="date"
                    className="border rounded px-2 py-1"
                    id={`date-${entry.id}`}
                  />
                  <button
                    onClick={() => {
                      const amount = Number(
                        (
                          document.getElementById(
                            `amount-${entry.id}`
                          ) as HTMLInputElement
                        ).value
                      );
                      const date = (
                        document.getElementById(
                          `date-${entry.id}`
                        ) as HTMLInputElement
                      ).value;

                      if (amount > 0 && date) {
                        addPayment(entry, amount, date);
                      }
                    }}
                    className="text-blue-600"
                  >
                    Zahlung speichern
                  </button>

                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="text-red-600"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            );
          })}
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
          className="w-full border p-2 rounded mb-3"
        />

        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 rounded mb-3"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white p-2 rounded"
        >
          Einloggen
        </button>
      </div>
    </div>
  );
}