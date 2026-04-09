"use client";

import { useEffect, useState } from "react";

interface AssetType {
  id: string; name: string; slug: string; icon: string;
  description?: string | null; color: string; isPremium: boolean; valueWeight: number; sortOrder: number;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", slug: "", icon: "🎁", description: "",
    color: "#6366f1", isPremium: false, valueWeight: "1", sortOrder: "0",
  });

  useEffect(() => {
    fetch("/api/assets").then((r) => r.json()).then(setAssets).finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditId(null);
    setForm({ name: "", slug: "", icon: "🎁", description: "", color: "#6366f1", isPremium: false, valueWeight: "1", sortOrder: String(assets.length) });
    setShowForm(true);
  }

  function openEdit(a: AssetType) {
    setEditId(a.id);
    setForm({ name: a.name, slug: a.slug, icon: a.icon, description: a.description ?? "", color: a.color, isPremium: a.isPremium, valueWeight: String(a.valueWeight), sortOrder: String(a.sortOrder) });
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...form, valueWeight: parseFloat(form.valueWeight), sortOrder: parseInt(form.sortOrder) };
    if (editId) {
      const res = await fetch(`/api/assets/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) setAssets((prev) => prev.map((a) => a.id === editId ? { ...a, ...body } : a));
    } else {
      const res = await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { const created = await res.json(); setAssets((prev) => [...prev, created]); }
    }
    setShowForm(false);
  }

  async function remove(id: string) {
    if (!confirm("Delete this asset type? It will be removed from all reward tables.")) return;
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Asset Types</h1>
          <p className="text-sm text-gray-400 mt-0.5">Define currencies and items players earn as rewards.</p>
        </div>
        <button onClick={openCreate} className="px-3 py-1.5 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600">
          + New Asset
        </button>
      </div>

      {/* Value weight explainer */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)" }} className="rounded-xl p-4 text-xs text-gray-400 leading-relaxed">
        <span className="font-semibold text-gray-300">Value Weight</span> controls how the recommendation engine weighs each asset in the economy calculation.
        Set <span className="text-orange-400">isPremium = true</span> for assets linked to real money (Gems) so the engine can separate free from paid economy.
      </div>

      {showForm && (
        <form onSubmit={save} style={{ background: "var(--surface)", border: "1px solid var(--border)" }} className="rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-200">{editId ? "Edit Asset" : "New Asset"}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Inp label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
            <Inp label="Slug" value={form.slug} onChange={(v) => setForm((f) => ({ ...f, slug: v }))} required />
            <Inp label="Icon (emoji)" value={form.icon} onChange={(v) => setForm((f) => ({ ...f, icon: v }))} />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Color</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="w-10 h-9 rounded cursor-pointer bg-transparent border-0" />
                <span className="text-xs text-gray-500 font-mono">{form.color}</span>
              </div>
            </div>
            <Inp label="Value Weight" type="number" step="0.1" value={form.valueWeight} onChange={(v) => setForm((f) => ({ ...f, valueWeight: v }))} />
            <Inp label="Sort Order" type="number" value={form.sortOrder} onChange={(v) => setForm((f) => ({ ...f, sortOrder: v }))} />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isPremium" checked={form.isPremium} onChange={(e) => setForm((f) => ({ ...f, isPremium: e.target.checked }))} className="w-4 h-4 accent-orange-500" />
            <label htmlFor="isPremium" className="text-sm text-gray-300">Premium currency (linked to real-money purchases)</label>
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
          {assets.map((a) => (
            <div key={a.id} style={{ background: "var(--surface)", border: `1px solid ${a.color}40` }} className="rounded-xl p-4 flex items-center gap-4">
              <span className="text-3xl">{a.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium" style={{ color: a.color }}>{a.name}</span>
                  {a.isPremium && <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400">PREMIUM</span>}
                  <span className="text-xs text-gray-500">weight: {a.valueWeight}×</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{a.description ?? "No description"}</p>
                <p className="text-xs text-gray-600 font-mono">{a.slug}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(a)} className="text-xs px-3 py-1.5 rounded bg-white/5 text-gray-300 hover:bg-white/10">Edit</button>
                <button onClick={() => remove(a.id)} className="text-xs px-3 py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">Delete</button>
              </div>
            </div>
          ))}
          {assets.length === 0 && <p className="text-gray-500 text-sm">No assets yet.</p>}
        </div>
      )}
    </div>
  );
}

function Inp({ label, value, onChange, type = "text", step, required }: { label: string; value: string; onChange: (v: string) => void; type?: string; step?: string; required?: boolean; }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      <input type={type} step={step} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
        className="rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-orange-500/60" />
    </div>
  );
}
