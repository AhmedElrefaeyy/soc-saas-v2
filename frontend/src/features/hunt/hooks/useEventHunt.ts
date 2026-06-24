import { useState, useCallback } from "react";
import { huntApi } from "@/api/hunt";
import type {
  EventHuntFilter, EventHuntResultEntry, EventHuntSummary,
  EventHuntQuery, FilterLogic,
} from "@/api/hunt";
import { extractApiError } from "@/lib/utils";
import { toastError } from "@/lib/toast";
import { loadHuntHistory } from "./useInvestigationHunt";

// ─── Event hunt history helpers ───────────────────────────────────────────────

const HISTORY_KEY = "neurashield:hunt_history";
const HISTORY_MAX = 20;

export interface EvtHuntHistoryEntry {
  id:          string;
  mode:        "event";
  filters:     EventHuntFilter[];
  categories:  string[];
  timeRange:   string;
  ts:          number;
}

function appendEvtHistory(entry: Omit<EvtHuntHistoryEntry, "id" | "mode">) {
  const all = loadHuntHistory().filter((e) => e.mode !== "event" ||
    JSON.stringify((e as unknown as EvtHuntHistoryEntry).filters) !== JSON.stringify(entry.filters));
  const next: EvtHuntHistoryEntry = { ...entry, id: crypto.randomUUID(), mode: "event" };
  localStorage.setItem(HISTORY_KEY, JSON.stringify([next, ...all].slice(0, HISTORY_MAX)));
}

const DEFAULT_FILTERS: EventHuntFilter[] = [
  { field: "host_name", operator: "contains", value: "" },
];

function getFromTs(val: string): string | null {
  const offsets: Record<string, number> = {
    "1h": 3_600_000, "24h": 86_400_000, "7d": 604_800_000, "30d": 2_592_000_000,
  };
  const ms = offsets[val];
  return ms ? new Date(Date.now() - ms).toISOString() : null;
}

export interface EventHuntState {
  filters: EventHuntFilter[];
  categories: string[];
  uebaFlags: string[];
  tags: string[];
  isAnomaly: boolean | null;
  isThreatIp: boolean | null;
  minSeverity: number | null;
  results: EventHuntResultEntry[];
  summary: EventHuntSummary | null;
  total: number | null;
  hasMore: boolean;
  running: boolean;
  loadingMore: boolean;
  error: string | null;
  hasRun: boolean;
  selectedEvt: EventHuntResultEntry | null;
  setFilters:     (f: EventHuntFilter[]) => void;
  setCategories:  (c: string[]) => void;
  setUebaFlags:   (u: string[]) => void;
  setTags:        (t: string[]) => void;
  setIsAnomaly:   (v: boolean | null) => void;
  setIsThreatIp:  (v: boolean | null) => void;
  setMinSeverity: (s: number | null) => void;
  setSelectedEvt: (e: EventHuntResultEntry | null) => void;
  run:      (timeRange: string, filterLogic: FilterLogic) => Promise<void>;
  loadMore: (timeRange: string, filterLogic: FilterLogic) => Promise<void>;
  reset:    () => void;
  loadFromSaved: (params: SavedEvtParams) => void;
}

export interface SavedEvtParams {
  evt_filters?:      EventHuntFilter[];
  evt_categories?:   string[];
  evt_ueba_flags?:   string[];
  evt_tags?:         string[];
  evt_is_anomaly?:   boolean | null;
  evt_is_threat_ip?: boolean | null;
  evt_min_severity?: number | null;
}

