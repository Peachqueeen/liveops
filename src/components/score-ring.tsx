"use client";

interface ScoreRingProps {
  score: number; // 0-100
  label: string;
  color?: string;
  size?: number;
}

export default function ScoreRing({ score, label, color = "#ff7a45", size = 100 }: ScoreRingProps) {
  const r = 38;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 100 100">
        {/* Background ring */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#2e2e3e" strokeWidth="8" />
        {/* Score ring */}
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
        {/* Score text */}
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize="20"
          fontWeight="700"
        >
          {score}
        </text>
      </svg>
      <span className="text-xs text-gray-400 text-center">{label}</span>
    </div>
  );
}
