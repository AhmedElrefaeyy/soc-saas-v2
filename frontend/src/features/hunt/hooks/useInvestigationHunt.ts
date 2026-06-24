import { useState, useCallback } from "react";
import { huntApi } from "@/api/hunt";
import type { HuntFilter, HuntResultEntry, FilterLogic } from "@/api/hunt";
import { extractApiError } from "@/lib/utils";
import { toastError } from "@/lib/toast";

// ─── Query history ─────────────────────────────────────────────────────────────

const HISTORY_KEY = "neurashield:hunt_history";
const HISTORY_MAX = 20;

export interface HuntHistoryEntry {
  id:        string;
  mode:      "investigation";
  filters:   HuntFilter[];
  tactics:   string[];
  timeRange: string;
  ts:        number;
}

export function loadHuntHistory(): Array<{ id: string; mode: string; ts: number; [key: string]: unknown }> {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as Array<{ id: string; mode: string; ts: number; [key: string]: unknown }>; }
  catch { return []; }
}

function appendInvHistory(entry: Omit<HuntHistoryEntry, "id" | "mode">) {
  const all = loadHuntHistory().filter((e) => e.mode !== "investigation" ||
    JSON.stringify(e.filters) !== JSON.stringify(entry.filters));
  const next: HuntHistoryEntry = { ...entry, id: crypto.randomUUID(), mode: "investigation" };
  localStorage.setItem(HISTORY_KEY, JSON.stringify([next, ...all].slice(0, HISTORY_MAX)));
}

const DEFAULT_FILTERS: HuntFilter[] = [
  { field: "threat_score", operator: "gte", value: "60" },
];

function getFromTs(val: string): string | null {
  const offsets: Record<string, number> = {
    "1h": 3_600_000, "24h": 86_400_000, "7d": 604_800_000, "30d": 2_592_000_000,
  };
  const ms = offsets[val];
  return ms ? new Date(Date.now() - ms).toISOString() : null;
}

export interface InvestigationHuntState {
  filters: HuntFilter[];
  mitreTactics: string[];
  results: HuntResultEntry[];
  total: number | null;
  hasMore: boolean;
  running: boolean;
  loadingMore: boolean;
  error: string | null;
  hasRun: boolean;
  setFilters: (f: HuntFilter[]) => void;
  setMitreTactics: (t: string[]) => void;
  run:            (timeRange: string, filterLogic: FilterLogic) => Promise<void>;
  loadMore:       (timeRange: string, filterLogic: FilterLogic) => Promise<void>;
  reset:          () => void;
  loadFromHistory: (entry: HuntHistoryEntry) => void;
}

export function useInvestigationHunt(): InvestigationHuntState {
  const [filters,       setFilters]       = useState<HuntFilter[]>(DEFAULT_FILTERS);
  const [mitreTactics,  setMitreTactics]  = useState<string[]>([]);
  const [results,       setResults]       = useState<HuntResultEntry[]>([]);
  const [cursor,        setCursor]        = useState<string | null>(null);
  const [hasMore,       setHasMore]       = useState(false);
  const [total,         setTotal]         = useState<number | null>(null);
  const [running,       setRunning]       = useState(false);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [hasRun,        setHasRun]        = useState(false);

  const buildQuery = useCallback((timeRange: string, filterLogic: FilterLogic, cur?: string | null) => ({
    filters:       filters.filter((f) => f.value.trim() !== ""),
    logic:         filterLogic,
    from_ts:       getFromTs(timeRange),
    to_ts:         null as null,
    mitre_tactics: mitreTactics,
    limit:         50,
    cursor:        cur ?? null,
  }), [filters, mitreTactics]);

  const run = useCallback(async (timeRange: string, filterLogic: FilterLogic) => {
    setRunning(true);
    setError(null);
    try {
      const res = await huntApi.run(buildQuery(timeRange, filterLogic));
      setResults(res.entries);
      setCursor(res.next_cursor);
      setHasMore(res.has_more);
      setTotal(res.total);
      setHasRun(true);
      appendInvHistory({ filters, tactics: mitreTactics, timeRange, ts: Date.now() });
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setRunning(false);
    }
  }, [buildQuery, filters, mitreTactics]);

  const loadMore = useCallback(async (timeRange: string, filterLogic: FilterLogic) => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await huntApi.run(buildQuery(timeRange, filterLogic, cursor));
      setResults((prev) => [...prev, ...res.entries]);
      setCursor(res.next_cursor);
      setHasMore(res.has_more);
    } catch (e) {
      toastError(extractApiError(e), "Failed to load more results");
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, buildQuery]);

  const reset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setMitreTactics([]);
    setResults([]);
    setCursor(null);
    setHasMore(false);
    setTotal(null);
    setError(null);
    setHasRun(false);
  }, []);

  const loadFromHistory = useCallback((entry: HuntHistoryEntry) => {
    setFilters(entry.filters);
    setMitreTactics(entry.tactics);
  }, []);

  return {
    filters, mitreTactics, results, total, hasMore,
    running, loadingMore, error, hasRun,
    setFilters, setMitreTactics,
    run, loadMore, reset, loadFromHistory,
  };
}
