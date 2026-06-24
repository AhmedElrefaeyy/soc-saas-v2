import { apiClient } from "./client";

export type SuppressionDuration = "1h" | "4h" | "24h" | "7d" | "30d" | "indefinite";
export type SuppressionReason = "testing" | "known_good" | "noisy_rule" | "maintenance_window" | "other";

export interface SuppressionCondition {
  field: "hostname_glob" | "username_glob" | "rule_name_contains" | "source_ip_cidr" | "mitre_technique";
  value: string;
}

export interface SuppressionRule {
  id: string;
  name: string;
  conditions: SuppressionCondition[];
  duration: SuppressionDuration;
  reason: SuppressionReason;
  notes: string;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  alert_count: number;
  status: "active" | "expired";
}

export interface CreateSuppressionPayload {
  name: string;
  conditions: SuppressionCondition[];
  duration: SuppressionDuration;
  reason: SuppressionReason;
  notes?: string;
}

export const suppressionApi = {
  list: () =>
    apiClient.get<SuppressionRule[]>("/rules/suppression").then((r) => r.data),

  create: (payload: CreateSuppressionPayload) =>
    apiClient.post<SuppressionRule>("/rules/suppression", payload).then((r) => r.data),

  update: (id: string, payload: Partial<CreateSuppressionPayload>) =>
    apiClient.patch<SuppressionRule>(`/rules/suppression/${id}`, payload).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/rules/suppression/${id}`).then((r) => r.data),
};
