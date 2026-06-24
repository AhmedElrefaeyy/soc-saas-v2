import { apiClient } from "./client";

export type TicketProvider = "jira" | "servicenow" | "pagerduty";

export interface TicketFields {
  summary: string;
  description: string;
  severity: string;
  assignee?: string;
  project_key?: string;
  priority?: string;
}

export interface CreateTicketPayload {
  provider: TicketProvider;
  investigation_id: string;
  fields: TicketFields;
}

export interface Ticket {
  id: string;
  provider: TicketProvider;
  ticket_key: string;
  url: string;
  created_at: string;
}

export interface TicketingConfig {
  provider: TicketProvider;
  api_token: string;
  base_url: string;
  project_key?: string;
  default_assignee?: string;
  enabled: boolean;
}

export const ticketingApi = {
  createTicket: (payload: CreateTicketPayload) =>
    apiClient.post<Ticket>("/integrations/tickets", payload).then((r) => r.data),

  getTicketsForInvestigation: (invId: string) =>
    apiClient.get<Ticket[]>(`/integrations/tickets?investigation_id=${invId}`).then((r) => r.data),

  getConfig: (provider: TicketProvider) =>
    apiClient.get<TicketingConfig>(`/integrations/config/${provider}`).then((r) => r.data),

  saveConfig: (config: TicketingConfig) =>
    apiClient.put<TicketingConfig>(`/integrations/config/${config.provider}`, config).then((r) => r.data),

  getAllConfigs: () =>
    apiClient.get<TicketingConfig[]>("/integrations/config").then((r) => r.data),
};
