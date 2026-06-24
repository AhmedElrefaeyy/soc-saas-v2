import { useState } from "react";
import { Settings2 } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboardStore";
import { useDashboardRealtime } from "./hooks/useDashboardRealtime";
import { KPIMetricsRow } from "./widgets/KPIMetricsRow";
import { LiveAlertsFeed } from "./widgets/LiveAlertsFeed";
import { IngestionRateChart } from "./widgets/IngestionRateChart";
import { DetectionHealthWidget } from "./widgets/DetectionHealthWidget";
import { MitreHeatmap } from "./widgets/MitreHeatmap";
import { CorrelationWidget } from "./widgets/CorrelationWidget";
import { AIInvestigationWidget } from "./widgets/AIInvestigationWidget";
import { GeoThreatMap } from "./widgets/GeoThreatMap";
import { TopEntitiesWidget } from "./widgets/TopEntitiesWidget";
import { AlertVolumeHeatmap } from "./widgets/AlertVolumeHeatmap";
import { MTTRTrendChart } from "./widgets/MTTRTrendChart";
import { CustomDashboardBuilder } from "./widgets/CustomDashboardBuilder";
import { WidgetErrorBoundary } from "@/components/ui/WidgetErrorBoundary";
import type { DashboardTimeRange } from "./types/dashboard";
import { TIME_RANGE_LABELS } from "./types/dashboard";

const TIME_RANGES: DashboardTimeRange[] = [
  "last_15m", "last_1h", "last_6h", "last_24h", "last_7d",
];

// ─── Time range picker ────────────────────────────────────────────────────────

function TimeRangePicker({
  value,
  onChange,
}: {
  value: DashboardTimeRange;
  onChange: (v: DashboardTimeRange) => void;
}) {
  return (
    <div className="flex gap-0.5 bg-bg-surface border border-border rounded-lg p-0.5">
      {TIME_RANGES.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={
            r === value
              ? "px-3 py-1 rounded-md text-xs font-semibold bg-primary-600 text-white transition-all"
              : "px-3 py-1 rounded-md text-xs font-semibold text-text-muted hover:text-text-secondary transition-all"
          }
        >
          {TIME_RANGE_LABELS[r]}
        </button>
      ))}
    </div>
  );
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

export function DashboardPage() {
  const timeRange    = useDashboardStore((s) => s.timeRange);
  const setTimeRange = useDashboardStore((s) => s.setTimeRange);
  const [editMode, setEditMode] = useState(false);

  useDashboardRealtime(timeRange);

  return (
    <div className="pb-6">

      {/* Page header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-text-primary font-display">
            Security Overview
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Real-time threat intelligence command center
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-status-online font-semibold">
            <span className="w-1.5 h-1.5 bg-status-online rounded-full animate-pulse" />
            Live
          </span>
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
          <button
            onClick={() => setEditMode((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-border text-text-muted hover:text-text-primary hover:border-border-hover transition-all"
            aria-label="Customize dashboard layout"
          >
            <Settings2 size={12} />
            {editMode ? "Done" : "Customize"}
          </button>
        </div>
      </div>

      {/* Custom Dashboard Builder (edit mode only) */}
      <CustomDashboardBuilder editMode={editMode} />

      {/* Row 1: 8-card KPI strip */}
      <div className="mb-3">
        <WidgetErrorBoundary title="KPI Metrics">
          <KPIMetricsRow timeRange={timeRange} />
        </WidgetErrorBoundary>
      </div>

      {/* Row 2: Live Alerts + Ingestion Rate + Detection Health */}
      <div className="grid mb-3" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 300px", gap: 12 }}>
        <WidgetErrorBoundary title="Live Alerts Feed">
          <LiveAlertsFeed timeRange={timeRange} maxHeight={380} />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary title="Ingestion Rate">
          <IngestionRateChart timeRange={timeRange} />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary title="Detection Health">
          <DetectionHealthWidget timeRange={timeRange} />
        </WidgetErrorBoundary>
      </div>

      {/* Row 3: MITRE ATT&CK + Correlation Activity */}
      <div className="grid mb-3" style={{ gridTemplateColumns: "3fr 2fr", gap: 12 }}>
        <WidgetErrorBoundary title="MITRE ATT&CK">
          <MitreHeatmap timeRange={timeRange} />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary title="Correlation Activity">
          <CorrelationWidget timeRange={timeRange} />
        </WidgetErrorBoundary>
      </div>

      {/* Row 4: AI Operations */}
      <div className="mb-3">
        <WidgetErrorBoundary title="AI Investigations">
          <AIInvestigationWidget timeRange={timeRange} />
        </WidgetErrorBoundary>
      </div>

      {/* Row 5: Geo Threat Map + Top Entities */}
      <div className="grid mb-3" style={{ gridTemplateColumns: "3fr 2fr", gap: 12 }}>
        <WidgetErrorBoundary title="Geo Threat Map">
          <GeoThreatMap timeRange={timeRange} />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary title="Top Entities">
          <TopEntitiesWidget timeRange={timeRange} />
        </WidgetErrorBoundary>
      </div>

      {/* Row 6: Alert Volume Heatmap + MTTR Trend */}
      <div className="grid" style={{ gridTemplateColumns: "3fr 2fr", gap: 12 }}>
        <WidgetErrorBoundary title="Alert Volume Heatmap">
          <AlertVolumeHeatmap timeRange={timeRange} />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary title="MTTR Trend">
          <MTTRTrendChart timeRange={timeRange} />
        </WidgetErrorBoundary>
      </div>
    </div>
  );
}
