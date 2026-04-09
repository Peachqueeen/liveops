"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ScoreRing from "@/components/score-ring";
import RecommendationCard from "@/components/recommendation-card";
import type { Recommendation } from "@/lib/recommendations";

interface Season { id: string; name: string; number: number; isActive: boolean; }
interface Analysis {
  season: { id: string; name: string; number: number };
  economyRatio: number;
  retentionScore: number;
  monetisationScore: number;
  balanceScore: number;
  freeValuePerDay: number;
  premiumValuePerDay: number;
  recommendations: Recommendation[];
}

function RecommendationsContent() {
  const params = useSearchParams();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "retention" | "monetisation" | "balance" | "data">("all");

  useEffect(() => {
    fetch("/api/seasons")
      .then((r) => r.json())
      .then((s: Season[]) => {
        setSeasons(s);
        const paramId = params.get("seasonId");
        const active = s.find((x) => x.id === paramId) ?? s.find((x) => x.isActive) ?? s[0];
        if (active) setSelectedId(active.id);
      });
  }, [params]);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setAnalysis(null);
    fetch(`/api/recommendations?seasonId=${selectedId}`)
      .then((r) => r.json())
      .then(setAnalysis)
      .finally(() => setLoading(false));
  }, [selectedId]);

  const filtered = analysis?.recommendations.filter(
    (r) => filter === "all" || r.category === filter
  ) ?? [];

  const categoryOptions = [
    { value: "all",           label: "All",           count: analysis?.recommendations.length ?? 0 },
    { value: "retention",     label: "Retention",     count: analysis?.recommendations.filter((r) => r.category === "retention").length ?? 0 },
    { value: "monetisation",  label: "Monetisation",  count: analysis?.recommendations.filter((r) => r.category === "monetisation").length ?? 0 },
    { value: "balance",       label: "Balance",       count: analysis?.recommendations.filter((r) => r.category === "balance").length ?? 0 },
    { value: "data",          label: "Data gaps",     count: analysis?.recommendations.filter((r) => r.category === "data").length ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Recommendations</h1>
          <p className="text-sm text-gray-400 mt-0.5">Economy balance analysis per season</p>
        </div>

        {/* Season selector */}
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          className="rounded-lg px-3 py-2 text-sm text-gray-100 outline-none"
        >
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              S{s.number}: {s.name}{s.isActive ? " (active)" : ""}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-gray-500">Analysing economy…</p>}

      {analysis && (
        <>
          {/* Score row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { score: analysis.balanceScore,      label: "Balance Score",      color: "#ff7a45" },
              { score: analysis.retentionScore,    label: "Retention Score",    color: "#6366f1" },
              { score: analysis.monetisationScore, label: "Monetisation Score", color: "#ec4899" },
              { score: Math.round(analysis.economyRatio * 100), label: "Free Economy %", color: analysis.economyRatio < 0.3 ? "#ef4444" : analysis.economyRatio > 0.55 ? "#eab308" : "#22c55e" },
            ].map((item) => (
              <div key={item.label} style={{ background: "var(--surface)", border: "1px solid var(--border)" }} className="rounded-2xl p-5 flex flex-col items-center gap-2">
                <ScoreRing score={item.score} label={item.label} color={item.color} />
              </div>
            ))}
          </div>

          {/* Economy breakdown bar */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)" }} className="rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Daily Economy Breakdown</h3>
            <div className="flex gap-4 text-xs text-gray-400 mb-2">
              <span>Free value: <span className="text-green-400 font-semibold">{analysis.freeValuePerDay.toFixed(0)} pts/day</span></span>
              <span>Premium-linked: <span className="text-pink-400 font-semibold">{analysis.premiumValuePerDay.toFixed(0)} pts/day</span></span>
            </div>
            <div className="h-4 rounded-full overflow-hidden bg-white/5 flex">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${analysis.economyRatio * 100}%` }}
              />
              <div className="h-full bg-pink-500 flex-1" />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>Free {Math.round(analysis.economyRatio * 100)}%</span>
              <span className={`font-semibold ${analysis.economyRatio < 0.3 ? "text-red-400" : analysis.economyRatio > 0.55 ? "text-yellow-400" : "text-green-400"}`}>
                {analysis.economyRatio < 0.3 ? "⚠ Too stingy" : analysis.economyRatio > 0.55 ? "⚠ Too generous" : "✓ Balanced"}
              </span>
              <span>Premium {Math.round((1 - analysis.economyRatio) * 100)}%</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">Target: 30–55% free economy for optimal retention + monetisation balance.</p>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            {categoryOptions.map((c) => (
              <button
                key={c.value}
                onClick={() => setFilter(c.value as typeof filter)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  filter === c.value
                    ? "bg-orange-500/20 text-orange-400"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {c.label}
                {c.count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-gray-300">{c.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Recommendation list */}
          <div className="grid gap-3">
            {filtered.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
            {filtered.length === 0 && (
              <p className="text-gray-500 text-sm">No recommendations in this category.</p>
            )}
          </div>

          {/* How it works */}
          <details style={{ background: "var(--surface)", border: "1px solid var(--border)" }} className="rounded-xl">
            <summary className="px-5 py-4 text-sm font-medium text-gray-300 cursor-pointer hover:text-gray-100">
              How does the recommendation engine work?
            </summary>
            <div className="px-5 pb-4 text-xs text-gray-400 space-y-2 leading-relaxed">
              <p><strong className="text-gray-300">Economy Ratio</strong> = free daily value ÷ total daily value. Target: 30–55%.</p>
              <p><strong className="text-gray-300">Free value</strong> is calculated per event as: avg(min, max) × probability × daily multiplier × asset weight.</p>
              <p><strong className="text-gray-300">Retention Score</strong>: derived from D1/D7/D30 retention (benchmarks: 40%/20%/10%). Estimated from economy density if no metrics are provided.</p>
              <p><strong className="text-gray-300">Monetisation Score</strong>: derived from ARPU (benchmark €0.50/user) and conversion rate (benchmark 3%). Inversely estimated from generosity if no data.</p>
              <p><strong className="text-gray-300">Balance Score</strong>: harmonic mean of retention and monetisation — penalises extremes and rewards having both scores high simultaneously.</p>
              <p><strong className="text-gray-300">Amplitude sync</strong>: connect your Amplitude project in Settings → the engine will pull D1/D7 retention, DAU, and revenue data automatically after each sync.</p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

export default function RecommendationsPage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <RecommendationsContent />
    </Suspense>
  );
}
