import React from "react";
import { Clock } from "lucide-react";
import { SevBadge } from "@/components/ui/SevBadge";
import { formatDateTime } from "@/lib/timezone";
import { useInvTimeline } from "../../hooks/useInvestigationDetail";
import type { TimelineEntryOut } from "../../hooks/useInvestigationDetail";

function processBasename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function timelineLabel(entry: TimelineEntryOut): string {
  const parts: string[] = [];
  if (entry.process) parts.push(processBasename(entry.process));
  parts.push(entry.action);
  if (entry.outcome && entry.outcome !== "success") parts.push(`(${entry.outcome})`);
  return parts.join(" — ");
}

function sevColor(severity: number): string {
  if (severity >= 4) return "#EF4444";
  if (severity >= 3) return "#F97316";
  if (severity >= 2) return "#F59E0B";
  return "#3B82F6";
}

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {[1, 2, 3, 4].map((i) => <div key={i} className="skel h-14 rounded-lg" />)}
    </div>
  );
}

interface Props {
  id: string;
  isActive: boolean;
}

export const TimelineTab = React.memo(function TimelineTab({ id, isActive }: Props) {
  const { data, isLoading } = useInvTimeline(id, { enabled: isActive });
  const entries = data?.entries ?? [];

  if (isLoading) return <TabSkeleton />;
  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <Clock size={36} className="text-text-disabled block mx-auto mb-3" />
        <div className="text-sm font-semibold text-text-muted mb-1.5">No timeline events</div>
        <div className="text-xs text-text-disabled">Events will appear as the investigation progresses</div>
      </div>
    );
  }

  return (
    <div className="max-w-[720px]">
      <div className="text-xs text-text-muted mb-4">
        {data?.total_events ?? entries.length} total events
      </div>
      {entries.map((entry, i) => {
        const isLast = i === entries.length - 1;
        const color  = sevColor(entry.severity);
        const tsIso  = new Date(entry.timestamp * 1000).toISOString();
        return (
          <div key={entry.event_id} className="flex gap-4" style={{ paddingBottom: isLast ? 0 : 20 }}>
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                style={{ background: color, boxShadow: `0 0 6px ${color}` }}
              />
              {!isLast && <div className="w-px flex-1 mt-1 bg-border" />}
            </div>
            <div className="flex-1" style={{ paddingBottom: isLast ? 0 : 4 }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-text-muted font-mono">{formatDateTime(tsIso)}</span>
                <SevBadge sev={entry.severity} />
                <span className="text-xs text-text-muted uppercase tracking-wider">{entry.category}</span>
              </div>
              <div className="text-xs text-text-secondary mb-0.5">{timelineLabel(entry)}</div>
              <div className="text-2xs text-text-muted font-mono">
                {entry.hostname}
                {entry.username && <span className="ml-2 text-text-disabled">· {entry.username}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});
