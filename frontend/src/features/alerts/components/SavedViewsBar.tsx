import { useState, useCallback } from "react";
import { Bookmark, Plus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenantStore } from "@/stores/tenantStore";
import type { FilterState } from "@/components/filters/types";

// ─── Storage ──────────────────────────────────────────────────────────────────

export interface SavedView {
  id:          string;
  name:        string;
  filterState: FilterState;
  createdAt:   number;
}

function storageKey(tenantId: string) {
  return `neurashield:saved_views:${tenantId}`;
}

function loadViews(tenantId: string): SavedView[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(tenantId)) ?? "[]");
  } catch {
    return [];
  }
}

function saveViews(tenantId: string, views: SavedView[]) {
  localStorage.setItem(storageKey(tenantId), JSON.stringify(views));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSavedViews() {
  const tenantId = useTenantStore((s) => s.activeTenant?.id) ?? "default";
  const [views, setViews] = useState<SavedView[]>(() => loadViews(tenantId));

  const add = useCallback((name: string, filterState: FilterState) => {
    const next: SavedView = {
      id:          crypto.randomUUID(),
      name,
      filterState,
      createdAt:   Date.now(),
    };
    setViews((prev) => {
      const updated = [next, ...prev].slice(0, 12);
      saveViews(tenantId, updated);
      return updated;
    });
  }, [tenantId]);

  const remove = useCallback((id: string) => {
    setViews((prev) => {
      const updated = prev.filter((v) => v.id !== id);
      saveViews(tenantId, updated);
      return updated;
    });
  }, [tenantId]);

  return { views, add, remove };
}

// ─── SavedViewsBar ────────────────────────────────────────────────────────────

interface Props {
  activeViewId:    string | null;
  views:           SavedView[];
  currentFilter:   FilterState;
  onSelect:        (view: SavedView) => void;
  onSaveCurrent:   (name: string) => void;
  onRemove:        (id: string) => void;
}

export function SavedViewsBar({
  activeViewId,
  views,
  currentFilter,
  onSelect,
  onSaveCurrent,
  onRemove,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [name,   setName]   = useState("");
  const [saved,  setSaved]  = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;
    onSaveCurrent(name.trim());
    setName("");
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const hasFilters = currentFilter.filters.length > 0 || !!currentFilter.search || !!currentFilter.dateRange;

  return (
    <div className="flex items-center gap-1.5 py-1.5 px-1 border-b border-border/50 overflow-x-auto flex-shrink-0">
      <div className="flex items-center gap-1 text-2xs text-text-muted flex-shrink-0 pl-1">
        <Bookmark size={10} />
        <span className="font-semibold uppercase tracking-wider">Views</span>
      </div>

      {/* Saved view chips */}
      {views.map((view) => (
        <div
          key={view.id}
          className={cn(
            "flex items-center gap-1 pl-2.5 pr-1 h-[22px] rounded-full text-2xs font-medium whitespace-nowrap flex-shrink-0",
            "border transition-colors",
            view.id === activeViewId
              ? "bg-accent/15 border-accent/40 text-blue-300"
              : "bg-bg-elevated border-border text-text-muted hover:text-text-secondary hover:border-border-hover cursor-pointer",
          )}
        >
          <button
            onClick={() => onSelect(view)}
            className="focus:outline-none"
            aria-label={`Apply saved view: ${view.name}`}
          >
            {view.name}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(view.id); }}
            aria-label={`Remove view: ${view.name}`}
            className="ml-0.5 text-text-muted hover:text-severity-critical transition-colors focus:outline-none rounded-full"
          >
            <X size={10} />
          </button>
        </div>
      ))}

      {/* Save current filter */}
      {saving ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setSaving(false);
            }}
            placeholder="View name..."
            className="h-[22px] px-2 text-2xs bg-bg-elevated border border-accent/40 rounded-full text-text-primary placeholder:text-text-muted focus:outline-none w-32"
          />
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            aria-label="Confirm save view"
            className="w-[22px] h-[22px] flex items-center justify-center rounded-full bg-accent/20 text-blue-400 hover:bg-accent/30 disabled:opacity-40 transition-colors"
          >
            <Check size={10} />
          </button>
          <button
            onClick={() => setSaving(false)}
            aria-label="Cancel saving view"
            className="w-[22px] h-[22px] flex items-center justify-center rounded-full text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={10} />
          </button>
        </div>
      ) : hasFilters && (
        <button
          onClick={() => setSaving(true)}
          className={cn(
            "flex items-center gap-1 px-2 h-[22px] rounded-full text-2xs font-medium flex-shrink-0",
            "border border-dashed border-border text-text-muted hover:border-accent/40 hover:text-accent transition-colors",
            saved && "border-emerald-500/40 text-emerald-400",
          )}
          aria-label="Save current filter as view"
        >
          {saved ? <Check size={10} /> : <Plus size={10} />}
          {saved ? "Saved!" : "Save view"}
        </button>
      )}
    </div>
  );
}
