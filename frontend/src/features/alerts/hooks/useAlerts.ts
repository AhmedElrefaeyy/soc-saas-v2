import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAlerts,
  getAlertDetail,
  getAlertContext,
  getAlertTimeline,
  getAlertsSummary,
  PLACEHOLDER_ALERT_LIST,
} from "@/services/alertsApi";
import type { AlertListParams, AlertListResponse } from "@/features/alerts/types";
import { useTenantStore } from "@/stores/tenantStore";

// ─── Query key factory ────────────────────────────────────────────────────────

export const alertsKeys = {
  all:     (tenantId: string) => ["alerts", tenantId] as const,
  lists:   (tenantId: string) => [...alertsKeys.all(tenantId), "list"] as const,
  list:    (tenantId: string, params: AlertListParams) => [...alertsKeys.lists(tenantId), params] as const,
  detail:  (tenantId: string, id: string) => [...alertsKeys.all(tenantId), "detail", id] as const,
  context: (tenantId: string, id: string) => [...alertsKeys.all(tenantId), "context", id] as const,
  timeline:(tenantId: string, id: string) => [...alertsKeys.all(tenantId), "timeline", id] as const,
  summary: (tenantId: string) => [...alertsKeys.all(tenantId), "summary"] as const,
};

// ─── Alert list (paginated, filterable) ───────────────────────────────────────

export function useAlertsList(params: AlertListParams) {
  const tenantId = useTenantStore((s) => s.activeTenant?.id) ?? ""
  return useQuery({
    queryKey: alertsKeys.list(tenantId, params),
    queryFn: () => getAlerts(params),
    enabled: !!tenantId,
    placeholderData: (prev: AlertListResponse | undefined) => prev ?? PLACEHOLDER_ALERT_LIST,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

// ─── Single alert detail ──────────────────────────────────────────────────────

export function useAlertDetail(alertId: string | null) {
  const tenantId = useTenantStore((s) => s.activeTenant?.id) ?? ""
  return useQuery({
    queryKey: alertsKeys.detail(tenantId, alertId ?? ""),
    queryFn: () => getAlertDetail(alertId!),
    enabled: !!alertId && !!tenantId,
    staleTime: 10_000,
  });
}

// ─── Alert investigation context ──────────────────────────────────────────────

export function useAlertContext(alertId: string | null) {
  const tenantId = useTenantStore((s) => s.activeTenant?.id) ?? ""
  return useQuery({
    queryKey: alertsKeys.context(tenantId, alertId ?? ""),
    queryFn: () => getAlertContext(alertId!),
    enabled: !!alertId && !!tenantId,
    staleTime: 30_000,
  });
}

// ─── Alert timeline ───────────────────────────────────────────────────────────

export function useAlertTimeline(alertId: string | null) {
  const tenantId = useTenantStore((s) => s.activeTenant?.id) ?? ""
  return useQuery({
    queryKey: alertsKeys.timeline(tenantId, alertId ?? ""),
    queryFn: () => getAlertTimeline(alertId!),
    enabled: !!alertId && !!tenantId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

// ─── Alert status summary (single query replacing 4 per-status queries) ──────

export function useAlertsSummary() {
  const tenantId = useTenantStore((s) => s.activeTenant?.id) ?? "";
  return useQuery({
    queryKey: alertsKeys.summary(tenantId),
    queryFn:  getAlertsSummary,
    enabled:  !!tenantId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

// ─── Prefetch next page ───────────────────────────────────────────────────────

export function usePrefetchAlerts(params: AlertListParams) {
  const qc = useQueryClient();
  const tenantId = useTenantStore((s) => s.activeTenant?.id) ?? ""
  return () => {
    if (!tenantId) return
    const nextParams = { ...params, page: (params.page ?? 1) + 1 };
    void qc.prefetchQuery({
      queryKey: alertsKeys.list(tenantId, nextParams),
      queryFn: () => getAlerts(nextParams),
      staleTime: 15_000,
    });
  };
}
