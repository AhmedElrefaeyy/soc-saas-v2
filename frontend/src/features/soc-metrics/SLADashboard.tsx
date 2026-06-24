import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { socMetricsApi } from "@/api/soc-metrics";
import { WidgetErrorBoundary } from "@/components/ui/WidgetErrorBoundary";

function StatCard({
  label, value, color, icon: Icon,
}: { label: string; value: string | number; color: string; icon: React.ElementType }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p className="text-2xs text-text-muted uppercase tracking-widest font-bold">{label}</p>
        <p className="text-xl font-extrabold font-mono text-text-primary">{value}</p>
      </div>
    </div>
  );
}

export function SLADashboard() {
  useEffect(() => { document.title = "SLA Dashboard — NEURASHIELD"; }, []);

  const { data: breachData } = useQuery({
    queryKey: ["metrics", "sla-breach-rate", "90d"],
    queryFn:  () => socMetricsApi.getSLABreachRate("90d"),
    staleTime: 300_000,
  });

  const latest = breachData?.[breachData.length - 1];

  return (
    <div className="pb-6">
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-text-primary font-display">SLA Dashboard</h1>
        <p className="text-xs text-text-muted mt-0.5">Alert response time compliance and breach tracking</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard label="2h SLA Breach Rate"  value={`${latest?.warn_breach_pct?.toFixed(1) ?? "—"}%`} color="#F59E0B" icon={AlertTriangle} />
        <StatCard label="8h SLA Breach Rate"  value={`${latest?.crit_breach_pct?.toFixed(1) ?? "—"}%`} color="#EF4444" icon={Clock} />
        <StatCard label="Within SLA"           value={latest ? `${(100 - latest.warn_breach_pct).toFixed(1)}%` : "—"} color="#10B981" icon={CheckCircle} />
      </div>

      <WidgetErrorBoundary title="SLA Trend">
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">90-Day SLA Breach Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={breachData ?? []} margin={{ top: 4, right: 8, bottom: 0, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: "#5C6373", fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fill: "#5C6373", fontSize: 9 }} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid #1F2937", fontSize: 11 }}
                formatter={(v: number) => `${v.toFixed(1)}%`} />
              <ReferenceLine y={10} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: "10% target", fill: "#F59E0B", fontSize: 9 }} />
              <Line type="monotone" dataKey="warn_breach_pct" name="2h breach %" stroke="#F59E0B" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="crit_breach_pct" name="8h breach %" stroke="#EF4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </WidgetErrorBoundary>

      <div className="mt-3">
        <WidgetErrorBoundary title="Alert Volume">
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">Alert Volume Context</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={breachData ?? []} margin={{ top: 4, right: 8, bottom: 0, left: -15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: "#5C6373", fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fill: "#5C6373", fontSize: 9 }} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #1F2937", fontSize: 11 }} />
                <Bar dataKey="warn_breach_pct" name="2h breach %" fill="#F59E0B" opacity={0.6} />
                <Bar dataKey="crit_breach_pct" name="8h breach %" fill="#EF4444" opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </WidgetErrorBoundary>
      </div>
    </div>
  );
}
