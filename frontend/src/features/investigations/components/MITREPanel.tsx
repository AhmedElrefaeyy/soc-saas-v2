import React from "react";
import { Activity } from "lucide-react";

interface Props {
  steps: string[];
}

export const MITREPanel = React.memo(function MITREPanel({ steps }: Props) {
  if (!steps?.length) return null;

  return (
    <div className="bg-bg-subtle border border-border-card rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-widest text-text-muted mb-2.5">
        <Activity size={10} />
        Attack Chain
      </div>
      <div className="flex flex-col gap-1">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-2xs font-bold text-purple-400 flex-shrink-0 mt-0.5">
              {i + 1}
            </div>
            <span className="text-xs text-purple-300 font-mono leading-relaxed">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
