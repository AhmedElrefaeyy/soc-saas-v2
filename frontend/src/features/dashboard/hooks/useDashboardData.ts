import { useQuery } from "@tanstack/react-query";
import * as dashboardApi from "@/services/dashboardApi";
import type { DashboardTimeRange } from "@/features/dashboard/types/dashboard";
import { useTenantStore } from "@/stores/tenantStore";

// ─── Query key factory ────────────────────────────────────────────────────────

export const dashboardKeys = {
  all:              (tid: string) => ["dashboard", tid] as const,
  summary:          (tid: string, tr: DashboardTimeRange) => ["dashboard", tid, "summary", tr] as const,
  ingestionRate:    (tid: string, tr: DashboardTimeRange) => ["dashboard", tid, "ingestion-rate", tr] as const,
  alertsFeed:       (tid: string, tr: DashboardTimeRange) => ["dashboard", tid, "alerts-feed", tr] as const,
  detectionHealth:  (tid: string, tr: DashboardTimeRange) => ["dashboard", tid, "detection-health", tr] as const,
  mitreCoverage:    (tid: string, tr: DashboardTimeRange) => ["dashboard", tid, "mitre-coverage", tr] as const,
  correlation:      (tid: string, tr: DashboardTimeRange) => ["dashboard", tid, "correlation", tr] as const,
  aiOperations:     (tid: string, tr: DashboardTimeRange) => ["dashboard", tid, "ai-operations", tr] as const,
};

// ─── KPI summary ──────────────────────────────────────────────────────────────

export function useKPISummary(timeRange: DashboardTimeRange) {
  const tenantId = useTenantStore((s) => s.activeTenant?.id) ?? ""
  return useQuery({
    queryKey: dashboardKeys.summary(tenantId, timeRange),
    queryFn: () => dashboardApi.getDashboardSummary({ timeRange }),
    enabled: !!tenantId,
    staleTime: 30_000,
    refetchInterval: 60_000,
    placeholderData: dashboardApi.PLACEHOLDER_SUMMARY,
    retry: 2,
  });
}

// ─── Ingestion rate chart ─────────────────────────────────────────────────────

export function useIngestionRate(timeRange: DashboardTimeRange) {
  const tenantId = useTenantStore((s) => s.activeTenant?.id) ?? ""
  return useQuery({
    queryKey: dashboardKeys.ingestionRate(tenantId, timeRange),
    queryFn: () => dashboardApi.getIngestionRate({ timeRange }),
    enabled: !!tenantId,
    staleTime: 15_000,
    refetchInterval: 30_000,
    placeholderData: () => dashboardApi.buildPlaceholderIngestionSeries(
      timeRange === "last_15m" ? 15 : timeRange === "last_1h" ? 30 : 48
    ),
    retry: 1,
  });
}

// ─── Live alerts feed ─────────────────────────────────────────────────────────

export function useAlertsFeed(timeRange: DashboardTimeRange) {
  const tenantId = useTenantStore((s) => s.activeTenant?.id) ?? ""
  return useQuery({
    queryKey: dashboardKeys.alertsFeed(tenantId, timeRange),
    queryFn: () => dashboardApi.getAlertsFeed({ timeRange, limit: 100 }),
    enabled: !!tenantId,
    staleTime: 15_000,
    refetchInterval: 20_000,
    placeholderData: [],
    retry: 1,
  });
}

// ─── Detection health ─────────────────────────────────────────────────────────

export function useDetectionHealth(timeRange: DashboardTimeRange) {
  const tenantId = useTenantStore((s) => s.activeTenant?.id) ?? ""
  return useQuery({
    queryKey: dashboardKeys.detectionHealth(tenantId, timeRange),
    queryFn: () => dashboardApi.getDetectionHealth({ timeRange }),
    enabled: !!tenantId,
    staleTime: 60_000,
    refetchInterval: 120_000,
    placeholderData: dashboardApi.PLACEHOLDER_DETECTION_HEALTH,
    retry: 1,
  });
}

// ─── MITRE coverage ───────────────────────────────────────────────────────────

export function useMitreCoverage(timeRange: DashboardTimeRange) {
  const tenantId = useTenantStore((s) => s.activeTenant?.id) ?? ""
  return useQuery({
    queryKey: dashboardKeys.mitreCoverage(tenantId, timeRange),
    queryFn: () => dashboardApi.getMitreCoverage({ timeRange }),
    enabled: !!tenantId,
    staleTime: 60_000,
    refetchInterval: 300_000,
    placeholderData: dashboardApi.PLACEHOLDER_MITRE_COVERAGE,
    retry: 1,
  });
}

// ─── Correlation activity ─────────────────────────────────────────────────────

export function useCorrelationActivity(timeRange: DashboardTimeRange) {
  const tenantId = useTenantStore((s) => s.activeTenant?.id) ?? ""
  return useQuery({
    queryKey: dashboardKeys.correlation(tenantId, timeRange),
    queryFn: () => dashboardApi.getCorrelationActivity({ timeRange }),
    enabled: !!tenantId,
    staleTime: 30_000,
    refetchInterval: 60_000,
    placeholderData: dashboardApi.PLACEHOLDER_CORRELATION,
    retry: 1,
  });
}

// ─── AI operations ────────────────────────────────────────────────────────────

export function useAIOperations(timeRange: DashboardTimeRange) {
  const tenantId = useTenantStore((s) => s.activeTenant?.id) ?? ""
  return useQuery({
    queryKey: dashboardKeys.aiOperations(tenantId, timeRange),
    queryFn: () => dashboardApi.getAIOperations({ timeRange }),
    enabled: !!tenantId,
    staleTime: 30_000,
    refetchInterval: 60_000,
    placeholderData: dashboardApi.PLACEHOLDER_AI_OPS,
    retry: 1,
  });
}
