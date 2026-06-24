import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingDown, TrendingUp, Shield, Clock, Users, Target } from "lucide-react";
import { socMetricsApi } from "@/api/soc-metrics";
import { WidgetErrorBoundary } from "@/components/ui/WidgetErrorBoundary";
import { cn } from "@/lib/utils";

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skel({ className }: { className?: string }) {
  return <div className={cn("skel rounded-lg animate-pulse", className)} />;
}

// ─── MTTR Card ────────────────────────────────────────────────────────────────

const SEV_COLORS: Record<string, string> = {
  critical: "#EF4444", high: "#F97316", medium: "#F59E0B", low: "#6B7280",
};

function MTTRCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["metrics", "mttr"],
    queryFn: () => socMetricsApi.getMTTR("30d"),
    staleTime: 300_000,
  });

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={14} className="text-accent" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">Mean Time to Resolve (30d)</h3>
      </div>
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skel key={i} className="h-8" />)}</div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((row) => (
            <div key={row.severity} className="flex items-center gap-3">
              <span
                className="text-2xs font-bold uppercase w-16 flex-shrink-0"
                style={{ color: SEV_COLORS[row.severity] ?? "#8B95A7" }}
              >
                {row.severity}
              </span>
              <div className="flex-1 bg-bg-elevated rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (row.mean_minutes / 1440) * 100)}%`,
                    background: SEV_COLORS[row.severity] ?? "#8B95A7",
                  }}
                />
              </div>
              <span className="text-xs font-mono text-text-secondary w-16 text-right flex-shrink-0">
                {row.mean_minutes >= 60
                  ? `${(row.mean_minutes / 60).toFixed(1)}h`
                  : `${Math.round(row.mean_minutes)}m`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Alert Volume Trend ───────────────────────────────────────────────────────

function AlertVolumeTrend() {
  const { data, isLoading } = useQuery({
    queryKey: ["metrics", "alert-volume"],
    queryFn: () => socMetricsApi.getAlertVolume("30d"),
    staleTime: 300_000,
  });

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={14} className="text-accent" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">Alert Volume (30d)</h3>
      </div>
      {isLoading ? <Skel className="h-48" /> : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data ?? []} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <defs>
              {["critical","high","medium","low"].map((s) => (
                <linearGradient key={s} id={`grad-${s}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SEV_COLORS[s]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={SEV_COLORS[s]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fill: "#5C6373", fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} />
            <YAxis tick={{ fill: "#5C6373", fontSize: 9 }} />
            <Tooltip contentStyle={{ background: "#111", border: "1px solid #1F2937", fontSize: 11 }} />
            <Area type="monotone" dataKey="critical" stackId="1" stroke="#EF4444" fill="url(#grad-critical)" strokeWidth={1.5} />
            <Area type="monotone" dataKey="high"     stackId="1" stroke="#F97316" fill="url(#grad-high)"     strokeWidth={1.5} />
            <Area type="monotone" dataKey="medium"   stackId="1" stroke="#F59E0B" fill="url(#grad-medium)"   strokeWidth={1.5} />
            <Area type="monotone" dataKey="low"      stackId="1" stroke="#6B7280" fill="url(#grad-low)"      strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Analyst Leaderboard ─────────────────────────────────────────────────────

function AnalystLeaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["metrics", "analyst-performance"],
    queryFn: socMetricsApi.getAnalystPerformance,
    staleTime: 60_000,
  });

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users size={14} className="text-accent" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">Analyst Performance</h3>
      </div>
      {isLoading ? <Skel className="h-40" /> : (
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-2 text-text-muted font-semibold">Analyst</th>
                <th className="text-right pb-2 text-text-muted font-semibold">Triaged Today</th>
                <th className="text-right pb-2 text-text-muted font-semibold">Avg Resolve</th>
                <th className="text-right pb-2 text-text-muted font-semibold">Open</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((a) => (
                <tr key={a.user_id} className="border-b border-border/50">
                  <td className="py-1.5 text-text-primary font-medium">{a.name}</td>
                  <td className="py-1.5 text-right text-accent font-mono">{a.alerts_triaged_today}</td>
                  <td className="py-1.5 text-right text-text-secondary font-mono">
                    {a.avg_resolution_minutes >= 60
                      ? `${(a.avg_resolution_minutes / 60).toFixed(1)}h`
                      : `${Math.round(a.avg_resolution_minutes)}m`}
                  </td>
                  <td className="py-1.5 text-right text-text-muted">{a.open_assignments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── SLA Breach Rate ─────────────────────────────────────────────────────────

function SLABreachChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["metrics", "sla-breach-rate"],
    queryFn: () => socMetricsApi.getSLABreachRate("30d"),
    staleTime: 300_000,
  });

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingDown size={14} className="text-severity-high" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">SLA Breach Rate (30d)</h3>
      </div>
      {isLoading ? <Skel className="h-40" /> : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data ?? []} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fill: "#5C6373", fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} />
            <YAxis tick={{ fill: "#5C6373", fontSize: 9 }} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip contentStyle={{ background: "#111", border: "1px solid #1F2937", fontSize: 11 }}
              formatter={(v: number) => `${v.toFixed(1)}%`} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="warn_breach_pct"  name="2h SLA" stroke="#F59E0B" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="crit_breach_pct"  name="8h SLA" stroke="#EF4444" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Verdict Distribution ────────────────────────────────────────────────────

const VERDICT_COLORS = ["#10B981", "#EF4444", "#6B7280", "#3B82F6"];

function VerdictDonut() {
  const { data, isLoading } = useQuery({
    queryKey: ["metrics", "verdict-distribution"],
    queryFn: () => socMetricsApi.getVerdictDistribution("30d"),
    staleTime: 300_000,
  });

  const chartData = data ? [
    { name: "True Positive",  value: data.true_positive  },
    { name: "False Positive", value: data.false_positive },
    { name: "Benign",         value: data.benign         },
    { name: "Unknown",        value: data.unknown        },
  ] : [];

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Target size={14} className="text-accent" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">Verdict Distribution</h3>
      </div>
      {isLoading ? <Skel className="h-40" /> : (
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
                {chartData.map((_e, i) => <Cell key={i} fill={VERDICT_COLORS[i % VERDICT_COLORS.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5">
            {chartData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: VERDICT_COLORS[i] }} />
                <span className="text-xs text-text-secondary">{d.name}</span>
                <span className="text-xs font-mono text-text-primary ml-auto pl-4">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Coverage Score ───────────────────────────────────────────────────────────

function CoverageScore() {
  const { data, isLoading } = useQuery({
    queryKey: ["metrics", "coverage-score"],
    queryFn: socMetricsApi.getCoverageScore,
    staleTime: 300_000,
  });

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield size={14} className="text-accent" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">Detection Coverage</h3>
      </div>
      {isLoading ? <Skel className="h-20" /> : data ? (
        <div className="space-y-3">
          <div className="flex items-end gap-3">
            <span className="text-4xl font-extrabold font-display text-text-primary">{data.score_pct}%</span>
            <span className={cn(
              "text-sm font-semibold flex items-center gap-1 mb-1",
              data.trend_delta >= 0 ? "text-status-online" : "text-severity-high",
            )}>
              {data.trend_delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {data.trend_delta >= 0 ? "+" : ""}{data.trend_delta}%
            </span>
          </div>
          <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${data.score_pct}%` }}
            />
          </div>
          <p className="text-xs text-text-muted">
            {data.covered_techniques} of {data.total_techniques} MITRE techniques covered
          </p>
        </div>
      ) : (
        <p className="text-xs text-text-muted">No data available</p>
      )}
    </div>
  );
}

// ─── SocMetricsPage ───────────────────────────────────────────────────────────

export function SocMetricsPage() {
  useEffect(() => { document.title = "SOC Metrics — NEURASHIELD"; }, []);

  return (
    <div className="pb-6">
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-text-primary font-display">SOC Metrics</h1>
        <p className="text-xs text-text-muted mt-0.5">Team performance, SLA compliance, and detection effectiveness</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <WidgetErrorBoundary title="MTTR"><MTTRCard /></WidgetErrorBoundary>
        <WidgetErrorBoundary title="Coverage Score"><CoverageScore /></WidgetErrorBoundary>
      </div>

      <div className="mb-3">
        <WidgetErrorBoundary title="Alert Volume"><AlertVolumeTrend /></WidgetErrorBoundary>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <WidgetErrorBoundary title="SLA Breach Rate"><SLABreachChart /></WidgetErrorBoundary>
        <WidgetErrorBoundary title="Verdict Distribution"><VerdictDonut /></WidgetErrorBoundary>
        <WidgetErrorBoundary title="Analyst Performance"><AnalystLeaderboard /></WidgetErrorBoundary>
      </div>
    </div>
  );
}
