import React from "react";

function scoreColor(s: number): string {
  return s >= 80 ? "#EF4444" : s >= 60 ? "#F97316" : s >= 30 ? "#F59E0B" : "#10B981";
}

function scoreLabel(s: number): string {
  return s >= 80 ? "CRITICAL" : s >= 60 ? "HIGH" : s >= 30 ? "MEDIUM" : "LOW";
}

interface Props {
  score: number;
  confidence: string;
}

export const ScorePanel = React.memo(function ScorePanel({ score, confidence }: Props) {
  const color = scoreColor(score);
  const label = scoreLabel(score);
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);

  return (
    <div className="bg-bg-subtle border border-border-card rounded-lg p-3.5 text-center">
      <div className="text-2xs font-bold uppercase tracking-widest text-text-muted mb-2.5">
        Threat Score
      </div>
      <svg width={100} height={100} className="block mx-auto">
        <circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={7} />
        <circle
          cx={50} cy={50} r={r} fill="none"
          stroke={color} strokeWidth={7}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{
            filter: `drop-shadow(0 0 6px ${color}80)`,
            transition: "stroke-dashoffset 800ms ease",
          }}
        />
        <text x={50} y={46} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={20} fontWeight={700}
          fontFamily="'JetBrains Mono', monospace">
          {score}
        </text>
        <text x={50} y={62} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={8} fontWeight={700}
          fontFamily="'JetBrains Mono', monospace" letterSpacing={1}>
          {label}
        </text>
      </svg>
      <div className="mt-1.5 text-xs text-text-muted capitalize">
        {confidence} confidence
      </div>
    </div>
  );
});
