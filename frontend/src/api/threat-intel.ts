import { apiClient } from "./client";

export type FeedType = "stix_taxii" | "csv" | "opencti" | "misp" | "manual";
export type FeedStatus = "active" | "error" | "syncing";
export type IOCType = "ip" | "domain" | "hash" | "url" | "email";

export interface ThreatFeed {
  id: string;
  name: string;
  type: FeedType;
  endpoint_url?: string;
  last_updated: string | null;
  ioc_count: number;
  status: FeedStatus;
  error_message?: string;
  sync_interval_minutes: number;
}

export interface CreateFeedPayload {
  name: string;
  type: FeedType;
  endpoint_url?: string;
  api_key?: string;
  sync_interval_minutes?: number;
}

export interface ThreatIOC {
  id: string;
  indicator: string;
  type: IOCType;
  confidence: number;
  source_feed_id: string;
  source_feed_name: string;
  first_seen: string;
  last_seen: string;
  hit_count: number;
  tags: string[];
}

export interface IOCMatch {
  ioc_id: string;
  indicator: string;
  type: IOCType;
  alert_id?: string;
  alert_title?: string;
  event_id?: string;
  matched_at: string;
}

export interface IOCListResponse {
  items: ThreatIOC[];
  total: number;
  page: number;
}

export const threatIntelApi = {
  listFeeds: () =>
    apiClient.get<ThreatFeed[]>("/threat-intel/feeds").then((r) => r.data),

  createFeed: (payload: CreateFeedPayload) =>
    apiClient.post<ThreatFeed>("/threat-intel/feeds", payload).then((r) => r.data),

  deleteFeed: (id: string) =>
    apiClient.delete(`/threat-intel/feeds/${id}`).then((r) => r.data),

  syncFeed: (id: string) =>
    apiClient.post(`/threat-intel/feeds/${id}/sync`).then((r) => r.data),

  listIOCs: (params: { page?: number; search?: string; type?: IOCType; feedId?: string }) =>
    apiClient.get<IOCListResponse>("/threat-intel/iocs", { params: {
      page:    params.page ?? 1,
      search:  params.search,
      type:    params.type,
      feed_id: params.feedId,
    }}).then((r) => r.data),

  importIOCs: (formData: FormData) =>
    apiClient.post<{ imported: number }>("/threat-intel/iocs/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),

  listMatches: () =>
    apiClient.get<IOCMatch[]>("/threat-intel/matches").then((r) => r.data),
};
