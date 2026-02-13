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
  created_at: string;
};

export default function Home() {
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"toMe" | "iOwe">("toMe");
  const [entries, setEntries] = useState<Entry[]>([]);

  // 🔹 Daten laden
  useEffect(() => {
    const fetchEntries = async () => {
      const { data, error } = await supabase
        .from("entries")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setEntries(data as Entry[]);
      }
    };

    fetchEntries();
  }, []);

  // 🔹 Neuer Eintrag
  const addEntry = async () => {
    if (!person || !amount) return;

    const { data, error } = await supabase
      .from("entries")
      .insert([
        {
          person,
          amount: Number(amount),
          paid_amount: 0,
          status: "open",
          type,
        },
      ])
      .select();

    if (!error && data) {
      setEntries([data[0] as Entry, ...entries]);
    }

    setPerson("");
    setAmount("");
  };

  // 🔹 Löschen
  const deleteEntry = async (id: string) => {
    const { error } = await supabase
      .from("entries")
      .delete()
      .eq("id", id);

    if (!error) {
      setEntries(entries.filter((e) => e.id !== id));
    }
  };

  // 🔹 Als bezahlt markieren
  const markAsPaid = async (entry: Entry) => {
    const { error } = await supabase
      .from("entries")
      .update({
        paid_amount: entry.amount,
        status: "paid",
      })
      .eq("id", entry.id);

    if (!error) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, paid_amount: e.amount, status: "paid" }
            : e
        )
      );
    }
  };

  // 🔹 Teilzahlung
  const addPayment = async (entry: Entry, payment: number) => {
    const newPaidAmount = entry.paid_amount + payment;
    const newStatus =
      newPaidAmount >= entry.amount ? "paid" : "open";

    const { error } = await supabase
      .from("entries")
      .update({
        paid_amount: newPaidAmount,
        status: newStatus,
      })
      .eq("id", entry.id);

    if (!error) {
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
    }
  };

  // 🔹 Summen
  const toMeTotal = entries
    .filter((e) => e.type === "toMe")
    .reduce((sum, e) => sum + (e.amount - e.paid_amount), 0);

  const iOweTotal = entries
    .filter((e) => e.type === "iOwe")
    .reduce((sum, e) => sum + (e.amount - e.paid_amount), 0);

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
            entries.map((entry) => (
              <div
                key={entry.id}
                className="border-b py-3"
              >
                <div className="flex justify-between items-center">
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

                {/* Aktionen */}
                <div className="flex gap-3 mt-2 flex-wrap">
                  {entry.status !== "paid" && (
                    <button
                      onClick={() =>
                        markAsPaid(entry)
                      }
                      className="text-green-600 text-sm"
                    >
                      Als bezahlt markieren
                    </button>
                  )}

                  <button
                    onClick={() =>
                      deleteEntry(entry.id)
                    }
                    className="text-red-600 text-sm"
                  >
                    Löschen
                  </button>

                  {entry.status !== "paid" && (
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
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

