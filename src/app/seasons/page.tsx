"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Season {
  id: string;
  name: string;
  number: number;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  _count: { seasonEvents: number };
  metrics: { retentionD7?: number; arpu?: number }[];
}

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", number: "", description: "", startDate: "", endDate: "",
  });

  useEffect(() => {
    fetch("/api/seasons").then((r) => r.json()).then(setSeasons).finally(() => setLoading(false));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const s = await res.json();
      setSeasons((prev) => [s, ...prev.map((x) => ({ ...x, isActive: false }))]);
      setShowForm(false);
      setForm({ name: "", number: "", description: "", startDate: "", endDate: "" });
    }
  }

  async function activate(id: string) {
    await fetch(`/api/seasons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    setSeasons((prev) => prev.map((s) => ({ ...s, isActive: s.id === id })));
  }

  async function remove(id: string) {
    if (!confirm("Delete this season and all its reward configs?")) return;
    await fetch(`/api/seasons/${id}`, { method: "DELETE" });
    setSeasons((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Seasons</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
        >
          + New Season
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={create}
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          className="rounded-xl p-5 space-y-4"
        >
          <h2 className="font-semibold text-gray-200">New Season</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
            <Input label="Number" type="number" value={form.number} onChange={(v) => setForm((f) => ({ ...f, number: v }))} required />
            <Input label="Start Date" type="date" value={form.startDate} onChange={(v) => setForm((f) => ({ ...f, startDate: v }))} required />
            <Input label="End Date" type="date" value={form.endDate} onChange={(v) => setForm((f) => ({ ...f, endDate: v }))} required />
          </div>
          <Input label="Description (optional)" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600">
              Create
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg bg-white/5 text-gray-300 hover:bg-white/10">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : seasons.length === 0 ? (
        <p className="text-gray-500">No seasons yet.</p>
      ) : (
        <div className="grid gap-4">
          {seasons.map((s) => (
            <div
              key={s.id}
              style={{
                background: "var(--surface)",
                border: `1px solid ${s.isActive ? "#ff7a45" : "var(--border)"}`,
              }}
              className="rounded-xl p-5 flex flex-wrap items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-100">
                    S{s.number}: {s.name}
                  </span>
                  {s.isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()}
                  {" · "}{s._count.seasonEvents} events
                </p>
                {s.description && <p className="text-xs text-gray-500 mt-1">{s.description}</p>}
                {s.metrics[0] && (
                  <div className="flex gap-4 mt-2">
                    {s.metrics[0].retentionD7 != null && (
                      <span className="text-xs text-purple-400">D7: {s.metrics[0].retentionD7.toFixed(1)}%</span>
                    )}
                    {s.metrics[0].arpu != null && (
                      <span className="text-xs text-pink-400">ARPU: €{s.metrics[0].arpu.toFixed(2)}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/seasons/${s.id}`}
                  className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-gray-300 hover:bg-white/10"
                >
                  Configure
                </Link>
                {!s.isActive && (
                  <button
                    onClick={() => activate(s.id)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                  >
                    Activate
                  </button>
                )}
                <button
                  onClick={() => remove(s.id)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Input({
  label, value, onChange, type = "text", required,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
        className="rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-orange-500/60"
      />
    </div>
  );
}
