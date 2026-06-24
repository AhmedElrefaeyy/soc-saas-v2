import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";

async function fetchMyAlertCount(userId: string): Promise<number> {
  try {
    const { data } = await apiClient.get<{ data: unknown[]; pagination?: { total?: number } }>(
      "/alerts",
      { params: { assignee_id: userId, status: "open", limit: 1 } }
    );
    return (data as { meta?: { total?: number }; pagination?: { total?: number } }).meta?.total
      ?? (data as { meta?: { total?: number }; pagination?: { total?: number } }).pagination?.total
      ?? 0;
  } catch {
    return 0;
  }
}

export function useMyAlertCount() {
  const userId   = useAuthStore((s) => s.user?.id);
  const tenantId = useTenantStore((s) => s.activeTenant?.id);

  return useQuery({
    queryKey: ["alerts", "mine", tenantId, userId],
    queryFn:  () => fetchMyAlertCount(userId!),
    enabled:  !!userId && !!tenantId,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
