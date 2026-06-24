import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { User, AlertTriangle, MapPin } from "lucide-react";
import { uebaApi } from "@/api/ueba";
import type { RiskyUser } from "@/api/ueba";
import { cn } from "@/lib/utils";
import { WidgetErrorBoundary } from "@/components/ui/WidgetErrorBoundary";

// ─── User Timeline ────────────────────────────────────────────────────────────

function UserTimeline({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["ueba", "timeline", userId],
    queryFn: () => uebaApi.getUserTimeline(userId, "30d"),
    staleTime: 60_000,
    enabled: !!userId,
  });

  if (isLoading) return <div className="skel h-32 rounded-lg" />;

  return (
    <ResponsiveContainer width="100%" height={130}>
      <LineChart data={data ?? []} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="date" tick={{ fill: "#5C6373", fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} />
        <YAxis tick={{ fill: "#5C6373", fontSize: 9 }} domain={[0, 100]} />
        <Tooltip contentStyle={{ background: "#111", border: "1px solid #1F2937", fontSize: 11 }} />
        <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={2} dot={false} name="UEBA Score" />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Flag Distribution ────────────────────────────────────────────────────────

function FlagDistribution() {
  const { data, isLoading } = useQuery({
    queryKey: ["ueba", "flag-distribution"],
    queryFn: uebaApi.getFlagDistribution,
    staleTime: 300_000,
  });

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">UEBA Flag Distribution</h3>
      {isLoading ? <div className="skel h-40 rounded-lg" /> : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data ?? []} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#5C6373", fontSize: 9 }} />
            <YAxis type="category" dataKey="flag" tick={{ fill: "#8B95A7", fontSize: 9 }} width={80} />
            <Tooltip contentStyle={{ background: "#111", border: "1px solid #1F2937", fontSize: 11 }} />
            <Bar dataKey="count" fill="#3B82F6" opacity={0.7} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Impossible Travel ────────────────────────────────────────────────────────

function ImpossibleTravel() {
  const { data, isLoading } = useQuery({
    queryKey: ["ueba", "impossible-travel"],
    queryFn: uebaApi.getImpossibleTravel,
    staleTime: 120_000,
  });

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={13} className="text-severity-critical" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">Impossible Travel Alerts</h3>
      </div>
      {isLoading ? <div className="skel h-32 rounded-lg" /> : (
        (data ?? []).length === 0 ? (
          <p className="text-xs text-text-muted text-center py-6">No impossible travel detected.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-2 text-text-muted font-semibold">User</th>
                <th className="text-left pb-2 text-text-muted font-semibold">Location 1</th>
                <th className="text-left pb-2 text-text-muted font-semibold">Location 2</th>
                <th className="text-right pb-2 text-text-muted font-semibold">Δ Time</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((e, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1.5 text-text-primary font-medium">{e.username}</td>
                  <td className="py-1.5 text-text-secondary">{e.location_1}</td>
                  <td className="py-1.5 text-text-secondary">{e.location_2}</td>
                  <td className="py-1.5 text-right font-mono text-severity-high">
                    {e.time_delta_minutes < 60 ? `${e.time_delta_minutes}m` : `${(e.time_delta_minutes / 60).toFixed(1)}h`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}

// ─── UEBADashboard ────────────────────────────────────────────────────────────

export function UEBADashboard() {
  useEffect(() => { document.title = "UEBA Dashboard — NEURASHIELD"; }, []);

  const [selectedUser, setSelectedUser] = useState<RiskyUser | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["ueba", "top-users"],
    queryFn: () => uebaApi.getTopUsers(20),
    staleTime: 120_000,
  });

  return (
    <div className="pb-6">
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-text-primary font-display">User Behavior Analytics</h1>
        <p className="text-xs text-text-muted mt-0.5">UEBA scoring, anomaly detection, and insider threat monitoring</p>
      </div>

      <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: "2fr 1fr" }}>
        {/* Top risky users */}
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <User size={13} className="text-accent" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">Top 20 Risky Users</h3>
          </div>
          <div className="overflow-auto" style={{ maxHeight: 360 }}>
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50">
                  <div className="skel w-6 h-6 rounded-full" /><div className="skel flex-1 h-4 rounded" />
                </div>
              ))
            ) : (users ?? []).map((u) => (
              <button
                key={u.user_id}
                onClick={() => setSelectedUser(u)}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-2.5 border-b border-border/50 text-left transition-colors",
                  selectedUser?.user_id === u.user_id ? "bg-accent/8" : "hover:bg-bg-elevated/50",
                )}
              >
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                  {(u.username[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{u.username}</p>
                  <p className="text-2xs text-text-muted truncate">{u.top_flags.slice(0, 2).join(", ")}</p>
                </div>
                <div className={cn("px-1.5 py-0.5 rounded text-2xs font-bold flex-shrink-0",
                  u.ueba_score >= 80 ? "bg-severity-critical/15 text-severity-critical" :
                  u.ueba_score >= 60 ? "bg-severity-high/15 text-severity-high" :
                  "bg-severity-medium/15 text-severity-medium"
                )}>
                  {u.ueba_score}
                </div>
                {u.last_anomaly_at && (
                  <AlertTriangle size={10} className="text-severity-high flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Selected user timeline */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          {selectedUser ? (
            <>
              <h3 className="text-xs font-bold text-text-primary mb-1">{selectedUser.username}</h3>
              <p className="text-2xs text-text-muted mb-3">30-day risk score trend</p>
              <UserTimeline userId={selectedUser.user_id} />
              <div className="mt-3 space-y-1">
                <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Active Flags</p>
                <div className="flex flex-wrap gap-1">
                  {selectedUser.top_flags.map((f) => (
                    <span key={f} className="px-1.5 py-0.5 rounded bg-severity-high/10 text-severity-high text-2xs">{f}</span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-text-muted text-xs text-center">
              <div>
                <User size={24} className="mx-auto mb-2 opacity-30" />
                <p>Select a user to view their risk timeline</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <WidgetErrorBoundary title="Flag Distribution"><FlagDistribution /></WidgetErrorBoundary>
        <WidgetErrorBoundary title="Impossible Travel"><ImpossibleTravel /></WidgetErrorBoundary>
      </div>
    </div>
  );
}
