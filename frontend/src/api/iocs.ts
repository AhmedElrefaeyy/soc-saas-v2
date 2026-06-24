import { apiClient } from "./client";

export interface IOCEnrichment {
  indicator: string;
  type: "ip" | "domain" | "hash" | "url";
  vt_malicious?: number;
  vt_suspicious?: number;
  vt_total?: number;
  vt_verdict?: "malicious" | "suspicious" | "clean" | "unknown";
  abuseipdb_confidence?: number;
  abuseipdb_country?: string;
  first_seen?: string;
  last_seen?: string;
  tags?: string[];
}

export interface InvestigationIOCsResponse {
  ips: IOCEnrichment[];
  domains: IOCEnrichment[];
  hashes: IOCEnrichment[];
  processes: IOCEnrichment[];
  raw_count: number;
}

export const iocsApi = {
  getForInvestigation: (invId: string) =>
    apiClient.get<InvestigationIOCsResponse>(`/investigations/${invId}/iocs`).then((r) => r.data),

  enrich: (indicator: string, type: string) =>
    apiClient.post<IOCEnrichment>("/iocs/enrich", { indicator, type }).then((r) => r.data),
};
