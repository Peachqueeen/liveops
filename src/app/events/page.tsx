"use client";

import { useEffect, useState } from "react";

interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  frequency: string;
  icon: string;
  sortOrder: number;
}

const FREQ_OPTIONS = ["daily", "weekly", "monthly", "once"];
const FREQ_LABEL: Record<string, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", once: "Once per season" };

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", frequency: "daily", icon: "🎁", sortOrder: "0" });

  useEffect(() => {
    fetch("/api/events").then((r) => r.json()).then(setEvents).finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditId(null);
    setForm({ name: "", slug: "", description: "", frequency: "daily", icon: "🎁", sortOrder: String(events.length) });
    setShowForm(true);
  }

  function openEdit(e: Event) {
    setEditId(e.id);
    setForm({ name: e.name, slug: e.slug, description: e.description ?? "", frequency: e.frequency, icon: e.icon, sortOrder: String(e.sortOrder) });
    setShowForm(true);
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    const body = { ...form, sortOrder: parseInt(form.sortOrder) };
    if (editId) {
      const res = await fetch(`/api/events/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) setEvents((prev) => prev.map((e) => e.id === editId ? { ...e, ...body } : e));
    } else {
      const res = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { const created = await res.json(); setEvents((prev) => [...prev, created]); }
    }
    setShowForm(false);
  }

  async function remove(id: string) {
    if (!confirm("Delete this event? It will be removed from all seasons.")) return;
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Events</h1>
        <button onClick={openCreate} className="px-3 py-1.5 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600">
          + New Event
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} style={{ background: "var(--surface)", border: "1px solid var(--border)" }} className="rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-200">{editId ? "Edit Event" : "New Event"}</h2>
          <div className="grid grid-cols-2 gap-4">
            <Inp label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
            <Inp label="Slug (url-safe id)" value={form.slug} onChange={(v) => setForm((f) => ({ ...f, slug: v }))} required />
            <Inp label="Icon (emoji)" value={form.icon} onChange={(v) => setForm((f) => ({ ...f, icon: v }))} />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Frequency</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                className="rounded-lg px-3 py-2 text-sm text-gray-100 outline-none"
              >
                {FREQ_OPTIONS.map((o) => <option key={o} value={o}>{FREQ_LABEL[o]}</option>)}
              </select>
            </div>
            <Inp label="Sort order" type="number" value={form.sortOrder} onChange={(v) => setForm((f) => ({ ...f, sortOrder: v }))} />
          </div>
          <Inp label="Description (optional)" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg bg-white/5 text-gray-300">Cancel</button>
          </div>
        </form>
      )}

      {loading ? <p className="text-gray-500">Loading…</p> : (
        <div className="grid gap-3">
          {events.map((e) => (
            <div key={e.id} style={{ background: "var(--surface)", border: "1px solid var(--border)" }} className="rounded-xl p-4 flex items-center gap-4">
              <span className="text-2xl">{e.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-100">{e.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">{FREQ_LABEL[e.frequency]}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{e.description ?? "No description"}</p>
                <p className="text-xs text-gray-600 font-mono mt-0.5">{e.slug}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(e)} className="text-xs px-3 py-1.5 rounded bg-white/5 text-gray-300 hover:bg-white/10">Edit</button>
                <button onClick={() => remove(e.id)} className="text-xs px-3 py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">Delete</button>
              </div>
            </div>
          ))}
          {events.length === 0 && <p className="text-gray-500 text-sm">No events yet.</p>}
        </div>
      )}
    </div>
  );
}

function Inp({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
        className="rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-orange-500/60" />
    </div>
  );
}
