import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { apiClient } from "@/api/client";
import type { DashboardTimeRange } from "../types/dashboard";

// GET /dashboard/mttr-trend — weekly MTTR per severity
interface MTTRTrendPoint {
  week: string;
  critical_minutes: number;
  high_minutes:     number;
  medium_minutes:   number;
}

// Sample fallback
function sample(): MTTRTrendPoint[] {
  const now = Date.now();
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(now - (7 - i) * 7 * 86400_000);
    return {
      week:             d.toISOString().slice(0, 10),
      critical_minutes: 60  + Math.random() * 60,
      high_minutes:     120 + Math.random() * 120,
      medium_minutes:   300 + Math.random() * 300,
    };
  });
}

interface Props {
  timeRange: DashboardTimeRange;
}

export function MTTRTrendChart({ timeRange }: Props) {
  void timeRange;

  const { data, isLoading } = useQuery({
    // TODO: wire to /dashboard/mttr-trend
    queryKey: ["dashboard", "mttr-trend"],
    queryFn: () =>
      apiClient.get<MTTRTrendPoint[]>("/dashboard/mttr-trend")
        .then((r) => r.data)
        .catch(() => sample()),
    staleTime: 300_000,
    placeholderData: sample,
  });

  const fmt = (v: number) =>
    v >= 60 ? `${(v / 60).toFixed(1)}h` : `${Math.round(v)}m`;

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">MTTR Trend (Weekly)</h3>
      {isLoading ? (
        <div className="skel h-44 rounded-lg" />
      ) : (
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={data ?? []} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="week" tick={{ fill: "#5C6373", fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} />
            <YAxis tick={{ fill: "#5C6373", fontSize: 9 }} tickFormatter={fmt} />
            <Tooltip
              contentStyle={{ background: "#111", border: "1px solid #1F2937", fontSize: 11 }}
              formatter={(v: number) => fmt(v)}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="critical_minutes" name="Critical" stroke="#EF4444" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="high_minutes"     name="High"     stroke="#F97316" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="medium_minutes"   name="Medium"   stroke="#F59E0B" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
