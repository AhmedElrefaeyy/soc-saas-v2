import React from "react";
import { cn } from "@/lib/utils";

const PIPELINE_STAGES = [
  { value: "new",           label: "New",          color: "#9CA3AF" },
  { value: "triaged",       label: "Triaged",      color: "#FCD34D" },
  { value: "investigating", label: "Investigating", color: "#34D399" },
  { value: "contained",     label: "Contained",    color: "#F97316" },
  { value: "resolved",      label: "Resolved",     color: "#10B981" },
] as const;

interface Props {
  current: string;
}

export const StatusPipeline = React.memo(function StatusPipeline({ current }: Props) {
  const activeIdx = Math.max(0, PIPELINE_STAGES.findIndex((s) => s.value === current));

  return (
    <div className="flex items-center h-7">
      {PIPELINE_STAGES.map((stage, i) => {
        const isPast   = i < activeIdx;
        const isActive = i === activeIdx;
        const isLast   = i === PIPELINE_STAGES.length - 1;

        return (
          <div key={stage.value} className="flex items-center flex-1">
            <div
              className={cn(
                "flex-1 flex items-center justify-center h-6 relative",
                "border text-2xs font-bold uppercase tracking-wider font-mono",
                i === 0 ? "rounded-l" : "",
                isLast ? "rounded-r" : "",
                i > 0 ? "border-l-0" : "",
              )}
              style={{
                background: isActive
                  ? `${stage.color}20`
                  : isPast
                  ? `${stage.color}0D`
                  : "rgba(255,255,255,0.02)",
                borderColor: isActive
                  ? `${stage.color}50`
                  : isPast
                  ? `${stage.color}25`
                  : "rgba(255,255,255,0.05)",
                color: isActive
                  ? stage.color
                  : isPast
                  ? `${stage.color}99`
                  : "#3A4150",
              }}
            >
              {stage.label}
              {isActive && (
                <span
                  className="absolute bottom-[-1px] left-1/2 -translate-x-1/2 w-3/5 h-0.5 rounded-t-sm"
                  style={{ background: stage.color }}
                />
              )}
            </div>
            {!isLast && (
              <div
                className="w-0 h-0 flex-shrink-0 z-[1]"
                style={{
                  borderTop: "12px solid transparent",
                  borderBottom: "12px solid transparent",
                  borderLeft: `7px solid ${isPast ? `${stage.color}25` : "rgba(255,255,255,0.05)"}`,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});
