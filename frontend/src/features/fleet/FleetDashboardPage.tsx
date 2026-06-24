import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Wifi, WifiOff, RefreshCw, AlertTriangle, UploadCloud } from "lucide-react";
import { fleetApi } from "@/api/fleet";
import { useTenantStore } from "@/stores/tenantStore";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import { extractApiError } from "@/lib/utils";
import { WidgetErrorBoundary } from "@/components/ui/WidgetErrorBoundary";

// ─── Status distribution ──────────────────────────────────────────────────────

const STATUS_COLORS = ["#10B981", "#5C6373", "#F59E0B"];

function StatusDonut({ online, offline, stale }: { online: number; offline: number; stale: number }) {
  const data = [
    { name: "Online", value: online },
    { name: "Offline", value: offline },
    { name: "Stale",  value: stale  },
  ];
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={100} height={100}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={28} outerRadius={46} dataKey="value">
            {data.map((_e, i) => <Cell key={i} fill={STATUS_COLORS[i]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[i] }} />
            <span className="text-xs text-text-secondary">{d.name}</span>
            <span className="text-xs font-mono text-text-primary ml-auto pl-4">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FleetDashboardPage ───────────────────────────────────────────────────────

export function FleetDashboardPage() {
  useEffect(() => { document.title = "Fleet Dashboard — NEURASHIELD"; }, []);

  const hasRole = useTenantStore((s) => s.hasRole);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["fleet", "agents", page],
    queryFn: () => fleetApi.list({ page }),
    staleTime: 30_000,
  });

  const { data: versionDist } = useQuery({
    queryKey: ["fleet", "version-dist"],
    queryFn: fleetApi.getVersionDistribution,
    staleTime: 300_000,
  });

  const { data: heartbeatDist } = useQuery({
    queryKey: ["fleet", "heartbeat-dist"],
    queryFn: fleetApi.getHeartbeatDistribution,
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: (ids: string[]) => fleetApi.bulkUpdate(ids),
    onSuccess: () => { void refetch(); setSelected([]); toastSuccess("Update scheduled", "Fleet"); },
    onError: (e) => toastError(extractApiError(e), "Update failed"),
  });

  const reinstallMutation = useMutation({
    mutationFn: (ids: string[]) => fleetApi.forceReinstall(ids),
    onSuccess: () => { void refetch(); setSelected([]); toastSuccess("Reinstall scheduled", "Fleet"); },
    onError: (e) => toastError(extractApiError(e), "Reinstall failed"),
  });

  const toggleSelect = (id: string) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const stats = data?.stats;

  return (
    <div className="pb-6">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-text-primary font-display">Fleet Dashboard</h1>
          <p className="text-xs text-text-muted mt-0.5">Agent health, version distribution, and bulk management</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && hasRole("analyst") && (
            <>
              <button
                onClick={() => updateMutation.mutate(selected)}
                disabled={updateMutation.isPending}
                className="btn btn-ghost btn-sm flex items-center gap-1.5"
              >
                <UploadCloud size={12} /> Update {selected.length} agent{selected.length !== 1 ? "s" : ""}
              </button>
              <button
                onClick={() => reinstallMutation.mutate(selected)}
                disabled={reinstallMutation.isPending}
                className="btn btn-ghost btn-sm flex items-center gap-1.5 text-severity-high"
              >
                <RefreshCw size={12} /> Force Reinstall
              </button>
            </>
          )}
          <button onClick={() => void refetch()} className="btn btn-ghost btn-sm flex items-center gap-1.5">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Total Agents",  value: stats.total,              color: "#8B95A7", icon: Wifi },
            { label: "Online %",      value: `${stats.online_pct.toFixed(0)}%`, color: "#10B981", icon: Wifi },
            { label: "Critical Alerts", value: stats.critical_alerts_active, color: "#EF4444", icon: AlertTriangle },
            { label: "Need Update",   value: stats.agents_need_update, color: "#F59E0B", icon: UploadCloud },
          ].map((s) => (
            <div key={s.label} className="bg-bg-card border border-border rounded-lg p-3 text-center">
              <p className="text-xl font-extrabold font-mono" style={{ color: s.color }}>{s.value}</p>
              <p className="text-2xs text-text-muted uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Status donut */}
        <WidgetErrorBoundary title="Agent Status">
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">Status Distribution</h3>
            {stats ? (
              <StatusDonut online={stats.online} offline={stats.offline} stale={stats.stale} />
            ) : <div className="skel h-24 rounded-lg" />}
          </div>
        </WidgetErrorBoundary>

        {/* Version distribution */}
        <WidgetErrorBoundary title="Version Distribution">
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">Agent Version Distribution</h3>
            {!versionDist ? <div className="skel h-24 rounded-lg" /> : (
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={versionDist} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="version" tick={{ fill: "#5C6373", fontSize: 9 }} />
                  <YAxis tick={{ fill: "#5C6373", fontSize: 9 }} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid #1F2937", fontSize: 11 }} />
                  <Bar dataKey="count" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </WidgetErrorBoundary>
      </div>

      {/* Heartbeat distribution */}
      {heartbeatDist && (
        <div className="bg-bg-card border border-border rounded-xl p-4 mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">Last-Seen Distribution</h3>
          <div className="flex gap-3">
            {heartbeatDist.map((h) => (
              <div key={h.bucket} className="flex-1 text-center">
                <p className="text-lg font-extrabold font-mono text-text-primary">{h.count}</p>
                <p className="text-2xs text-text-muted mt-0.5">{h.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent table */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-bg-elevated border-b border-border">
            <tr>
              <th className="w-8 px-3 py-2.5" />
              {["Hostname","OS","Version","Status","Last Seen","Alerts","Update"].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 text-text-muted font-semibold uppercase tracking-wider text-2xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: 6 }, (_, i) => (
              <tr key={i} className="border-b border-border/50">
                {Array.from({ length: 8 }, (_, j) => <td key={j} className="px-3 py-2.5"><div className="skel h-4 rounded" /></td>)}
              </tr>
            )) : (data?.agents ?? []).map((a) => (
              <tr key={a.agent_id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                <td className="px-3 py-2.5">
                  <input type="checkbox" checked={selected.includes(a.agent_id)}
                    onChange={() => toggleSelect(a.agent_id)}
                    className="accent-accent w-3 h-3" aria-label={`Select ${a.hostname}`} />
                </td>
                <td className="px-3 py-2.5 font-mono text-text-primary font-medium">{a.hostname}</td>
                <td className="px-3 py-2.5 text-text-secondary">{a.os_type}</td>
                <td className="px-3 py-2.5 font-mono text-text-muted">{a.agent_version}</td>
                <td className="px-3 py-2.5">
                  <span className={cn("flex items-center gap-1 text-xs", a.status === "online" ? "text-status-online" : "text-text-muted")}>
                    {a.status === "online" ? <Wifi size={11} /> : <WifiOff size={11} />}
                    {a.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-mono text-text-muted text-2xs">
                  {new Date(a.last_seen).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td className="px-3 py-2.5">
                  {a.open_alert_count > 0 && (
                    <span className="flex items-center gap-1 text-severity-high">
                      <AlertTriangle size={10} /> {a.open_alert_count}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {a.update_available && (
                    <span className="px-1.5 py-0.5 rounded text-2xs font-bold bg-severity-medium/15 text-severity-medium">Update</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.total > 50 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-bg-elevated">
            <span className="text-xs text-text-muted">{(page-1)*50+1}–{Math.min(page*50, data.total)} of {data.total}</span>
            <div className="flex gap-1">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="btn btn-ghost btn-xs">Prev</button>
              <button disabled={page*50>=data.total} onClick={() => setPage(p=>p+1)} className="btn btn-ghost btn-xs">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
