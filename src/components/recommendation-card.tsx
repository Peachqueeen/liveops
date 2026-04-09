import type { Recommendation } from "@/lib/recommendations";

const priorityStyle = {
  high:   { bg: "bg-red-500/10",    border: "border-red-500/30",    text: "text-red-400",    badge: "bg-red-500/20 text-red-300" },
  medium: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", badge: "bg-yellow-500/20 text-yellow-300" },
  low:    { bg: "bg-green-500/10",  border: "border-green-500/30",  text: "text-green-400",  badge: "bg-green-500/20 text-green-300" },
};

const typeIcon: Record<string, string> = {
  increase: "⬆️",
  decrease: "⬇️",
  maintain: "✅",
  info:     "ℹ️",
};

const categoryLabel: Record<string, string> = {
  retention:     "Retention",
  monetisation:  "Monetisation",
  balance:       "Balance",
  data:          "Data",
};

export default function RecommendationCard({ rec }: { rec: Recommendation }) {
  const s = priorityStyle[rec.priority];

  return (
    <div className={`rounded-xl border p-4 ${s.bg} ${s.border}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcon[rec.type]}</span>
          <span className={`font-semibold text-sm ${s.text}`}>{rec.title}</span>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full ${s.badge}`}>
            {rec.priority.toUpperCase()}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
            {categoryLabel[rec.category]}
          </span>
        </div>
      </div>

      {rec.eventName && (
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
          <span>Event: <span className="text-gray-200">{rec.eventName}</span></span>
          {rec.assetName && (
            <>
              <span>·</span>
              <span>Asset: <span className="text-gray-200">{rec.assetName}</span></span>
            </>
          )}
        </div>
      )}

      {rec.currentValue != null && rec.suggestedValue != null && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-400 line-through">{rec.currentValue}</span>
          <span className="text-xs text-gray-400">→</span>
          <span className={`text-sm font-bold ${s.text}`}>{rec.suggestedValue}</span>
          {rec.changePercent != null && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${s.badge}`}>
              {rec.type === "increase" ? "+" : "-"}{rec.changePercent}%
            </span>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 leading-relaxed">{rec.reason}</p>
    </div>
  );
}
