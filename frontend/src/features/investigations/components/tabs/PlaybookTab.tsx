import React, { useState } from "react";
import {
  Clock, CheckCircle2, XCircle, SkipForward, Loader2, BookOpen, CheckCheck,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { playbooksApi } from "@/api/playbooks";
import type { Playbook, PlaybookStep } from "@/api/playbooks";

const STEP_STATUS_CONFIG: Record<
  PlaybookStep["status"],
  { icon: React.ElementType; color: string; label: string }
> = {
  pending:     { icon: Clock,        color: "#5C6373", label: "Pending"     },
  in_progress: { icon: Loader2,      color: "#60A5FA", label: "In Progress" },
  completed:   { icon: CheckCircle2, color: "#10B981", label: "Done"        },
  skipped:     { icon: SkipForward,  color: "#F59E0B", label: "Skipped"     },
  failed:      { icon: XCircle,      color: "#EF4444", label: "Failed"      },
};

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {[1, 2, 3].map((i) => <div key={i} className="skel h-16 rounded-lg" />)}
    </div>
  );
}

interface Props {
  playbook: Playbook;
  isActive: boolean;
  onAllComplete?: () => void;
}

export const PlaybookTab = React.memo(function PlaybookTab({ playbook, isActive, onAllComplete }: Props) {
  const qc = useQueryClient();

  const { data: full, isLoading } = useQuery({
    queryKey: ["playbook", playbook.id],
    queryFn:  () => playbooksApi.get(playbook.id),
    enabled:  isActive,
    staleTime: 30_000,
    refetchInterval: isActive ? 15_000 : false,
  });

  const steps = full?.steps ?? [];
  const done  = steps.filter((s) => s.status === "completed" || s.status === "skipped").length;
  const pct   = steps.length > 0 ? (done / steps.length) * 100 : 0;
  const allDone = steps.length > 0 && done === steps.length;

  // Which step has its action drawer open: "complete" | "skip" | null
  const [activeDrawer, setActiveDrawer] = useState<{ id: string; mode: "complete" | "skip" } | null>(null);
  const [drawerNotes, setDrawerNotes]   = useState("");
  const [submitting, setSubmitting]     = useState(false);

  const openDrawer = (step: PlaybookStep, mode: "complete" | "skip") => {
    setActiveDrawer({ id: step.id, mode });
    setDrawerNotes("");
  };

  const closeDrawer = () => {
    setActiveDrawer(null);
    setDrawerNotes("");
  };

  const handleSubmit = async (step: PlaybookStep) => {
    if (!activeDrawer) return;
    setSubmitting(true);
    try {
      await playbooksApi.completeStep(playbook.id, step.id, {
        action: activeDrawer.mode,
        notes:  drawerNotes.trim() || undefined,
      });
      qc.invalidateQueries({ queryKey: ["playbook", playbook.id] });
      closeDrawer();
      // Notify parent after last step
      if (done + 1 === steps.length) onAllComplete?.();
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <TabSkeleton />;

  return (
    <div className="max-w-[720px]">
      {/* Completion banner */}
      {allDone && (
        <div
          className="flex items-center gap-3 p-3.5 rounded-lg border mb-3.5"
          style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.25)" }}
        >
          <CheckCheck size={18} className="text-emerald-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-bold text-emerald-400">All steps complete</div>
            <div className="text-xs text-text-muted mt-0.5">
              Playbook finished — you can now resolve this investigation.
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-bg-subtle border border-border-card rounded-lg p-3.5 mb-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <div className="text-sm font-bold text-text-primary mb-1">{playbook.title}</div>
            <div className="flex items-center gap-2">
              <span
                className="text-2xs px-1.5 py-px rounded font-bold font-mono uppercase"
                style={{
                  background: playbook.created_by_id === null ? "rgba(139,92,246,0.15)" : "rgba(59,130,246,0.15)",
                  color:      playbook.created_by_id === null ? "#A78BFA"               : "#93C5FD",
                }}
              >
                {playbook.created_by_id === null ? "AUTO" : "MANUAL"}
              </span>
              <span className="text-xs text-text-muted uppercase tracking-wider">
                {playbook.severity} · {playbook.status.replace(/_/g, " ")}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-lg font-bold font-mono"
              style={{ color: pct === 100 ? "#10B981" : "#F5F7FA" }}
            >
              {done}/{steps.length}
            </div>
            <div className="text-xs text-text-muted">steps complete</div>
          </div>
        </div>
        <div className="h-1 bg-white/6 rounded-sm overflow-hidden">
          <div
            className="h-full rounded-sm transition-all duration-300"
            style={{
              width:      `${pct}%`,
              background: pct === 100 ? "#10B981" : "#3B82F6",
              boxShadow:  pct > 0 ? `0 0 8px ${pct === 100 ? "#10B98180" : "#3B82F680"}` : "none",
            }}
          />
        </div>
      </div>

      {/* Steps */}
      {steps.length === 0 && (
        <div className="text-center py-16">
          <BookOpen size={36} className="text-text-disabled block mx-auto mb-3" />
          <div className="text-sm font-semibold text-text-muted">No steps</div>
        </div>
      )}
      {steps.sort((a, b) => a.step_order - b.step_order).map((step, i) => {
        const cfg    = STEP_STATUS_CONFIG[step.status];
        const Icon   = cfg.icon;
        const isLast = i === steps.length - 1;
        const drawerOpen = activeDrawer?.id === step.id;
        return (
          <div key={step.id} className="flex gap-3.5" style={{ paddingBottom: isLast ? 0 : 16 }}>
            {/* Spine */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  background:  step.status === "completed" ? `${cfg.color}20` : "rgba(255,255,255,0.04)",
                  border:      `1.5px solid ${step.status === "pending" ? "rgba(255,255,255,0.08)" : cfg.color + "50"}`,
                }}
              >
                <Icon
                  size={13}
                  style={{ color: cfg.color }}
                  className={step.status === "in_progress" ? "animate-spin" : ""}
                />
              </div>
              {!isLast && <div className="w-px flex-1 mt-1 bg-white/5" />}
            </div>

            {/* Content */}
            <div className="flex-1" style={{ paddingBottom: isLast ? 0 : 4 }}>
              <div
                className="rounded-lg p-2.5 border"
                style={{
                  background:  "rgba(255,255,255,0.02)",
                  borderColor: step.status === "completed"
                    ? "rgba(16,185,129,0.15)"
                    : step.status === "skipped"
                    ? "rgba(245,158,11,0.15)"
                    : "rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-2xs px-1.5 py-px rounded bg-white/5 text-text-muted font-mono uppercase">
                        {step.category}
                      </span>
                      <span className="text-2xs font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div
                      className="text-xs font-semibold mb-1"
                      style={{ color: step.status === "completed" || step.status === "skipped" ? "#5C6373" : "#F5F7FA" }}
                    >
                      {step.title}
                    </div>
                    <div className="text-2xs text-tx-3 leading-relaxed">{step.description}</div>
                    {step.notes && (
                      <div className="mt-1.5 text-2xs text-blue-400 italic">Note: {step.notes}</div>
                    )}
                  </div>

                  {step.status === "pending" && !drawerOpen && (
                    <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDrawer(step, "complete")}
                      >
                        <CheckCircle2 size={11} /> Done
                      </Button>
                      <button
                        onClick={() => openDrawer(step, "skip")}
                        className="flex items-center gap-1 px-1.5 py-1 rounded text-2xs text-text-muted hover:text-amber-400 transition-colors"
                        title="Skip step"
                      >
                        <SkipForward size={10} />
                        Skip
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline action drawer */}
                {drawerOpen && (
                  <div
                    className="mt-2.5 pt-2.5 border-t"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <div className="text-2xs text-text-muted mb-1.5 font-semibold uppercase tracking-wider">
                      {activeDrawer!.mode === "skip" ? "Skip reason (optional)" : "Notes (optional)"}
                    </div>
                    <textarea
                      autoFocus
                      value={drawerNotes}
                      onChange={(e) => setDrawerNotes(e.target.value)}
                      placeholder={
                        activeDrawer!.mode === "skip"
                          ? "Why is this step being skipped?"
                          : "What did you find or do?"
                      }
                      rows={2}
                      className="w-full resize-none rounded bg-bg-input border border-border text-xs text-text-primary placeholder:text-text-disabled p-2 focus:outline-none focus:border-accent/50"
                    />
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Button
                        size="sm"
                        variant={activeDrawer!.mode === "skip" ? "secondary" : "primary"}
                        loading={submitting}
                        onClick={() => handleSubmit(step)}
                      >
                        {activeDrawer!.mode === "skip" ? (
                          <><SkipForward size={11} /> Skip step</>
                        ) : (
                          <><CheckCircle2 size={11} /> Mark done</>
                        )}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={closeDrawer} disabled={submitting}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});
