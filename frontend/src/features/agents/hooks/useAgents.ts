import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentsApi } from '@/api/agents'
import { useTenantStore } from '@/stores/tenantStore'

export function useAgents(params?: { status?: string; search?: string }) {
  const tenantId = useTenantStore((s) => s.activeTenant?.id)
  return useQuery({
    queryKey: ['agents', tenantId, params],
    queryFn: async () => {
      const resp = await agentsApi.list(params)
      return {
        items: resp.data,
        total: resp.pagination.total,
      }
    },
    enabled: !!tenantId,
    refetchInterval: 30_000,
  })
}

export function useAgent(id: string) {
  const tenantId = useTenantStore((s) => s.activeTenant?.id)
  return useQuery({
    queryKey: ['agents', tenantId, id],
    queryFn: async () => {
      const agent = await agentsApi.get(id)
      return agent
    },
    enabled: !!id && !!tenantId,
  })
}

export function useDeleteAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => agentsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  })
}

export function useQuarantineAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      agentsApi.quarantine(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] })
      qc.invalidateQueries({ queryKey: ['agent-containment'] })
    },
  })
}

export function useIsolateAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      agentsApi.isolate(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] })
      qc.invalidateQueries({ queryKey: ['agent-containment'] })
    },
  })
}

export function useReleaseAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      agentsApi.release(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] })
      qc.invalidateQueries({ queryKey: ['agent-containment'] })
    },
  })
}
