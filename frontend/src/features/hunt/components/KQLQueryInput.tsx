import { useState, useRef, useEffect, useCallback } from "react";
import { Search, AlertCircle, CheckCircle } from "lucide-react";
import { parseKQL } from "../lib/kqlParser";
import { cn } from "@/lib/utils";

// ─── Field autocomplete suggestions ──────────────────────────────────────────

const FIELD_SUGGESTIONS = [
  "host_name", "username", "process_name", "source_ip", "dest_ip",
  "geo_country", "correlation_id", "severity", "threat_score",
  "status", "verdict", "confidence", "title", "mitre_technique",
];

const OPERATOR_SUGGESTIONS = [":", ">", "<", ">=", "<=", "="];
const KEYWORD_SUGGESTIONS  = ["AND", "OR", "NOT"];

function getSuggestions(input: string, cursorPos: number): string[] {
  const before = input.slice(0, cursorPos);
  const lastWord = before.match(/[\w.*]+$/) ?? [""];
  const prefix = lastWord[0] ?? "";
  if (!prefix) return [];

  const allSuggestions = [...FIELD_SUGGESTIONS, ...KEYWORD_SUGGESTIONS];
  return allSuggestions.filter((s) => s.toLowerCase().startsWith(prefix.toLowerCase()) && s !== prefix).slice(0, 6);
}

// ─── Syntax highlighting ──────────────────────────────────────────────────────

function highlight(input: string): string {
  // Simple token coloring via spans — applied to a mirror div
  return input
    .replace(/\b(AND|OR|NOT)\b/g, '<span class="kql-kw">$1</span>')
    .replace(/([a-zA-Z_][a-zA-Z0-9_.]*)\s*(:)/g, '<span class="kql-field">$1</span><span class="kql-op">$2</span>')
    .replace(/(\*[^*\s]*\*|"[^"]*")/g, '<span class="kql-value">$1</span>');
}

// ─── KQLQueryInput ────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function KQLQueryInput({ value, onChange, onSubmit, placeholder, className }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSug, setSelectedSug] = useState(-1);
  const [showSug, setShowSug]         = useState(false);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  const { errors } = parseKQL(value);
  const hasError   = errors.length > 0 && value.trim().length > 3;

  // Sync mirror div
  useEffect(() => {
    if (mirrorRef.current) {
      mirrorRef.current.innerHTML = highlight(value.replace(/\n/g, "<br/>")) || "&nbsp;";
    }
  }, [value]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    onChange(v);

    const cursor = e.target.selectionStart ?? 0;
    const sugs   = getSuggestions(v, cursor);
    setSuggestions(sugs);
    setShowSug(sugs.length > 0);
    setSelectedSug(-1);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSug && suggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedSug((s) => Math.min(s + 1, suggestions.length - 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelectedSug((s) => Math.max(s - 1, -1)); return; }
      if ((e.key === "Tab" || e.key === "Enter") && selectedSug >= 0) {
        e.preventDefault();
        const sug = suggestions[selectedSug]!;
        const cursor = inputRef.current?.selectionStart ?? value.length;
        const before  = value.slice(0, cursor);
        const after   = value.slice(cursor);
        const lastWordMatch = before.match(/([\w.*]*)$/);
        const lastWord = lastWordMatch?.[0] ?? "";
        const newVal = before.slice(0, before.length - lastWord.length) + sug + (FIELD_SUGGESTIONS.includes(sug) ? ":" : " ") + after;
        onChange(newVal);
        setShowSug(false);
        return;
      }
      if (e.key === "Escape") { setShowSug(false); return; }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) { onSubmit(value.trim()); setShowSug(false); }
    }
  }, [showSug, suggestions, selectedSug, value, onChange, onSubmit]);

  const applySuggestion = (sug: string) => {
    const cursor = inputRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const after  = value.slice(cursor);
    const lastWordMatch = before.match(/([\w.*]*)$/);
    const lastWord = lastWordMatch?.[0] ?? "";
    const newVal = before.slice(0, before.length - lastWord.length) + sug + (FIELD_SUGGESTIONS.includes(sug) ? ":" : " ") + after;
    onChange(newVal);
    setShowSug(false);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      {/* Status icon */}
      <div className="absolute left-3 top-2.5 text-text-muted pointer-events-none z-10">
        {value ? (
          hasError
            ? <AlertCircle size={14} className="text-severity-medium" />
            : <CheckCircle size={14} className="text-status-ok" />
        ) : <Search size={14} />}
      </div>

      {/* Syntax highlight mirror (sits behind textarea, same size) */}
      <div
        ref={mirrorRef}
        aria-hidden="true"
        className="absolute inset-0 pl-9 pr-16 pt-2 pb-2 text-sm font-mono leading-5 pointer-events-none overflow-hidden whitespace-pre-wrap break-words text-transparent kql-mirror"
      />

      <textarea
        ref={inputRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowSug(false), 150)}
        rows={1}
        placeholder={placeholder ?? "host_name:DESKTOP-01 AND severity:>2"}
        className={cn(
          "w-full pl-9 pr-16 py-2 rounded-xl border text-sm font-mono leading-5 resize-none",
          "bg-bg-elevated border-border text-text-primary placeholder:text-text-disabled",
          "focus:outline-none focus:ring-1 focus:ring-accent transition-colors",
          hasError && "border-severity-medium/60",
        )}
        style={{ minHeight: 40, maxHeight: 120 }}
      />

      {/* Run button */}
      <button
        type="button"
        onClick={() => value.trim() && onSubmit(value.trim())}
        className="absolute right-2 top-1.5 px-2 py-1 rounded-md bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors"
      >
        Run
      </button>

      {/* Error hint */}
      {hasError && (
        <p className="mt-1 text-2xs text-severity-medium pl-1">
          {errors[0]!.message} (pos {errors[0]!.position})
        </p>
      )}

      {/* Autocomplete dropdown */}
      {showSug && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 z-30 bg-bg-card border border-border rounded-xl shadow-elevated overflow-hidden">
          {suggestions.map((s, i) => (
            <li key={s}>
              <button
                onMouseDown={(e) => { e.preventDefault(); applySuggestion(s); }}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs font-mono text-text-secondary hover:bg-bg-elevated transition-colors",
                  i === selectedSug && "bg-bg-elevated text-text-primary",
                )}
              >
                {s}
                {OPERATOR_SUGGESTIONS.includes(s) && <span className="ml-2 text-text-muted">operator</span>}
                {FIELD_SUGGESTIONS.includes(s)    && <span className="ml-2 text-text-muted">field</span>}
                {KEYWORD_SUGGESTIONS.includes(s)  && <span className="ml-2 text-text-muted">keyword</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
