import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

// ─── Widget catalog ───────────────────────────────────────────────────────────

export const WIDGET_CATALOG = [
  { id: "kpi",         label: "KPI Metrics",           size: "large"  },
  { id: "live-alerts", label: "Live Alerts Feed",       size: "medium" },
  { id: "ingestion",   label: "Ingestion Rate",         size: "medium" },
  { id: "detection",   label: "Detection Health",       size: "small"  },
  { id: "mitre",       label: "MITRE ATT&CK",           size: "large"  },
  { id: "correlation", label: "Correlation Activity",   size: "medium" },
  { id: "ai-inv",      label: "AI Investigations",      size: "large"  },
  { id: "geo-map",     label: "Geo Threat Map",         size: "large"  },
  { id: "top-entities",label: "Top Entities",           size: "large"  },
  { id: "heatmap",     label: "Alert Volume Heatmap",   size: "large"  },
  { id: "mttr",        label: "MTTR Trend",             size: "medium" },
] as const;

type WidgetId = typeof WIDGET_CATALOG[number]["id"];
const DEFAULT_LAYOUT: WidgetId[] = ["kpi","live-alerts","ingestion","detection","mitre","correlation","ai-inv"];

// ─── localStorage helpers ─────────────────────────────────────────────────────

function layoutKey(userId: string) { return `neurashield:dashboard_layout:${userId}`; }

export function loadLayout(userId: string): WidgetId[] {
  try { return JSON.parse(localStorage.getItem(layoutKey(userId)) ?? "null") as WidgetId[] ?? DEFAULT_LAYOUT; }
  catch { return DEFAULT_LAYOUT; }
}

function saveLayout(userId: string, layout: WidgetId[]) {
  localStorage.setItem(layoutKey(userId), JSON.stringify(layout));
}

// ─── Sortable widget card ─────────────────────────────────────────────────────

function SortableWidget({
  id, label, onRemove, editMode,
}: {
  id: string; label: string; onRemove: () => void; editMode: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-bg-card border rounded-xl p-4 flex items-center gap-3 transition-shadow",
        isDragging ? "border-accent shadow-elevated opacity-80" : "border-border",
        editMode && "cursor-grab active:cursor-grabbing",
      )}
    >
      {editMode && (
        <div {...attributes} {...listeners} className="text-text-disabled hover:text-text-muted">
          <GripVertical size={14} />
        </div>
      )}
      <span className="flex-1 text-sm font-medium text-text-secondary">{label}</span>
      {editMode && (
        <button onClick={onRemove} className="text-text-disabled hover:text-severity-critical transition-colors">
          <X size={13} />
        </button>
      )}
    </div>
  );
}

// ─── CustomDashboardBuilder ───────────────────────────────────────────────────

interface Props {
  editMode: boolean;
  onLayoutChange?: (layout: WidgetId[]) => void;
}

export function CustomDashboardBuilder({ editMode, onLayoutChange }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? "guest");
  const [layout, setLayout] = useState<WidgetId[]>(() => loadLayout(userId));

  useEffect(() => {
    saveLayout(userId, layout);
    onLayoutChange?.(layout);
  }, [layout, userId, onLayoutChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLayout((items) => {
        const from = items.indexOf(active.id as WidgetId);
        const to   = items.indexOf(over.id as WidgetId);
        return arrayMove(items, from, to);
      });
    }
  }, []);

  const removeWidget = useCallback((id: WidgetId) => {
    setLayout((items) => items.filter((i) => i !== id));
  }, []);

  const addWidget = useCallback((id: WidgetId) => {
    setLayout((items) => items.includes(id) ? items : [...items, id]);
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
  }, []);

  const available = WIDGET_CATALOG.filter((w) => !layout.includes(w.id));

  if (!editMode) return null;

  return (
    <div className="mb-4 border border-accent/30 bg-accent/3 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-accent">Edit Dashboard Layout</h3>
        <button onClick={resetLayout} className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors">
          <RotateCcw size={11} /> Reset
        </button>
      </div>

      {/* Active layout */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={layout} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {layout.map((id) => {
              const w = WIDGET_CATALOG.find((x) => x.id === id);
              return w ? (
                <SortableWidget
                  key={id}
                  id={id}
                  label={w.label}
                  onRemove={() => removeWidget(id)}
                  editMode={editMode}
                />
              ) : null;
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Widget catalog */}
      {available.length > 0 && (
        <div>
          <p className="text-2xs text-text-muted uppercase tracking-wider mb-2">Available Widgets</p>
          <div className="flex flex-wrap gap-1.5">
            {available.map((w) => (
              <button
                key={w.id}
                onClick={() => addWidget(w.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg-elevated border border-border text-xs text-text-secondary hover:border-accent hover:text-accent transition-all"
              >
                + {w.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
