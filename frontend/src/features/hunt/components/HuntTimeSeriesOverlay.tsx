import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useMemo } from "react";

// ─── Time-series histogram above hunt results ─────────────────────────────────

interface TimePoint {
  bucket: string; // ISO or short label
  count: number;
}

interface Props {
  timestamps: string[]; // ISO strings from result set
  selectedBucket?: string;
  onBucketClick?: (bucket: string) => void;
}

function bucketByHour(timestamps: string[]): TimePoint[] {
  const counts = new Map<string, number>();
  for (const ts of timestamps) {
    const d = new Date(ts);
    const key = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([bucket, count]) => ({ bucket, count })).sort((a, b) => a.bucket.localeCompare(b.bucket));
}

function bucketByDay(timestamps: string[]): TimePoint[] {
  const counts = new Map<string, number>();
  for (const ts of timestamps) {
    const d = new Date(ts);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([bucket, count]) => ({ bucket, count })).sort((a, b) => a.bucket.localeCompare(b.bucket));
}

export function HuntTimeSeriesOverlay({ timestamps, selectedBucket, onBucketClick }: Props) {
  const data = useMemo(() => {
    if (!timestamps.length) return [];
    const range = new Date(timestamps[timestamps.length - 1]!).getTime() - new Date(timestamps[0]!).getTime();
    return range > 2 * 86400_000 ? bucketByDay(timestamps) : bucketByHour(timestamps);
  }, [timestamps]);

  if (!data.length) return null;

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-bg-card border border-border rounded-xl px-3 py-2 mb-3">
      <p className="text-2xs text-text-muted mb-2 uppercase tracking-wider">Result Distribution</p>
      <ResponsiveContainer width="100%" height={60}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="bucket" tick={{ fill: "#5C6373", fontSize: 8 }} interval="preserveStartEnd" />
          <YAxis tick={false} axisLine={false} tickLine={false} domain={[0, maxCount]} />
          <Tooltip
            contentStyle={{ background: "#111", border: "1px solid #1F2937", fontSize: 11, padding: "4px 8px" }}
            formatter={(v: number) => [v, "Events"]}
            labelStyle={{ color: "#8B95A7", fontSize: 10 }}
          />
          <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={16}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.bucket === selectedBucket ? "rgba(59,130,246,0.9)" : "rgba(59,130,246,0.4)"}
                cursor={onBucketClick ? "pointer" : "default"}
                onClick={() => onBucketClick?.(entry.bucket)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
