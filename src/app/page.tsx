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

  // 🔐 Auth Listener (wichtig für Logout!)
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

  // 📊 Restbetrag
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

  if (!user) return <Login onLogin={setUser} />;

  return (
    <main className="min-h-screen bg-gray-100 p-6 text-black">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex justify-between mb-8">
          <h1 className="text-2xl font-bold text-black">
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
            className="w-full border p-2 rounded mb-3 text-black"
          />

          <input
            type="number"
            placeholder="Betrag in €"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border p-2 rounded mb-3 text-black"
          />

          <input
            type="text"
            placeholder="Vermerk (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border p-2 rounded mb-3 text-black"
          />

          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as "toMe" | "iOwe")
            }
            className="w-full border p-2 rounded mb-3 text-black"
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
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-600 font-medium">
              Forderungen
            </p>
            <p className="text-2xl font-bold text-green-700">
              {toMeTotal} €
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-600 font-medium">
              Verbindlichkeiten
            </p>
            <p className="text-2xl font-bold text-red-700">
              {iOweTotal} €
            </p>
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
                    <div className="font-semibold text-lg text-black">
                      {entry.person}
                    </div>

                    {entry.note && (
                      <div className="text-sm text-gray-500 italic">
                        Vermerk: {entry.note}
                      </div>
                    )}
                  </div>

                  <div className="text-right font-bold text-black">
                    {remaining} €
                  </div>
                </div>

                {/* Zahlungen */}
                {entry.payments?.map((p) => (
                  <div
                    key={p.id}
                    className="text-sm text-gray-600 mt-1"
                  >
                    ✔ Erfolgte Zahlung von {p.amount} € am{" "}
                    {new Date(
                      p.payment_date
                    ).toLocaleDateString("de-DE")}
                  </div>
                ))}

                {/* Neue Zahlung */}
                <div className="flex gap-2 mt-3">
                  <input
                    type="number"
                    placeholder="Betrag"
                    className="border rounded px-2 py-1 w-24 text-black"
                    id={`amount-${entry.id}`}
                  />
                  <input
                    type="date"
                    className="border rounded px-2 py-1 text-black"
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

// 🔐 Login mit deutlich sichtbarem Text
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
      <div className="bg-white p-8 rounded-2xl shadow w-80">
        <h2 className="text-2xl font-bold mb-6 text-center text-black">
          Login
        </h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 rounded mb-4 text-black"
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
          className="w-full bg-blue-600 text-white p-2 rounded font-medium"
        >
          Einloggen
        </button>
      </div>
    </div>
  );
}