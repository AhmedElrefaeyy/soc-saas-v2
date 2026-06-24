import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { installerApi } from "@/api/installer";
import { useTenantStore } from "@/stores/tenantStore";
import type {
  InstallerTokenStatus,
  GenerateTokenRequest,
  RevokeTokenRequest,
} from "@/types/installer";

const QUERY_KEY = "installer-tokens";

export function useInstallerTokens(
  page: number,
  limit: number,
  statusFilter: InstallerTokenStatus | "all",
) {
  const tenantId = useTenantStore((s) => s.activeTenant?.id)
  return useQuery({
    queryKey: [QUERY_KEY, tenantId, page, limit, statusFilter],
    queryFn: () =>
      installerApi.list({
        page,
        limit,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
    enabled: !!tenantId,
    // Poll every 10s — catches PENDING → INSTALLING → ACTIVE transitions
    // that happen while the user is watching the enrollment progress.
    refetchInterval: 10_000,
  });
}

export function useGenerateToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateTokenRequest) => installerApi.generate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useRevokeToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RevokeTokenRequest }) =>
      installerApi.revoke(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
