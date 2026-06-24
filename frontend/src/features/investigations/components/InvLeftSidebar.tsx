import React from "react";
import { ScorePanel } from "./ScorePanel";
import { IOCPanel } from "./IOCPanel";
import { MITREPanel } from "./MITREPanel";
import type { InvestigationDetail } from "../hooks/useInvestigationDetail";

interface Props {
  inv: InvestigationDetail;
}

export const InvLeftSidebar = React.memo(function InvLeftSidebar({ inv }: Props) {
  return (
    <div className="w-60 flex-shrink-0 flex flex-col gap-2.5 overflow-y-auto pr-0.5">
      <ScorePanel score={inv.threat_score} confidence={inv.confidence} />
      <IOCPanel inv={inv} />
      <MITREPanel steps={inv.attack_progression} />

      {/* Case metadata */}
      <div className="bg-bg-subtle border border-border-card rounded-lg p-3">
        <div className="text-2xs font-bold uppercase tracking-widest text-text-muted mb-2.5">
          Case Info
        </div>
        <div className="flex flex-col gap-1.5">
          {[
            ["TP Prob",  `${(inv.tp_probability  * 100).toFixed(0)}%`],
            ["FP Prob",  `${(inv.fp_probability  * 100).toFixed(0)}%`],
            ["Notes",    String(inv.note_count)],
            ["Evidence", String(inv.evidence_count)],
            ["Verdict",  inv.verdict?.replace(/_/g, " ") ?? "Pending"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-2xs text-text-muted uppercase tracking-wide">{label}</span>
              <span className="text-xs text-text-secondary font-mono">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
