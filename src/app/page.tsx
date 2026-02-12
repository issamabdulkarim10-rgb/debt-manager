"use client";

import { useState, useEffect } from "react";

type Entry = {
  person: string;
  amount: number;
  type: "toMe" | "iOwe";
};

export default function Home() {
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"toMe" | "iOwe">("toMe");
  const [entries, setEntries] = useState<Entry[]>([]);

  // 🔹 Beim Laden Daten aus localStorage holen
  useEffect(() => {
    const saved = localStorage.getItem("entries");
    if (saved) {
      setEntries(JSON.parse(saved));
    }
  }, []);

  // 🔹 Bei Änderung speichern
  useEffect(() => {
    localStorage.setItem("entries", JSON.stringify(entries));
  }, [entries]);

  const addEntry = () => {
    if (!person || !amount) return;

    const newEntry: Entry = {
      person,
      amount: Number(amount),
      type,
    };

    setEntries([...entries, newEntry]);
    setPerson("");
    setAmount("");
  };

  const deleteEntry = (index: number) => {
  const updated = entries.filter((_, i) => i !== index);
  setEntries(updated);
};

  const toMeTotal = entries
    .filter((e) => e.type === "toMe")
    .reduce((sum, e) => sum + e.amount, 0);

  const iOweTotal = entries
    .filter((e) => e.type === "iOwe")
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <main className="min-h-screen bg-gray-100 p-6 text-black">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Schulden-Manager
        </h1>

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
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          >
            Hinzufügen
          </button>
        </div>

        {/* Übersicht */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-100 p-4 rounded-xl text-center">
            <p className="text-sm text-gray-600">
              Andere schulden mir
            </p>
            <p className="text-xl font-bold text-green-700">
              {toMeTotal} €
            </p>
          </div>

          <div className="bg-red-100 p-4 rounded-xl text-center">
            <p className="text-sm text-gray-600">
              Ich schulde anderen
            </p>
            <p className="text-xl font-bold text-red-700">
              {iOweTotal} €
            </p>
          </div>
        </div>

        {/* Liste */}
        <div className="bg-white p-6 rounded-xl shadow">
          {entries.length === 0 ? (
            <p className="text-gray-500">
              Noch keine Einträge.
            </p>
          ) : (
            entries.map((entry, index) => (
  <div
    key={index}
    className="flex justify-between items-center border-b py-2"
  >
    <span>
      {entry.person} (
      {entry.type === "toMe"
        ? "schuldet mir"
        : "ich schulde"})
    </span>

    <div className="flex items-center gap-3">
      <span>{entry.amount} €</span>

      <button
        onClick={() => deleteEntry(index)}
        className="text-red-600 hover:text-red-800 text-sm"
      >
        Löschen
      </button>
    </div>
  </div>
))

          )}
        </div>
      </div>
    </main>
  );
}
