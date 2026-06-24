import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { cn } from "@/lib/utils";
import type { DashboardTimeRange } from "../types/dashboard";

// GET /dashboard/alert-heatmap — returns hour×day matrix for last 7 days
interface HeatmapCell {
  day: number;  // 0=Sun … 6=Sat
  hour: number; // 0–23
  count: number;
}

const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) =>
  i === 0 ? "12am" : i < 12 ? `${i}am` : i === 12 ? "12pm" : `${i - 12}pm`
);

// Generate sample data when backend not available
function sampleHeatmap(): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const isBusinessHours = h >= 8 && h <= 18 && d >= 1 && d <= 5;
      cells.push({ day: d, hour: h, count: isBusinessHours ? Math.floor(Math.random() * 20 + 5) : Math.floor(Math.random() * 5) });
    }
  }
  return cells;
}

function cellColor(count: number, max: number): string {
  if (count === 0) return "bg-bg-elevated";
  const intensity = count / max;
  if (intensity < 0.25) return "bg-accent/20";
  if (intensity < 0.5)  return "bg-accent/40";
  if (intensity < 0.75) return "bg-accent/60";
  return "bg-accent/90";
}

interface Props {
  timeRange: DashboardTimeRange;
}

export function AlertVolumeHeatmap({ timeRange }: Props) {
  void timeRange;

  const { data, isLoading } = useQuery({
    // TODO: wire to /dashboard/alert-heatmap?timeRange={timeRange}
    queryKey: ["dashboard", "heatmap", timeRange],
    queryFn: () =>
      apiClient.get<HeatmapCell[]>(`/dashboard/alert-heatmap?timeRange=${timeRange}`)
        .then((r) => r.data)
        .catch(() => sampleHeatmap()),
    staleTime: 300_000,
    placeholderData: sampleHeatmap,
  });

  const cells = data ?? [];
  const max = Math.max(1, ...cells.map((c) => c.count));

  // Build day×hour lookup
  const lookup = new Map<string, number>(cells.map((c) => [`${c.day}-${c.hour}`, c.count]));

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">Alert Volume Heatmap (7d)</h3>
      {isLoading ? (
        <div className="skel h-40 rounded-lg" />
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-grid gap-px" style={{ gridTemplateColumns: `40px repeat(24, minmax(16px, 1fr))` }}>
            {/* Header row */}
            <div className="text-2xs text-text-disabled" />
            {HOUR_LABELS.map((h, i) => (
              <div key={i} className="text-2xs text-text-disabled text-center">
                {i % 4 === 0 ? h : ""}
              </div>
            ))}

            {/* Data rows */}
            {DAY_LABELS.map((day, dIdx) => (
              <>
                <div key={`label-${dIdx}`} className="text-2xs text-text-muted flex items-center">{day}</div>
                {Array.from({ length: 24 }, (_, hIdx) => {
                  const count = lookup.get(`${dIdx}-${hIdx}`) ?? 0;
                  return (
                    <div
                      key={`${dIdx}-${hIdx}`}
                      title={`${day} ${HOUR_LABELS[hIdx]}: ${count} alerts`}
                      className={cn("w-full rounded-sm", cellColor(count, max))}
                      style={{ height: 14 }}
                    />
                  );
                })}
              </>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-2xs text-text-disabled">Fewer</span>
            {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
              <div key={i} className={cn("w-3 h-3 rounded-sm", v === 0 ? "bg-bg-elevated" : `bg-accent/${Math.round(v * 90)}`)} />
            ))}
            <span className="text-2xs text-text-disabled">More</span>
          </div>
        </div>
      )}
    </div>
  );
}
