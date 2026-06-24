import { apiClient } from "./client";

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor_name: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  resource_title: string;
  old_value: unknown;
  new_value: unknown;
  ip_address: string;
}

export interface AuditListResponse {
  events: AuditEvent[];
  total: number;
  page: number;
  page_size: number;
}

export const auditApi = {
  list: (params: { page?: number; pageSize?: number; actor?: string; action?: string; resourceType?: string; from?: string; to?: string }) =>
    apiClient.get<AuditListResponse>("/audit/events", { params: {
      page:      params.page ?? 1,
      page_size: params.pageSize ?? 50,
      actor:     params.actor,
      action:    params.action,
      resource_type: params.resourceType,
      from:      params.from,
      to:        params.to,
    }}).then((r) => r.data),

  exportCsv: (params: { actor?: string; action?: string; resourceType?: string; from?: string; to?: string }) =>
    apiClient.get<Blob>("/audit/events/export", { params, responseType: "blob" }).then((r) => r.data),
};
