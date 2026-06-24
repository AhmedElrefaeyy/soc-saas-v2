import { apiClient } from "./client";

export interface RiskyUser {
  user_id: string;
  username: string;
  email?: string;
  department?: string;
  ueba_score: number;
  top_flags: string[];
  last_anomaly_at: string | null;
  alert_count: number;
}

export interface UEBARiskPoint {
  date: string;
  score: number;
}

export interface UEBAFlagCount {
  flag: string;
  count: number;
}

export interface ImpossibleTravelEntry {
  username: string;
  location_1: string;
  location_2: string;
  time_delta_minutes: number;
  detected_at: string;
}

export const uebaApi = {
  getTopUsers: (limit = 20) =>
    apiClient.get<RiskyUser[]>(`/ueba/top-users?limit=${limit}`).then((r) => r.data),

  getUserTimeline: (userId: string, timeRange = "30d") =>
    apiClient.get<UEBARiskPoint[]>(`/ueba/user-timeline?user_id=${userId}&timeRange=${timeRange}`).then((r) => r.data),

  getFlagDistribution: () =>
    apiClient.get<UEBAFlagCount[]>("/ueba/flag-distribution").then((r) => r.data),

  getImpossibleTravel: () =>
    apiClient.get<ImpossibleTravelEntry[]>("/ueba/impossible-travel").then((r) => r.data),
};
