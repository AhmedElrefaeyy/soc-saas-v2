import { useState, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'

const FIELD_SUGGESTIONS = [
  { field: 'category:',  hint: 'auth | process | network | file | registry | dns | system' },
  { field: 'severity:',  hint: 'low | medium | high | critical' },
  { field: 'host:',      hint: 'hostname of the device' },
  { field: 'user:',      hint: 'username' },
  { field: 'process:',   hint: 'process name (e.g. powershell.exe)' },
  { field: 'src:',       hint: 'source IP address' },
  { field: 'dst:',       hint: 'destination IP address' },
  { field: 'earliest:',  hint: '1h | 6h | 24h | 7d | 30d' },
  { field: 'agent:',     hint: 'agent ID prefix' },
  { field: 'tag:',       hint: 'event tag' },
]

const VALUE_SUGGESTIONS: Record<string, string[]> = {
  'category:': ['auth', 'process', 'network', 'file', 'registry', 'dns', 'system'],
  'severity:': ['low', 'medium', 'high', 'critical'],
  'earliest:': ['1h', '6h', '24h', '7d', '30d'],
  'latest:':   ['1h', '6h', '24h'],
}

interface Props {
  value: string
  onChange: (v: string) => void
  onSearch: () => void
}

export function SearchAutocomplete({ value, onChange, onSearch }: Props) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [hint, setHint] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const lastToken = value.split(' ').pop() ?? ''

    if (!lastToken.includes(':')) {
      const matching = FIELD_SUGGESTIONS
        .filter(s => s.field.startsWith(lastToken) && lastToken.length > 0)
        .map(s => s.field)
      setSuggestions(matching)
      setHint('')
      setShowSuggestions(matching.length > 0)
      return
    }

    const fieldWithColon = lastToken.slice(0, lastToken.lastIndexOf(':') + 1)
    const afterColon = lastToken.slice(lastToken.lastIndexOf(':') + 1)

    const fieldSugg = FIELD_SUGGESTIONS.find(s => s.field === fieldWithColon)
    setHint(fieldSugg?.hint ?? '')

    const valueSuggs = VALUE_SUGGESTIONS[fieldWithColon] ?? []
    const filtered = valueSuggs.filter(v => v.startsWith(afterColon.toLowerCase()))
    setSuggestions(filtered.map(v => fieldWithColon + v))
    setShowSuggestions(filtered.length > 0)
  }, [value])

  const applySuggestion = (sug: string) => {
    const parts = value.split(' ')
    parts[parts.length - 1] = sug
    const newVal = parts.join(' ') + (sug.endsWith(':') ? '' : ' ')
    onChange(newVal)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{
          position: 'absolute', left: 10, top: '50%',
          transform: 'translateY(-50%)',
          color: '#5C6373', pointerEvents: 'none',
        }} />
        <input
          ref={inputRef}
          className="inp"
          style={{
            width: '100%', paddingLeft: 32,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
          }}
          placeholder="Search events... (e.g. category:auth severity:high earliest:24h)"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { onSearch(); setShowSuggestions(false) }
            if (e.key === 'Escape') setShowSuggestions(false)
          }}
          onFocus={() => value.length > 0 && setShowSuggestions(suggestions.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        />
      </div>

      {hint && (
        <div style={{ fontSize: 10, color: '#3A4150', marginTop: 3, paddingLeft: 2 }}>
          {hint}
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#111318',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6, marginTop: 4,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}>
          {suggestions.map(sug => (
            <div
              key={sug}
              onMouseDown={() => applySuggestion(sug)}
              style={{
                padding: '7px 12px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12, color: '#B8C0CC',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {sug}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
