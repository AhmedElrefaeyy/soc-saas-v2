import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWSManager } from "@/websocket/WSProvider";
import { alertsKeys } from "./useAlerts";
import { useTenantStore } from "@/stores/tenantStore";
import type { Alert, AlertListResponse } from "@/features/alerts/types";

interface UseAlertsRealtimeOptions {
  onNewAlert?: (alert: Alert) => void;
}

export function useAlertsRealtime({ onNewAlert }: UseAlertsRealtimeOptions = {}) {
  const ws = useWSManager();
  const qc = useQueryClient();
  const onNewAlertRef = useRef(onNewAlert);
  onNewAlertRef.current = onNewAlert;

  useEffect(() => {
    // New alert created — prepend to first page, update total count
    const offCreated = ws.on<Alert>("alert.created", (event) => {
      const alert = event.payload;
      // Read tenant at event time to avoid stale closure if user switched workspace
      const tenantId = useTenantStore.getState().activeTenant?.id ?? ""

      qc.setQueriesData<AlertListResponse>(
        { queryKey: alertsKeys.lists(tenantId) },
        (prev) => {
          if (!prev) return prev;
          const alreadyExists = prev.items.some((a) => a.id === alert.id);
          if (alreadyExists) return prev;
          return {
            ...prev,
            total: prev.total + 1,
            items: [alert, ...prev.items],
          };
        }
      );

      onNewAlertRef.current?.(alert);
    });

    // Alert updated (status change, assignment, AI verdict) — patch in-place
    const offUpdated = ws.on<Alert>("alert.updated", (event) => {
      const updated = event.payload;
      const tenantId = useTenantStore.getState().activeTenant?.id ?? ""

      qc.setQueriesData<AlertListResponse>(
        { queryKey: alertsKeys.lists(tenantId) },
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((a) => (a.id === updated.id ? updated : a)),
          };
        }
      );

      // Also patch detail cache if this alert is open in a drawer
      qc.setQueryData<Alert>(alertsKeys.detail(tenantId, updated.id), (prev) =>
        prev ? { ...prev, ...updated } : prev
      );
    });

    // Investigation created — invalidate context for any open alert
    const offInv = ws.on("investigation.created", () => {
      const tenantId = useTenantStore.getState().activeTenant?.id ?? ""
      void qc.invalidateQueries({ queryKey: [...alertsKeys.all(tenantId), "context"] });
    });

    return () => {
      offCreated();
      offUpdated();
      offInv();
    };
  }, [ws, qc]);
}