export function useEventHunt(): EventHuntState {
  const [filters,     setFilters]     = useState<EventHuntFilter[]>(DEFAULT_FILTERS);
  const [categories,  setCategories]  = useState<string[]>([]);
  const [uebaFlags,   setUebaFlags]   = useState<string[]>([]);
  const [tags,        setTags]        = useState<string[]>([]);
  const [isAnomaly,   setIsAnomaly]   = useState<boolean | null>(null);
  const [isThreatIp,  setIsThreatIp]  = useState<boolean | null>(null);
  const [minSeverity, setMinSeverity] = useState<number | null>(null);
  const [results,     setResults]     = useState<EventHuntResultEntry[]>([]);
  const [summary,     setSummary]     = useState<EventHuntSummary | null>(null);
  const [cursor,      setCursor]      = useState<string | null>(null);
  const [hasMore,     setHasMore]     = useState(false);
  const [total,       setTotal]       = useState<number | null>(null);
  const [running,     setRunning]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [hasRun,      setHasRun]      = useState(false);
  const [selectedEvt, setSelectedEvt] = useState<EventHuntResultEntry | null>(null);

  const buildQuery = useCallback((timeRange: string, filterLogic: FilterLogic, cur?: string | null): EventHuntQuery => ({
    filters:      filters.filter((f) => f.value.trim() !== ""),
    logic:        filterLogic,
    from_ts:      getFromTs(timeRange),
    to_ts:        null,
    category:     categories.length ? categories : undefined,
    min_severity: minSeverity ?? undefined,
    is_anomaly:   isAnomaly ?? undefined,
    is_threat_ip: isThreatIp ?? undefined,
    ueba_flags:   uebaFlags.length ? uebaFlags : undefined,
    tags:         tags.length ? tags : undefined,
    cursor:       cur ?? null,
    limit:        50,
    sort:         "desc",
  }), [filters, categories, minSeverity, isAnomaly, isThreatIp, uebaFlags, tags]);

  const run = useCallback(async (timeRange: string, filterLogic: FilterLogic) => {
    setRunning(true);
    setError(null);
    setSelectedEvt(null);
    try {
      const res = await huntApi.runEventHunt(buildQuery(timeRange, filterLogic));
      setResults(res.entries);
      setSummary(res.summary);
      setCursor(res.next_cursor);
      setHasMore(res.has_more);
      setTotal(res.total);
      setHasRun(true);
      appendEvtHistory({ filters, categories, timeRange, ts: Date.now() });
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setRunning(false);
    }
  }, [buildQuery, filters, categories]);

  const loadMore = useCallback(async (timeRange: string, filterLogic: FilterLogic) => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await huntApi.runEventHunt(buildQuery(timeRange, filterLogic, cursor));
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
    setCategories([]);
    setUebaFlags([]);
    setTags([]);
    setIsAnomaly(null);
    setIsThreatIp(null);
    setMinSeverity(null);
    setResults([]);
    setSummary(null);
    setCursor(null);
    setHasMore(false);
    setTotal(null);
    setError(null);
    setHasRun(false);
    setSelectedEvt(null);
  }, []);

  const loadFromSaved = useCallback((params: SavedEvtParams) => {
    if (Array.isArray(params.evt_filters))    setFilters(params.evt_filters);
    if (Array.isArray(params.evt_categories)) setCategories(params.evt_categories);
    if (Array.isArray(params.evt_ueba_flags)) setUebaFlags(params.evt_ueba_flags);
    if (Array.isArray(params.evt_tags))       setTags(params.evt_tags);
    if (params.evt_is_anomaly   !== undefined) setIsAnomaly(params.evt_is_anomaly ?? null);
    if (params.evt_is_threat_ip !== undefined) setIsThreatIp(params.evt_is_threat_ip ?? null);
    if (params.evt_min_severity !== undefined) setMinSeverity(params.evt_min_severity ?? null);
  }, []);

  return {
    filters, categories, uebaFlags, tags, isAnomaly, isThreatIp, minSeverity,
    results, summary, total, hasMore, running, loadingMore, error, hasRun, selectedEvt,
    setFilters, setCategories, setUebaFlags, setTags,
    setIsAnomaly, setIsThreatIp, setMinSeverity, setSelectedEvt,
    run, loadMore, reset, loadFromSaved,
  };
}
