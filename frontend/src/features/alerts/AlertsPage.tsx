import { useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCw, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/table/DataTable";
import { TablePagination } from "@/components/table/TablePagination";
import { FilterBar } from "@/components/filters/FilterBar";
import { alertColumns } from "./alertColumns";
import { ALERT_FILTER_FIELDS } from "./alertFilterFields";
import { AlertDrawer } from "./components/AlertDrawer";
import { BulkActionBar } from "./components/BulkActionBar";
import { NewAlertsIndicator } from "./components/NewAlertsIndicator";
import { SavedViewsBar, useSavedViews } from "./components/SavedViewsBar";
import { useAlertsList, useAlertsSummary } from "./hooks/useAlerts";
import { useAlertsRealtime } from "./hooks/useAlertsRealtime";
import type { Alert, AlertSeverity, AlertStatus, AlertListParams } from "./types";
import type { FilterState, ActiveFilter } from "@/components/filters/types";
import type { PaginationState, RowSelectionState } from "@/components/table/types";
import type { SortingState, VisibilityState } from "@tanstack/react-table";

// ─── Column visibility localStorage ──────────────────────────────────────────

const COL_VIS_KEY = "neurashield:alert_columns_v1";

function loadColVisibility(): VisibilityState {
  try { return JSON.parse(localStorage.getItem(COL_VIS_KEY) ?? "{}"); }
  catch { return {}; }
}
function saveColVisibility(v: VisibilityState) {
  localStorage.setItem(COL_VIS_KEY, JSON.stringify(v));
}

// ─── Status KPI band ──────────────────────────────────────────────────────────

const STATUS_ITEMS = [
  { key: "open"           as AlertStatus, label: "OPEN",           color: "#60A5FA" },
  { key: "acknowledged"   as AlertStatus, label: "ACKNOWLEDGED",   color: "#F59E0B" },
  { key: "closed"         as AlertStatus, label: "CLOSED",         color: "#4B5563" },
  { key: "false_positive" as AlertStatus, label: "FALSE POSITIVE", color: "#10B981" },
] as const;

function StatusKPIBand({
  activeStatus,
  onSelect,
}: {
  activeStatus: AlertStatus | null;
  onSelect: (s: AlertStatus | null) => void;
}) {
  const { data: summary } = useAlertsSummary();

  const counts: Record<AlertStatus, number> = {
    open:           summary?.open           ?? 0,
    acknowledged:   summary?.acknowledged   ?? 0,
    closed:         summary?.closed         ?? 0,
    false_positive: summary?.false_positive ?? 0,
  };

  return (
    <div className="flex flex-shrink-0 border-b border-border">
      {STATUS_ITEMS.map((item) => (
        <button
          key={item.key}
          onClick={() => onSelect(activeStatus === item.key ? null : item.key)}
          className={cn(
            "flex-1 p-2.5 px-4 text-left border-r border-border/50 last:border-r-0 transition-all duration-100",
            "border-b-2",
            activeStatus === item.key
              ? "bg-accent/5 border-b-accent"
              : "bg-transparent border-b-transparent hover:bg-bg-hover",
          )}
        >
          <div className="text-2xs font-bold uppercase tracking-widest text-text-muted mb-1">
            {item.label}
          </div>
          <div
            className="font-mono text-xl font-bold tabular-nums"
            style={{ color: item.color }}
          >
            {counts[item.key]}
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Row severity highlighting ────────────────────────────────────────────────

function getAlertRowClassName(alert: Alert): string {
  switch (alert.severity) {
    case "critical": return "border-l-2 border-l-severity-critical bg-severity-critical/[0.03]";
    case "high":     return "border-l-2 border-l-severity-high";
    default:         return "";
  }
}

// ─── Filter state → API params ────────────────────────────────────────────────

function sortingToParam(sorting: SortingState): string {
  if (!sorting.length) return "-created_at";
  const { id, desc } = sorting[0];
  const colMap: Record<string, string> = {
    severity: "severity", title: "title", status: "status",
    confidence: "confidence", hostname: "hostname", username: "username",
    correlationScore: "correlation_score", assignedTo: "assigned_to",
    createdAt: "created_at",
  };
  const field = colMap[id] ?? id;
  return desc ? `-${field}` : field;
}

function filtersToParams(filterState: FilterState, pagination: PaginationState, sorting: SortingState): AlertListParams {
  const params: AlertListParams = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    sort: sortingToParam(sorting),
    search: filterState.search || undefined,
  };
  for (const f of filterState.filters) {
    const value = f.value;
    switch (f.field) {
      case "severity":        params.severity       = (Array.isArray(value) ? value : [value]) as AlertSeverity[]; break;
      case "status":          params.status         = (Array.isArray(value) ? value : [value]) as AlertStatus[];   break;
      case "hostname":        params.hostname       = String(value ?? ""); break;
      case "username":        params.username       = String(value ?? ""); break;
      case "source_ip":       params.sourceIp       = String(value ?? ""); break;
      case "mitre_technique": params.mitreTechnique = String(value ?? ""); break;
      case "assigned_to":     params.assignedTo     = String(value ?? ""); break;
    }
  }
  if (filterState.dateRange?.preset) params.timeRange = filterState.dateRange.preset;
  return params;
}

// ─── AlertsPage ───────────────────────────────────────────────────────────────

export function AlertsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-synced alert selection
  const selectedAlertId = searchParams.get("alert");
  const setSelectedAlertId = useCallback((id: string | null) => {
    setSearchParams(
      (p) => { id ? p.set("alert", id) : p.delete("alert"); return p; },
      { replace: true }
    );
  }, [setSearchParams]);

  // URL-synced sort
  const sortParam = searchParams.get("sort");
  const [sorting, setSorting] = useState<SortingState>(() => {
    if (!sortParam) return [];
    const desc = sortParam.startsWith("-");
    return [{ id: desc ? sortParam.slice(1) : sortParam, desc }];
  });
  const handleSortingChange = useCallback((updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    setSorting(next);
    setSearchParams(
      (p) => {
        if (next.length) p.set("sort", next[0].desc ? `-${next[0].id}` : next[0].id);
        else p.delete("sort");
        return p;
      },
      { replace: true }
    );
  }, [sorting, setSearchParams]);

  const [filterState, setFilterState] = useState<FilterState>({
    search: "",
    filters: [] as ActiveFilter[],
    dateRange: null,
    savedViewId: null,
  });
  const [pagination, setPagination]   = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [activeStatus, setActiveStatus] = useState<AlertStatus | null>(null);
  const [newAlertCount, setNewAlertCount] = useState(0);
  const newAlertsSince = useRef<Date | null>(null);
  const [colVisibility, setColVisibility] = useState<VisibilityState>(loadColVisibility);
  const [showColMenu, setShowColMenu] = useState(false);

  const savedViews = useSavedViews();
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  const queryParams = {
    ...filtersToParams(filterState, pagination, sorting),
    ...(activeStatus ? { status: [activeStatus] } : {}),
  };
  const { data, isLoading, isFetching, refetch } = useAlertsList(queryParams);

  const handleNewAlert = useCallback((_alert: Alert) => {
    setNewAlertCount((n) => n + 1);
    if (!newAlertsSince.current) newAlertsSince.current = new Date();
  }, []);
  useAlertsRealtime({ onNewAlert: handleNewAlert });

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);

  const handleFilterChange = (next: FilterState) => {
    setFilterState(next);
    setActiveViewId(null);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  const handleViewSelect = (view: import("./components/SavedViewsBar").SavedView) => {
    setFilterState(view.filterState);
    setActiveViewId(view.id);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  const handleColVisChange = (id: string, visible: boolean) => {
    setColVisibility((prev) => {
      const next = { ...prev, [id]: visible };
      saveColVisibility(next);
      return next;
    });
  };

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "calc(100vh - 50px - 40px)" }}>

      {/* Page header */}
      <div className="flex items-center justify-between flex-shrink-0 pb-3 border-b border-border">
        <div>
          <h1 className="text-lg font-extrabold text-text-primary font-display">Alert Triage</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {data?.total != null ? (
              <><span className="text-text-primary font-medium">{data.total}</span> alerts total</>
            ) : (
              "Security alert triage workspace"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NewAlertsIndicator
            count={newAlertCount}
            since={newAlertsSince.current}
            onDismiss={() => { setNewAlertCount(0); newAlertsSince.current = null; }}
          />
          <button
            className="btn btn-ghost btn-sm flex items-center gap-1 text-xs"
            aria-label="Refresh alerts"
            onClick={() => refetch()}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Status KPI band */}
      <StatusKPIBand activeStatus={activeStatus} onSelect={setActiveStatus} />

      {/* Filter bar */}
      <div className="py-2 border-b border-border/60 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <FilterBar
              fields={ALERT_FILTER_FIELDS}
              filterState={filterState}
              onFilterChange={handleFilterChange}
              showSearch
              searchPlaceholder="Search alerts, rules, hosts..."
            />
          </div>
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowColMenu((p) => !p)}
              aria-label="Toggle column visibility"
              aria-expanded={showColMenu}
              className="btn btn-ghost btn-sm flex items-center gap-1 text-xs"
            >
              <SlidersHorizontal size={12} />
              Cols
            </button>
            {showColMenu && (
              <div className="absolute right-0 top-full mt-1 z-30 bg-bg-card border border-border rounded-lg p-2 shadow-elevated w-44">
                <p className="text-2xs font-bold uppercase tracking-widest text-text-muted px-1 mb-1.5">Columns</p>
                {alertColumns
                  .filter((c) => "id" in c && c.id && c.id !== "select")
                  .map((c) => {
                    const id = (c as { id: string }).id;
                    const visible = colVisibility[id] !== false;
                    return (
                      <label key={id} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-bg-elevated cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visible}
                          onChange={(e) => handleColVisChange(id, e.target.checked)}
                          className="accent-accent"
                        />
                        <span className="text-xs text-text-secondary capitalize">{id.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
                      </label>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saved views bar */}
      <SavedViewsBar
        activeViewId={activeViewId}
        views={savedViews.views}
        currentFilter={filterState}
        onSelect={handleViewSelect}
        onSaveCurrent={(name) => savedViews.add(name, filterState)}
        onRemove={savedViews.remove}
      />

      {/* Thin background-fetch indicator */}
      {isFetching && !isLoading && (
        <div className="h-0.5 bg-accent/30 flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1/3 bg-accent animate-shimmer" />
        </div>
      )}

      {/* Table + drawer */}
      <div className={cn("flex-1 min-h-0 card overflow-hidden flex flex-col mt-2")}>
        <DataTable
          data={data?.items ?? []}
          columns={alertColumns}
          isLoading={isLoading}
          emptyMessage={
            activeStatus
              ? `No ${activeStatus} alerts`
              : "No alerts yet — detections will appear here once the agent starts sending events"
          }
          enableRowSelection
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          getRowId={(row) => row.id}
          onRowClick={(alert) => setSelectedAlertId(alert.id)}
          getRowClassName={getAlertRowClassName}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageCount={data?.pageCount ?? 0}
          manualPagination
          stickyHeader
          enableVirtualization
          sorting={sorting}
          onSortingChange={handleSortingChange}
          columnVisibility={colVisibility}
          className="flex-1 min-h-0"
        />
        <div className="flex-shrink-0 border-t border-border">
          <TablePagination
            pagination={pagination}
            pageCount={data?.pageCount ?? 0}
            totalRows={data?.total}
            onPaginationChange={setPagination}
          />
        </div>
      </div>

      {/* Alert detail drawer — selection synced to URL */}
      <AlertDrawer alertId={selectedAlertId} onClose={() => setSelectedAlertId(null)} />

      {/* Floating bulk action bar */}
      <BulkActionBar selectedIds={selectedIds} onClear={() => setRowSelection({})} />
    </div>
  );
}
