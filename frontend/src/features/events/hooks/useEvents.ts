import { useQuery } from '@tanstack/react-query'
import { eventsApi, type EventSearchRequest } from '@/api/events'
import { severityToInt } from '@/api/events'

export interface UseEventsParams {
  // Legacy individual params (backward compatible)
  query?: string
  category?: string
  severity?: string
  host_name?: string
  agent_id?: string
  cursor?: string | null
  limit?: number
  // New: full parsed search request — takes priority over individual params
  searchRequest?: Partial<EventSearchRequest>
}

export function useEvents(params?: UseEventsParams) {
  return useQuery({
    queryKey: ['events', params],
    queryFn: async () => {
      const sr = params?.searchRequest
      const hasSR = sr && Object.keys(sr).length > 0

      const body: EventSearchRequest = hasSR
        ? {
            ...sr,
            // Merge URL-param agent_id with any agent_ids from the SPL query
            agent_ids: params?.agent_id
              ? Array.from(new Set([params.agent_id, ...(sr.agent_ids ?? [])]))
              : sr.agent_ids,
            cursor:   params?.cursor ?? sr.cursor ?? null,
            limit:    params?.limit  ?? sr.limit  ?? 50,
            sort_dir: 'desc',
            sort_by:  'event_timestamp',
          }
        : {
            query:        params?.query    || undefined,
            categories:   params?.category ? [params.category] : undefined,
            severity_min: params?.severity ? severityToInt(params.severity) : undefined,
            host_names:   params?.host_name ? [params.host_name] : undefined,
            agent_ids:    params?.agent_id  ? [params.agent_id]  : undefined,
            cursor:       params?.cursor ?? null,
            limit:        params?.limit  ?? 50,
            sort_dir:     'desc',
            sort_by:      'event_timestamp',
          }

      const resp = await eventsApi.search(body)
      return resp.data
    },
    staleTime: 10_000,
  })
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const resp = await eventsApi.get(id)
      return resp.data.data
    },
    enabled: !!id,
  })
}
