import type { EventSearchRequest } from '@/api/events'

function relativeToIso(value: string, direction: 'from' | 'to'): string | undefined {
  const match = value.match(/^(\d+)(h|d|m|w)$/)
  if (!match) return undefined
  const unit = match[2]
  const ms = ({ h: parseInt(match[1]) * 3600_000, d: parseInt(match[1]) * 86400_000, m: parseInt(match[1]) * 60_000, w: parseInt(match[1]) * 604800_000 } as Record<string, number>)[unit] ?? 0
  const date = direction === 'from' ? new Date(Date.now() - ms) : new Date()
  return date.toISOString()
}

function severityToInt(s: string): number {
  return ({ critical: 4, crit: 4, high: 3, medium: 2, med: 2, low: 1 } as Record<string, number>)[s.toLowerCase()] ?? 0
}

export function parseSearchQuery(input: string): Partial<EventSearchRequest> {
  const result: Partial<EventSearchRequest> = {}
  const freeTextParts: string[] = []

  // Tokenize — handle quoted strings
  const tokens: string[] = []
  const regex = /(?:[^\s"]+|"[^"]*")+/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(input)) !== null) {
    tokens.push(m[0].replace(/^"|"$/g, ''))
  }

  for (const token of tokens) {
    const colonIdx = token.indexOf(':')
    if (colonIdx === -1) {
      freeTextParts.push(token)
      continue
    }

    const field = token.slice(0, colonIdx).toLowerCase()
    const value = token.slice(colonIdx + 1)
    if (!value) continue

    switch (field) {
      case 'category': case 'cat': case 'type':
        result.categories = [...(result.categories ?? []), value]
        break

      case 'severity': case 'sev': case 'level': {
        const n = severityToInt(value)
        if (n > 0) result.severity_min = n
        break
      }

      case 'host': case 'hostname': case 'device':
        result.host_names = [...(result.host_names ?? []), value]
        break

      case 'user': case 'username': case 'usr':
        result.usernames = [...(result.usernames ?? []), value]
        break

      case 'process': case 'proc': case 'image':
        result.process_names = [...(result.process_names ?? []), value]
        break

      case 'src': case 'src_ip': case 'source': case 'ip':
        result.source_ips = [...(result.source_ips ?? []), value]
        break

      case 'dst': case 'dst_ip': case 'dest':
        result.dest_ips = [...(result.dest_ips ?? []), value]
        break

      case 'agent': case 'agent_id':
        result.agent_ids = [...(result.agent_ids ?? []), value]
        break

      case 'tag':
        result.tags = [...(result.tags ?? []), value]
        break

      case 'earliest': case 'last': {
        const iso = relativeToIso(value, 'from')
        if (iso) result.from_ts = iso
        break
      }
      case 'latest': {
        const iso = relativeToIso(value, 'to')
        if (iso) result.to_ts = iso
        break
      }

      default:
        freeTextParts.push(token)
    }
  }

  if (freeTextParts.length > 0) {
    result.query = freeTextParts.join(' ')
  }

  return result
}
