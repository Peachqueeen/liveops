"use client";

import { useEffect, useState } from "react";

interface Config { apiKey: string; secretKeySet: boolean; projectId: string; lastSyncAt: string | null; }

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [form, setForm] = useState({ apiKey: "", secretKey: "", projectId: "" });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; connected?: boolean; error?: string } | null>(null);

  useEffect(() => {
    fetch("/api/amplitude").then((r) => r.json()).then((c) => {
      setConfig(c);
      setForm({ apiKey: c.apiKey, secretKey: "", projectId: c.projectId });
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);
    const res = await fetch("/api/amplitude", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setResult(data);
    if (data.ok) {
      setConfig((c) => c ? { ...c, apiKey: form.apiKey, projectId: form.projectId, secretKeySet: form.secretKey.length > 0 || (c?.secretKeySet ?? false) } : c);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Configure integrations and global preferences.</p>
      </div>

      {/* Amplitude */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)" }} className="rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <h2 className="font-semibold text-gray-100">Amplitude Integration</h2>
            <p className="text-xs text-gray-400">Connect your Amplitude project to automatically pull retention, DAU, and revenue metrics.</p>
          </div>
          {config?.lastSyncAt && (
            <span className="ml-auto text-xs text-purple-400">
              Last sync: {new Date(config.lastSyncAt).toLocaleString()}
            </span>
          )}
        </div>

        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">API Key</label>
              <input
                type="text"
                value={form.apiKey}
                onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                placeholder="Your Amplitude API key"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                className="rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-orange-500/60 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">
                Secret Key
                {config?.secretKeySet && <span className="ml-2 text-green-400">● Set</span>}
              </label>
              <input
                type="password"
                value={form.secretKey}
                onChange={(e) => setForm((f) => ({ ...f, secretKey: e.target.value }))}
                placeholder={config?.secretKeySet ? "Leave blank to keep existing" : "Your Amplitude secret key"}
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                className="rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-orange-500/60 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Project ID (optional)</label>
              <input
                type="text"
                value={form.projectId}
                onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                placeholder="Amplitude project ID"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                className="rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-orange-500/60 font-mono"
              />
            </div>
          </div>

          {result && (
            <div className={`rounded-lg px-4 py-3 text-sm ${result.ok ? (result.connected ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400") : "bg-red-500/10 text-red-400"}`}>
              {result.ok
                ? result.connected
                  ? "✓ Credentials saved and connection verified!"
                  : "✓ Credentials saved. Connection test skipped (no credentials provided)."
                : `✗ Error: ${result.error}`}
            </div>
          )}

          <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50">
            {saving ? "Saving…" : "Save & Test Connection"}
          </button>
        </form>

        {/* How to find keys */}
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-300 text-gray-400">Where to find your Amplitude credentials?</summary>
          <div className="mt-2 space-y-1 leading-relaxed">
            <p>1. Go to <span className="text-gray-300">amplitude.com</span> → your project → Settings → General</p>
            <p>2. Copy the <span className="text-gray-300">API Key</span> and <span className="text-gray-300">Secret Key</span></p>
            <p>3. The Project ID is visible in the URL: <span className="font-mono text-gray-300">app.amplitude.com/analytics/{"<projectId>"}/…</span></p>
          </div>
        </details>
      </div>

      {/* How syncing works */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)" }} className="rounded-xl p-6 space-y-3">
        <h2 className="font-semibold text-gray-100">📚 How Amplitude sync works</h2>
        <ul className="text-xs text-gray-400 space-y-2 leading-relaxed list-none">
          <li>→ Go to a season's detail page → Metrics tab → click <span className="text-orange-400">Sync Amplitude</span></li>
          <li>→ The tool fetches DAU, D1/D7/D30 retention, ARPU, and conversion rate for the season's date range</li>
          <li>→ Metrics are stored as a snapshot with <span className="text-purple-400">source: amplitude</span></li>
          <li>→ The recommendation engine immediately uses the latest snapshot to refine scores</li>
          <li>→ Re-sync anytime to update with fresh Amplitude data</li>
        </ul>
      </div>
    </div>
  );
}
