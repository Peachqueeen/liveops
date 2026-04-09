import Link from "next/link";
import { db } from "@/lib/db";
import { analyseEconomy, type EventSummary, scoreLabel, ratioLabel } from "@/lib/recommendations";
import ScoreRing from "@/components/score-ring";
import RecommendationCard from "@/components/recommendation-card";

export const dynamic = "force-dynamic";

async function getActiveSeason() {
  return db.season.findFirst({
    where: { isActive: true },
    include: {
      seasonEvents: {
        include: { event: true, rewards: { include: { assetType: true } } },
        orderBy: { sortOrder: "asc" },
      },
      metrics: { orderBy: { date: "desc" }, take: 1 },
    },
  });
}

export default async function Dashboard() {
  const [season, allAssets, totalSeasons] = await Promise.all([
    getActiveSeason(),
    db.assetType.findMany({ orderBy: { sortOrder: "asc" } }),
    db.season.count(),
  ]);

  if (!season) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl">🍑</div>
        <h1 className="text-2xl font-bold text-gray-200">No active season yet</h1>
        <p className="text-gray-400">Create your first season to get started.</p>
        <Link
          href="/seasons"
          className="px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors"
        >
          Create Season
        </Link>
      </div>
    );
  }

  const events: EventSummary[] = season.seasonEvents.map((se) => ({
    eventId: se.eventId,
    eventName: se.event.name,
    eventSlug: se.event.slug,
    frequency: se.event.frequency,
    isActive: se.isActive,
    rewards: se.rewards.map((r) => ({
      assetTypeId: r.assetTypeId,
      assetName: r.assetType.name,
      assetSlug: r.assetType.slug,
      minAmount: r.minAmount,
      maxAmount: r.maxAmount,
      probability: r.probability,
      tier: r.tier,
    })),
  }));

  const analysis = analyseEconomy({
    season: { id: season.id, name: season.name, number: season.number },
    events,
    assets: allAssets,
    latestMetrics: season.metrics[0] ?? null,
  });

  const { label: ratioLbl, status: ratioStatus } = ratioLabel(analysis.economyRatio);
  const ratioColor = ratioStatus === "ok" ? "#22c55e" : ratioStatus === "warn" ? "#eab308" : "#ef4444";

  const topRecs = analysis.recommendations.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">
            Season {season.number}: {season.name}
          </h1>
          <p className="text-gray-400 mt-1">
            {new Date(season.startDate).toLocaleDateString()} –{" "}
            {new Date(season.endDate).toLocaleDateString()}
          </p>
        </div>
        <Link
          href={`/seasons/${season.id}`}
          className="px-3 py-1.5 text-sm rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors"
        >
          Configure season →
        </Link>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { score: analysis.balanceScore,       label: "Balance Score",     color: "#ff7a45" },
          { score: analysis.retentionScore,     label: "Retention Score",   color: "#6366f1" },
          { score: analysis.monetisationScore,  label: "Monetisation Score",color: "#ec4899" },
          { score: Math.round(analysis.economyRatio * 100), label: "Economy Ratio %", color: ratioColor },
        ].map((item) => (
          <div
            key={item.label}
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            className="rounded-2xl p-5 flex flex-col items-center gap-2"
          >
            <ScoreRing score={item.score} label={item.label} color={item.color} />
            <span className="text-xs text-gray-400">{scoreLabel(item.score)}</span>
          </div>
        ))}
      </div>

      {/* Economy ratio indicator */}
      <div
        style={{ background: "var(--surface)", border: `1px solid ${ratioColor}40` }}
        className="rounded-xl p-4 flex items-center gap-4"
      >
        <div className="text-3xl">
          {ratioStatus === "ok" ? "⚖️" : ratioStatus === "warn" ? "⚠️" : "🚨"}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: ratioColor }}>{ratioLbl}</span>
            <span className="text-xs text-gray-500">
              {Math.round(analysis.economyRatio * 100)}% free / {Math.round((1 - analysis.economyRatio) * 100)}% premium economy
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Free value: <span className="text-gray-200">{analysis.freeValuePerDay.toFixed(0)} pts/day</span>
            {" · "}
            Target ratio: <span className="text-gray-200">30–55%</span>
          </p>
        </div>
      </div>

      {/* Latest metrics strip */}
      {season.metrics[0] && (
        <div
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          className="rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300">Latest Metrics</h2>
            <span className="text-xs text-gray-500">
              {new Date(season.metrics[0].date).toLocaleDateString()} · {season.metrics[0].source}
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: "D1 Retention", value: season.metrics[0].retentionD1, fmt: (v: number) => `${v.toFixed(1)}%` },
              { label: "D7 Retention", value: season.metrics[0].retentionD7, fmt: (v: number) => `${v.toFixed(1)}%` },
              { label: "D30 Retention", value: season.metrics[0].retentionD30, fmt: (v: number) => `${v.toFixed(1)}%` },
              { label: "DAU",           value: season.metrics[0].dau,           fmt: (v: number) => v.toLocaleString() },
              { label: "ARPU",          value: season.metrics[0].arpu,          fmt: (v: number) => `€${v.toFixed(2)}` },
              { label: "Conversion",    value: season.metrics[0].conversionRate, fmt: (v: number) => `${v.toFixed(1)}%` },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <div className="text-lg font-bold text-gray-100">
                  {m.value != null ? m.fmt(m.value as number) : <span className="text-gray-600">—</span>}
                </div>
                <div className="text-xs text-gray-500">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top recommendations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-200">Top Recommendations</h2>
          <Link
            href="/recommendations"
            className="text-sm text-orange-400 hover:text-orange-300"
          >
            View all →
          </Link>
        </div>
        <div className="grid gap-3">
          {topRecs.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} />
          ))}
          {topRecs.length === 0 && (
            <p className="text-gray-500 text-sm">No recommendations yet.</p>
          )}
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total seasons", value: totalSeasons, icon: "🗓️" },
          { label: "Active events", value: season.seasonEvents.filter((e) => e.isActive).length, icon: "🎡" },
          { label: "Asset types",   value: allAssets.length, icon: "💎" },
        ].map((s) => (
          <div
            key={s.label}
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            className="rounded-xl p-4 text-center"
          >
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-gray-100">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
