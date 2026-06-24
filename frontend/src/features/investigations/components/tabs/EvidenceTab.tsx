import React from "react";
import { Paperclip } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { useInvEvidence } from "../../hooks/useInvestigationDetail";
import type { EvidenceOut } from "../../hooks/useInvestigationDetail";

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map((i) => <div key={i} className="skel h-16 rounded-lg" />)}
    </div>
  );
}

interface Props {
  id: string;
  isActive: boolean;
}

export const EvidenceTab = React.memo(function EvidenceTab({ id, isActive }: Props) {
  const { data, isLoading } = useInvEvidence(id, { enabled: isActive });
  const items = data ?? [];

  if (isLoading) return <TabSkeleton />;
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <Paperclip size={36} className="text-text-disabled block mx-auto mb-3" />
        <div className="text-sm font-semibold text-text-muted mb-1.5">No evidence attached</div>
        <div className="text-xs text-text-disabled">
          Evidence will be attached automatically as events are correlated
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((ev: EvidenceOut) => (
        <div key={ev.evidence_id} className="bg-bg-subtle border border-border-card rounded-lg p-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold text-text-primary mb-1">{ev.title}</div>
              {ev.description && (
                <div className="text-xs text-tx-3">{ev.description}</div>
              )}
            </div>
            <span className="text-2xs font-bold uppercase tracking-wider px-1.5 py-px rounded bg-bg-hover text-tx-3 flex-shrink-0 font-mono">
              {ev.evidence_type.replace(/_/g, " ")}
            </span>
          </div>
          <div className="mt-2 text-2xs text-text-muted font-mono">
            {formatRelativeTime(ev.created_at)}
            {ev.reference_id && (
              <span className="ml-2.5 text-text-disabled">ref: {ev.reference_id.slice(0, 12)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});
