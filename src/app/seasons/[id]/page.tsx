"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface AssetType { id: string; name: string; icon: string; slug: string; isPremium: boolean; valueWeight: number; color: string; }
interface Reward { assetTypeId: string; assetType: AssetType; minAmount: number; maxAmount: number; probability: number; tier?: string | null; notes?: string | null; }
interface SeasonEvent { id: string; eventId: string; isActive: boolean; sortOrder: number; notes?: string | null; event: { id: string; name: string; slug: string; icon: string; frequency: string; description?: string | null; }; rewards: Reward[]; }
interface Metric { id: string; date: string; retentionD1?: number | null; retentionD7?: number | null; retentionD30?: number | null; dau?: number | null; avgSessionMin?: number | null; arpu?: number | null; conversionRate?: number | null; source: string; notes?: string | null; }
interface Season { id: string; name: string; number: number; description?: string | null; startDate: string; endDate: string; isActive: boolean; seasonEvents: SeasonEvent[]; metrics: Metric[]; }
interface Event { id: string; name: string; slug: string; icon: string; frequency: string; }

type Tab = "events" | "metrics";

export default function SeasonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [season, setSeason] = useState<Season | null>(null);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [allAssets, setAllAssets] = useState<AssetType[]>([]);
  const [tab, setTab] = useState<Tab>("events");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/seasons/${id}`).then((r) => r.json()),
      fetch("/api/events").then((r) => r.json()),
      fetch("/api/assets").then((r) => r.json()),
    ]).then(([s, e, a]) => {
      setSeason(s);
      setAllEvents(e);
      setAllAssets(a);
    }).finally(() => setLoading(false));
  }, [id]);

  async function addEvent(eventId: string) {
    const res = await fetch(`/api/seasons/${id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    });
    if (res.ok) {
      const se = await res.json();
      const event = allEvents.find((e) => e.id === eventId)!;
      setSeason((s) => s ? { ...s, seasonEvents: [...s.seasonEvents, { ...se, event, rewards: [] }] } : s);
    }
  }

  async function removeEvent(eventId: string) {
    await fetch(`/api/seasons/${id}/events`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    });
    setSeason((s) => s ? { ...s, seasonEvents: s.seasonEvents.filter((se) => se.eventId !== eventId) } : s);
  }

  async function upsertReward(seasonEventId: string, assetTypeId: string, data: Partial<Reward>) {
    const res = await fetch(`/api/seasons/${id}/rewards`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonEventId, assetTypeId, ...data }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSeason((s) => {
        if (!s) return s;
        return {
          ...s,
          seasonEvents: s.seasonEvents.map((se) => {
            if (se.id !== seasonEventId) return se;
            const existing = se.rewards.findIndex((r) => r.assetTypeId === assetTypeId);
            const rewards = [...se.rewards];
            if (existing >= 0) rewards[existing] = updated;
            else rewards.push(updated);
            return { ...se, rewards };
          }),
        };
      });
    }
  }

  async function deleteReward(seasonEventId: string, assetTypeId: string) {
    await fetch(`/api/seasons/${id}/rewards`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonEventId, assetTypeId }),
    });
    setSeason((s) => {
      if (!s) return s;
      return {
        ...s,
        seasonEvents: s.seasonEvents.map((se) => {
          if (se.id !== seasonEventId) return se;
          return { ...se, rewards: se.rewards.filter((r) => r.assetTypeId !== assetTypeId) };
        }),
      };
    });
  }

  if (loading) return <p className="text-gray-500">Loading…</p>;
  if (!season) return <p className="text-red-400">Season not found.</p>;

  const attachedEventIds = new Set(season.seasonEvents.map((se) => se.eventId));
  const availableEvents = allEvents.filter((e) => !attachedEventIds.has(e.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/seasons" className="text-xs text-gray-500 hover:text-gray-300">← Seasons</Link>
          <h1 className="text-2xl font-bold text-gray-100 mt-1">
            S{season.number}: {season.name}
            {season.isActive && (
              <span className="ml-2 text-sm px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">ACTIVE</span>
            )}
          </h1>
          <p className="text-sm text-gray-400">
            {new Date(season.startDate).toLocaleDateString()} – {new Date(season.endDate).toLocaleDateString()}
          </p>
        </div>
        <Link
          href={`/recommendations?seasonId=${season.id}`}
          className="px-3 py-1.5 text-sm rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
        >
          💡 Recommendations
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: "var(--border)" }}>
        {(["events", "metrics"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize -mb-px border-b-2 transition-colors ${
              tab === t ? "border-orange-500 text-orange-400" : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "events" && (
        <div className="space-y-4">
          {/* Add event */}
          {availableEvents.length > 0 && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)" }} className="rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Add event to this season</h3>
              <div className="flex flex-wrap gap-2">
                {availableEvents.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => addEvent(e.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-white/5 text-gray-300 hover:bg-orange-500/20 hover:text-orange-400 transition-colors"
                  >
                    <span>{e.icon}</span> {e.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Event cards */}
          {season.seasonEvents.map((se) => (
            <EventRewardCard
              key={se.id}
              seasonEvent={se}
              allAssets={allAssets}
              onRemoveEvent={() => removeEvent(se.eventId)}
              onUpsertReward={(assetId, data) => upsertReward(se.id, assetId, data)}
              onDeleteReward={(assetId) => deleteReward(se.id, assetId)}
            />
          ))}

          {season.seasonEvents.length === 0 && (
            <p className="text-gray-500 text-sm">No events configured for this season.</p>
          )}
        </div>
      )}

      {tab === "metrics" && (
        <MetricsTab seasonId={season.id} metrics={season.metrics} onAdded={(m) =>
          setSeason((s) => s ? { ...s, metrics: [m, ...s.metrics] } : s)
        } />
      )}
    </div>
  );
}

// ── Event reward card ─────────────────────────────────────────────────────────

function EventRewardCard({
  seasonEvent, allAssets, onRemoveEvent, onUpsertReward, onDeleteReward,
}: {
  seasonEvent: SeasonEvent;
  allAssets: AssetType[];
  onRemoveEvent: () => void;
  onUpsertReward: (assetId: string, data: Partial<Reward>) => void;
  onDeleteReward: (assetId: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null); // assetTypeId being edited
  const [draft, setDraft] = useState<{ min: string; max: string; prob: string; tier: string }>({
    min: "", max: "", prob: "1", tier: "",
  });
  const [showAdd, setShowAdd] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState("");

  const attachedAssetIds = new Set(seasonEvent.rewards.map((r) => r.assetTypeId));
  const availableAssets = allAssets.filter((a) => !attachedAssetIds.has(a.id));

  function startEdit(r: Reward) {
    setEditing(r.assetTypeId);
    setDraft({ min: String(r.minAmount), max: String(r.maxAmount), prob: String(r.probability), tier: r.tier ?? "" });
  }

  function saveEdit(assetId: string) {
    onUpsertReward(assetId, {
      minAmount: parseFloat(draft.min), maxAmount: parseFloat(draft.max),
      probability: parseFloat(draft.prob), tier: draft.tier || null,
    } as Partial<Reward>);
    setEditing(null);
  }

  function addReward() {
    if (!selectedAsset) return;
    onUpsertReward(selectedAsset, {
      minAmount: parseFloat(draft.min) || 1, maxAmount: parseFloat(draft.max) || 1,
      probability: parseFloat(draft.prob) || 1, tier: draft.tier || null,
    } as Partial<Reward>);
    setShowAdd(false);
    setSelectedAsset("");
    setDraft({ min: "", max: "", prob: "1", tier: "" });
  }

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)" }} className="rounded-xl overflow-hidden">
      {/* Event header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{seasonEvent.event.icon}</span>
          <div>
            <span className="font-medium text-gray-100">{seasonEvent.event.name}</span>
            <span className="ml-2 text-xs text-gray-500 capitalize">{seasonEvent.event.frequency}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(true)} className="text-xs px-2 py-1 rounded bg-white/5 text-gray-400 hover:bg-white/10">
            + Reward
          </button>
          <button onClick={onRemoveEvent} className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">
            Remove
          </button>
        </div>
      </div>

      {/* Rewards table */}
      {seasonEvent.rewards.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500" style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="text-left px-4 py-2">Asset</th>
              <th className="text-right px-4 py-2">Min</th>
              <th className="text-right px-4 py-2">Max</th>
              <th className="text-right px-4 py-2">Probability</th>
              <th className="text-left px-4 py-2">Tier</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {seasonEvent.rewards.map((r) => (
              <tr key={r.assetTypeId} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-white/2">
                {editing === r.assetTypeId ? (
                  <>
                    <td className="px-4 py-2">
                      <span style={{ color: r.assetType.color }}>{r.assetType.icon} {r.assetType.name}</span>
                    </td>
                    <td className="px-2 py-1"><input type="number" value={draft.min} onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value }))} className="w-20 bg-white/10 rounded px-2 py-1 text-right text-xs text-gray-100 outline-none" /></td>
                    <td className="px-2 py-1"><input type="number" value={draft.max} onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value }))} className="w-20 bg-white/10 rounded px-2 py-1 text-right text-xs text-gray-100 outline-none" /></td>
                    <td className="px-2 py-1"><input type="number" step="0.01" min="0" max="1" value={draft.prob} onChange={(e) => setDraft((d) => ({ ...d, prob: e.target.value }))} className="w-20 bg-white/10 rounded px-2 py-1 text-right text-xs text-gray-100 outline-none" /></td>
                    <td className="px-2 py-1"><input value={draft.tier} onChange={(e) => setDraft((d) => ({ ...d, tier: e.target.value }))} placeholder="e.g. gold" className="w-20 bg-white/10 rounded px-2 py-1 text-xs text-gray-100 outline-none" /></td>
                    <td className="px-2 py-1 flex gap-1">
                      <button onClick={() => saveEdit(r.assetTypeId)} className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">Save</button>
                      <button onClick={() => setEditing(null)} className="text-xs px-2 py-0.5 rounded bg-white/5 text-gray-400">Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2"><span style={{ color: r.assetType.color }}>{r.assetType.icon} {r.assetType.name}</span></td>
                    <td className="px-4 py-2 text-right text-gray-300">{r.minAmount}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{r.maxAmount}</td>
                    <td className="px-4 py-2 text-right text-gray-400">{(r.probability * 100).toFixed(0)}%</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{r.tier ?? "—"}</td>
                    <td className="px-4 py-2 flex gap-1 justify-end">
                      <button onClick={() => startEdit(r)} className="text-xs px-2 py-0.5 rounded bg-white/5 text-gray-400 hover:bg-white/10">Edit</button>
                      <button onClick={() => onDeleteReward(r.assetTypeId)} className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">✕</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add reward inline form */}
      {showAdd && (
        <div className="px-4 py-3 flex flex-wrap items-end gap-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Asset</label>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
              className="rounded px-2 py-1.5 text-xs text-gray-100 outline-none"
            >
              <option value="">Choose asset…</option>
              {availableAssets.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </select>
          </div>
          {["min", "max"].map((k) => (
            <div key={k} className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 capitalize">{k}</label>
              <input
                type="number"
                value={(draft as Record<string, string>)[k]}
                onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
                className="w-20 rounded px-2 py-1.5 text-xs text-gray-100 outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
              />
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Probability (0–1)</label>
            <input type="number" step="0.01" min="0" max="1" value={draft.prob} onChange={(e) => setDraft((d) => ({ ...d, prob: e.target.value }))} className="w-20 rounded px-2 py-1.5 text-xs text-gray-100 outline-none" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Tier (optional)</label>
            <input value={draft.tier} onChange={(e) => setDraft((d) => ({ ...d, tier: e.target.value }))} placeholder="bronze/silver/gold" className="w-28 rounded px-2 py-1.5 text-xs text-gray-100 outline-none" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
          </div>
          <div className="flex gap-2">
            <button onClick={addReward} className="px-3 py-1.5 text-xs rounded bg-orange-500 text-white hover:bg-orange-600">Add</button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs rounded bg-white/5 text-gray-400">Cancel</button>
          </div>
        </div>
      )}

      {seasonEvent.rewards.length === 0 && !showAdd && (
        <p className="px-4 py-3 text-xs text-gray-600">No rewards configured. Click + Reward to add.</p>
      )}
    </div>
  );
}

// ── Metrics tab ───────────────────────────────────────────────────────────────

function MetricsTab({
  seasonId, metrics, onAdded,
}: {
  seasonId: string; metrics: Metric[]; onAdded: (m: Metric) => void;
}) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    retentionD1: "", retentionD7: "", retentionD30: "",
    dau: "", avgSessionMin: "", arpu: "", conversionRate: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/seasons/${seasonId}/metrics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { onAdded(await res.json()); setForm((f) => ({ ...f, retentionD1: "", retentionD7: "", retentionD30: "", dau: "", avgSessionMin: "", arpu: "", conversionRate: "", notes: "" })); }
    setSaving(false);
  }

  async function syncAmplitude() {
    setSyncing(true);
    const res = await fetch("/api/amplitude/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonId }),
    });
    if (res.ok) { const { metrics: m } = await res.json(); onAdded(m); }
    else { alert("Amplitude sync failed. Check your credentials in Settings."); }
    setSyncing(false);
  }

  return (
    <div className="space-y-6">
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)" }} className="rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-200">Add Metrics Snapshot</h3>
          <button onClick={syncAmplitude} disabled={syncing} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50">
            {syncing ? "Syncing…" : "🔄 Sync Amplitude"}
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: "date", label: "Date", type: "date" },
              { key: "retentionD1", label: "D1 Retention (%)" },
              { key: "retentionD7", label: "D7 Retention (%)" },
              { key: "retentionD30", label: "D30 Retention (%)" },
              { key: "dau", label: "DAU" },
              { key: "avgSessionMin", label: "Avg Session (min)" },
              { key: "arpu", label: "ARPU (€)" },
              { key: "conversionRate", label: "Conversion (%)" },
            ].map(({ key, label, type }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">{label}</label>
                <input
                  type={type ?? "number"}
                  step="any"
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                  className="rounded px-2 py-1.5 text-xs text-gray-100 outline-none focus:border-orange-500/60"
                />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Notes (optional)</label>
            <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} className="rounded px-2 py-1.5 text-xs text-gray-100 outline-none w-full" />
          </div>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50">
            {saving ? "Saving…" : "Save snapshot"}
          </button>
        </form>
      </div>

      {/* Metrics history */}
      {metrics.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)" }} className="rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500" style={{ borderBottom: "1px solid var(--border)" }}>
                {["Date", "D1", "D7", "D30", "DAU", "Session", "ARPU", "Conv.", "Source"].map((h) => (
                  <th key={h} className="text-left px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.id} className="text-gray-300 hover:bg-white/2" style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-3 py-2 text-gray-500">{new Date(m.date).toLocaleDateString()}</td>
                  {[m.retentionD1, m.retentionD7, m.retentionD30].map((v, i) => (
                    <td key={i} className="px-3 py-2">{v != null ? `${v.toFixed(1)}%` : "—"}</td>
                  ))}
                  <td className="px-3 py-2">{m.dau?.toLocaleString() ?? "—"}</td>
                  <td className="px-3 py-2">{m.avgSessionMin != null ? `${m.avgSessionMin.toFixed(1)}m` : "—"}</td>
                  <td className="px-3 py-2">{m.arpu != null ? `€${m.arpu.toFixed(2)}` : "—"}</td>
                  <td className="px-3 py-2">{m.conversionRate != null ? `${m.conversionRate.toFixed(1)}%` : "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${m.source === "amplitude" ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-gray-500"}`}>
                      {m.source}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
