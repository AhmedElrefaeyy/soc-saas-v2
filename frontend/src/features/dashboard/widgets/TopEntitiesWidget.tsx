import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Monitor, User, Globe } from "lucide-react";
import { apiClient } from "@/api/client";
import type { DashboardTimeRange } from "../types/dashboard";

// GET /dashboard/top-entities — returns top hosts, users, IPs by alert count
interface TopEntity {
  name: string;
  count: number;
  severity_max: string;
}

interface TopEntitiesData {
  hosts: TopEntity[];
  users: TopEntity[];
  ips:   TopEntity[];
}

const SEV_COLORS: Record<string, string> = {
  critical: "#EF4444", high: "#F97316", medium: "#F59E0B", low: "#6B7280",
};

function EntityList({
  label,
  icon: Icon,
  items,
  onNavigate,
}: {
  label: string;
  icon: React.ElementType;
  items: TopEntity[];
  onNavigate: (name: string) => void;
}) {
  const max = Math.max(1, ...items.map((e) => e.count));

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={11} className="text-text-muted" />
        <span className="text-2xs font-bold uppercase tracking-widest text-text-muted">{label}</span>
      </div>
      <div className="space-y-1">
        {items.slice(0, 10).map((e) => (
          <button
            key={e.name}
            onClick={() => onNavigate(e.name)}
            className="flex items-center gap-2 w-full group"
          >
            <span className="text-xs text-text-secondary font-mono truncate w-32 text-left group-hover:text-text-primary transition-colors">
              {e.name}
            </span>
            <div className="flex-1 bg-bg-elevated rounded-full h-1">
              <div
                className="h-1 rounded-full transition-all"
                style={{ width: `${(e.count / max) * 100}%`, background: SEV_COLORS[e.severity_max] ?? "#6B7280" }}
              />
            </div>
            <span className="text-2xs font-mono text-text-muted w-8 text-right">{e.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface Props {
  timeRange: DashboardTimeRange;
}

export function TopEntitiesWidget({ timeRange }: Props) {
  const navigate = useNavigate();
  void timeRange;

  const { data, isLoading } = useQuery({
    // TODO: wire to /dashboard/top-entities?timeRange={timeRange}
    queryKey: ["dashboard", "top-entities", timeRange],
    queryFn: () =>
      apiClient.get<TopEntitiesData>(`/dashboard/top-entities?timeRange=${timeRange}`).then((r) => r.data),
    staleTime: 120_000,
  });

  const SAMPLE: TopEntitiesData = {
    hosts: [
      { name: "DESKTOP-01",  count: 12, severity_max: "critical" },
      { name: "SERVER-DB01", count: 8,  severity_max: "high"     },
      { name: "LAPTOP-05",   count: 5,  severity_max: "medium"   },
    ],
    users: [
      { name: "jsmith",   count: 9, severity_max: "high"   },
      { name: "admin",    count: 6, severity_max: "critical" },
      { name: "svc_etl",  count: 4, severity_max: "medium" },
    ],
    ips: [
      { name: "192.168.1.101", count: 15, severity_max: "critical" },
      { name: "10.0.0.55",     count: 7,  severity_max: "high"     },
      { name: "172.16.8.22",   count: 4,  severity_max: "medium"   },
    ],
  };

  const display = data ?? SAMPLE;

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">Top 10 by Alert Volume</h3>
      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="skel h-24 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <EntityList
            label="Hosts" icon={Monitor} items={display.hosts}
            onNavigate={(n) => navigate(`/alerts?hostname=${n}`)}
          />
          <EntityList
            label="Users" icon={User} items={display.users}
            onNavigate={(n) => navigate(`/alerts?username=${n}`)}
          />
          <EntityList
            label="IPs" icon={Globe} items={display.ips}
            onNavigate={(n) => navigate(`/alerts?source_ip=${n}`)}
          />
        </div>
      )}
    </div>
  );
}
