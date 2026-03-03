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
  const [dark, setDark] = useState(false);

  // 🌙 Theme laden
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  const toggleTheme = () => {
    if (dark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
    setDark(!dark);
  };

  // 🔐 Session prüfen
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    };
    getSession();
  }, []);

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

  const deleteEntry = async (id: string) => {
    await supabase.from("entries").delete().eq("id", id);
    fetchEntries();
  };

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
    <main className="min-h-screen bg-gray-100 dark:bg-gray-900 text-black dark:text-white p-6 transition-colors">
      <div className="max-w-3xl mx-auto">

        <div className="flex justify-between mb-8">
          <h1 className="text-2xl font-bold">
            Schulden Manager
          </h1>

          <div className="flex gap-4 items-center">
            <button
              onClick={toggleTheme}
              className="text-sm px-3 py-1 border rounded"
            >
              {dark ? "☀ Light" : "🌙 Dark"}
            </button>

            <button
              onClick={() => supabase.auth.signOut()}
              className="text-sm opacity-70 hover:opacity-100"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Formular */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow mb-8 transition-colors">
          <input
            type="text"
            placeholder="Name"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            className="w-full border dark:border-gray-600 bg-white dark:bg-gray-700 p-2 rounded mb-3"
          />

          <input
            type="number"
            placeholder="Betrag in €"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border dark:border-gray-600 bg-white dark:bg-gray-700 p-2 rounded mb-3"
          />

          <input
            type="text"
            placeholder="Vermerk (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border dark:border-gray-600 bg-white dark:bg-gray-700 p-2 rounded mb-3"
          />

          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as "toMe" | "iOwe")
            }
            className="w-full border dark:border-gray-600 bg-white dark:bg-gray-700 p-2 rounded mb-3"
          >
            <option value="toMe">Andere schulden mir</option>
            <option value="iOwe">Ich schulde anderen</option>
          </select>

          <button
            onClick={addEntry}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded"
          >
            Hinzufügen
          </button>
        </div>

        {/* Übersicht */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
            <p>Ich bekomme</p>
            <p className="text-2xl font-bold text-green-500">
              {toMeTotal} €
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
            <p>Ich schulde</p>
            <p className="text-2xl font-bold text-red-500">
              {iOweTotal} €
            </p>
          </div>
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow w-80">
        <h2 className="text-xl font-bold mb-6 text-center">
          Login
        </h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border dark:border-gray-600 bg-white dark:bg-gray-700 p-2 rounded mb-3"
        />

        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border dark:border-gray-600 bg-white dark:bg-gray-700 p-2 rounded mb-4"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded"
        >
          Einloggen
        </button>
      </div>
    </div>
  );
}