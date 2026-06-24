import React from "react";
import { LayoutDashboard } from "lucide-react";
import type { InvestigationDetail } from "../../hooks/useInvestigationDetail";

function EmptyTab({ icon: Icon, message, sub }: {
  icon: React.ElementType; message: string; sub: string;
}) {
  return (
    <div className="text-center py-16">
      <Icon size={36} className="text-text-disabled block mx-auto mb-3" />
      <div className="text-sm font-semibold text-text-muted mb-1.5">{message}</div>
      <div className="text-xs text-text-disabled">{sub}</div>
    </div>
  );
}

interface Props {
  inv: InvestigationDetail;
}

export const SummaryTab = React.memo(function SummaryTab({ inv }: Props) {
  if (!inv.executive_summary && !inv.technical_summary) {
    return (
      <EmptyTab
        icon={LayoutDashboard}
        message="No summary available"
        sub="AI analysis will populate this section."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 max-w-[800px]">
      {inv.executive_summary && (
        <div className="bg-bg-subtle border border-border-card rounded-lg p-4">
          <div className="text-2xs font-bold uppercase tracking-widest text-text-muted mb-2.5">
            Executive Summary
          </div>
          <p className="text-sm text-text-secondary leading-relaxed m-0">{inv.executive_summary}</p>
        </div>
      )}

      {inv.technical_summary && (
        <div className="bg-bg-subtle border border-border-card rounded-lg p-4">
          <div className="text-2xs font-bold uppercase tracking-widest text-text-muted mb-2.5">
            Technical Summary
          </div>
          <p className="text-xs text-tx-3 leading-relaxed m-0 font-mono">{inv.technical_summary}</p>
        </div>
      )}

      {inv.attack_progression?.length > 0 && (
        <div className="bg-bg-subtle border border-border-card rounded-lg p-4">
          <div className="text-2xs font-bold uppercase tracking-widest text-text-muted mb-3">
            Attack Progression
          </div>
          <div className="flex flex-wrap gap-1.5">
            {inv.attack_progression.map((step, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded text-xs font-semibold font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20"
              >
                {step}
              </span>
            ))}
          </div>
        </div>
      )}

      {inv.recommended_actions?.length > 0 && (
        <div className="bg-bg-subtle border border-border-card rounded-lg p-4">
          <div className="text-2xs font-bold uppercase tracking-widest text-text-muted mb-3">
            Recommended Actions
          </div>
          <div className="flex flex-col gap-2">
            {inv.recommended_actions.map((action, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-2xs font-bold text-blue-400 flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-xs text-text-secondary leading-relaxed">{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
