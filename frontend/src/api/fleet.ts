import { apiClient } from "./client";

export interface FleetAgent {
  agent_id: string;
  hostname: string;
  os_type: string;
  os_version: string;
  agent_version: string;
  status: "online" | "offline" | "stale";
  last_seen: string;
  ip_address: string;
  lat?: number;
  lng?: number;
  country?: string;
  open_alert_count: number;
  critical_alert_count: number;
  risk_score: number;
  tags: string[];
  tenant_id: string;
  enrolled_at: string;
  update_available: boolean;
}

export interface FleetStats {
  total: number;
  online: number;
  offline: number;
  stale: number;
  online_pct: number;
  critical_alerts_active: number;
  agents_need_update: number;
}

export interface FleetListResponse {
  agents: FleetAgent[];
  stats: FleetStats;
  total: number;
  page: number;
}

export interface VersionDistribution {
  version: string;
  count: number;
}

export interface HeartbeatDistribution {
  bucket: string;
  label: string;
  count: number;
}

export const fleetApi = {
  list: (params?: { page?: number; status?: string; os?: string; search?: string; tag?: string }) =>
    apiClient.get<FleetListResponse>("/fleet/agents", { params }).then((r) => r.data),

  getStats: () =>
    apiClient.get<FleetStats>("/fleet/stats").then((r) => r.data),

  getVersionDistribution: () =>
    apiClient.get<VersionDistribution[]>("/fleet/version-distribution").then((r) => r.data),

  getHeartbeatDistribution: () =>
    apiClient.get<HeartbeatDistribution[]>("/fleet/heartbeat-distribution").then((r) => r.data),

  bulkUpdate: (agentIds: string[]) =>
    apiClient.post("/fleet/bulk-update", { agent_ids: agentIds }).then((r) => r.data),

  forceReinstall: (agentIds: string[]) =>
    apiClient.post("/fleet/bulk-reinstall", { agent_ids: agentIds }).then((r) => r.data),
};
