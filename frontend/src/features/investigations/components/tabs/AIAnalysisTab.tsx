import React, { useState } from "react";
import { Brain, ChevronRight, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRunAIAnalysis } from "../../hooks/useInvestigationDetail";
import type { InvestigationDetail, AIAnalysis } from "../../hooks/useInvestigationDetail";

const KILL_CHAIN_LABELS = ["Recon", "Weapon.", "Delivery", "Exploit", "Install", "C2", "Actions"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function KillChainBar({ index }: { index: number }) {
  return (
    <div className="flex gap-0.5 items-end">
      {KILL_CHAIN_LABELS.map((label, i) => {
        const isPast    = i < index;
        const isCurrent = i === index;
        const color     = isCurrent ? "#EF4444" : isPast ? "#F97316" : "#3A4150";
        return (
          <div key={i} className="flex-1 text-center">
            <div
              className="h-1.5 rounded-sm mb-1"
              style={{ background: color, boxShadow: isCurrent ? `0 0 8px ${color}` : "none" }}
            />
            <div
              className="text-2xs font-mono uppercase"
              style={{
                fontSize: "7px",
                color: isCurrent ? "#F5F7FA" : isPast ? "#8B95A7" : "#3A4150",
                fontWeight: isCurrent ? 700 : 500,
              }}
            >
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VerdictCard({ analysis }: { analysis: AIAnalysis }) {
  const { verdict_suggestion: v, verdict_confidence: conf } = analysis;
  const cfg =
    v === "true_positive"
      ? { label: "True Positive",       color: "#EF4444" }
      : v === "false_positive"
      ? { label: "False Positive",      color: "#10B981" }
      : { label: "Needs Investigation", color: "#F59E0B" };
  const pct = Math.round(conf * 100);
  return (
    <div
      className="p-3.5 rounded-lg border"
      style={{ borderColor: `${cfg.color}40`, background: `${cfg.color}0A` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full" style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
        <span className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
      </div>
      <div className="text-xs text-tx-3 mb-1.5">
        Confidence: <span className="text-text-primary font-semibold">{pct}%</span>
      </div>
      <div className="h-1 bg-white/6 rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm transition-all duration-500"
          style={{ width: `${pct}%`, background: cfg.color }}
        />
      </div>
    </div>
  );
}

function CopyableAction({ text, index }: { text: string; index: number }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-2xs font-bold text-blue-400 flex-shrink-0 mt-0.5">
        {index + 1}
      </span>
      <span className="flex-1 text-xs text-text-secondary leading-relaxed">{text}</span>
      <button
        onClick={copy}
        aria-label="Copy action"
        className="flex-shrink-0 p-0.5 text-text-disabled hover:text-text-muted transition-colors"
      >
        {copied ? <Check size={12} className="text-status-online" /> : <Copy size={12} />}
      </button>
    </div>
  );
}

// ─── AIAnalysisTab ────────────────────────────────────────────────────────────

interface Props {
  inv: InvestigationDetail;
  id: string;
}

export const AIAnalysisTab = React.memo(function AIAnalysisTab({ inv, id }: Props) {
  const runAnalysis = useRunAIAnalysis(id);
  const [narrativeOpen, setNarrativeOpen] = useState(false);
  const analysis = inv.ai_analysis_json;

  if (runAnalysis.isPending) {
    return (
      <div className="text-center py-20">
        <div className="w-10 h-10 rounded-full border-[3px] border-purple-500/20 border-t-purple-400 mx-auto mb-4 animate-spin" />
        <div className="text-sm font-semibold text-text-muted">Analyzing investigation...</div>
        <div className="text-xs text-text-disabled mt-1">This may take 10–30 seconds</div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-full bg-purple-500/8 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
          <Brain size={28} className="text-purple-400" />
        </div>
        <div className="text-base font-bold text-text-muted mb-1.5">No AI Analysis Yet</div>
        <div className="text-xs text-text-disabled mb-6">
          Automatically runs for HIGH/CRITICAL investigations
        </div>
        <Button variant="primary" size="sm" onClick={() => runAnalysis.mutate()}>
          <Brain size={13} /> Run AI Analysis
        </Button>
      </div>
    );
  }

  const actor    = analysis.threat_actor_details;
  const actorConf = Math.round((actor?.confidence ?? 0) * 100);

  return (
    <div className="flex flex-col gap-3 max-w-[800px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-purple-400" />
          <span className="text-sm font-bold text-text-primary">AI Analysis</span>
          <span className="text-2xs px-1.5 py-px rounded bg-purple-500/15 text-purple-400 font-mono font-semibold">
            {analysis.rag_sources_used?.length ?? 0} sources
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => runAnalysis.mutate()}>
          Re-analyze
        </Button>
      </div>

      <div className="bg-bg-subtle border border-border-card rounded-lg p-3.5">
        <div className="text-2xs font-bold uppercase tracking-widest text-text-muted mb-3">
          Kill Chain Stage
        </div>
        <KillChainBar index={analysis.kill_chain_index ?? 3} />
        <div className="mt-2 text-xs text-purple-400 font-semibold">{analysis.kill_chain_stage}</div>
      </div>

      <VerdictCard analysis={analysis} />

      <div className="bg-bg-subtle border border-border-card rounded-lg p-3.5">
        <div className="text-2xs font-bold uppercase tracking-widest text-text-muted mb-2.5">
          Threat Actor Attribution
        </div>
        {analysis.threat_actor_attribution === "Unknown" ? (
          <div className="text-xs text-text-muted">No known threat actor match</div>
        ) : (
          <div>
            <div className="text-sm font-bold text-text-primary mb-1">
              Likely: {analysis.threat_actor_attribution}
              {actorConf > 0 && (
                <span className="ml-2 text-xs text-purple-400 font-medium">({actorConf}% match)</span>
              )}
            </div>
            {actor?.matching_ttps?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {actor.matching_ttps.map((ttp: string) => (
                  <span
                    key={ttp}
                    className="text-xs px-1.5 py-px rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono"
                  >
                    {ttp}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {analysis.executive_summary && (
        <div className="bg-bg-subtle border border-border-card rounded-lg p-3.5">
          <div className="text-2xs font-bold uppercase tracking-widest text-text-muted mb-2.5">
            Executive Summary
          </div>
          <p className="text-sm text-text-secondary leading-relaxed m-0">{analysis.executive_summary}</p>
        </div>
      )}

      {(() => {
        const ev = analysis.evidence_strength;
        const hasEvidence = (ev?.strong?.length ?? 0) + (ev?.circumstantial?.length ?? 0) + (ev?.noise?.length ?? 0) > 0;
        if (!hasEvidence) return null;
        return (
          <div className="bg-bg-subtle border border-border-card rounded-lg p-3.5">
            <div className="text-2xs font-bold uppercase tracking-widest text-text-muted mb-3">
              Evidence Strength
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {([
                { label: "Strong",         color: "#EF4444", items: ev?.strong         ?? [] },
                { label: "Circumstantial", color: "#F59E0B", items: ev?.circumstantial ?? [] },
                { label: "Noise",          color: "#8B95A7", items: ev?.noise          ?? [] },
              ] as const).map(({ label, color, items }) => (
                <div key={label}>
                  <div className="flex items-center gap-1.5 text-xs font-bold mb-1.5" style={{ color }}>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                    {label} ({items.length})
                  </div>
                  <div className="flex flex-col gap-1">
                    {items.map((s: string, i: number) => (
                      <div
                        key={i}
                        className="text-xs text-text-secondary py-1 px-2.5 bg-bg-subtle rounded border border-border leading-snug"
                      >
                        {s}
                      </div>
                    ))}
                    {items.length === 0 && <span className="text-xs text-text-disabled">None</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {analysis.recommended_actions?.length > 0 && (
        <div className="bg-bg-subtle border border-border-card rounded-lg p-3.5">
          <div className="text-2xs font-bold uppercase tracking-widest text-text-muted mb-3">
            Recommended Actions
          </div>
          <div className="flex flex-col gap-2">
            {analysis.recommended_actions.map((action: string, i: number) => (
              <CopyableAction key={i} text={action} index={i} />
            ))}
          </div>
        </div>
      )}

      {analysis.attack_narrative && (
        <div className="bg-bg-subtle border border-border-card rounded-lg p-3.5">
          <button
            onClick={() => setNarrativeOpen((v) => !v)}
            className="flex items-center justify-between w-full bg-transparent border-none cursor-pointer p-0"
          >
            <div className="text-2xs font-bold uppercase tracking-widest text-text-muted">
              Attack Narrative
            </div>
            <ChevronRight
              size={14}
              className="text-text-muted transition-transform"
              style={{ transform: narrativeOpen ? "rotate(90deg)" : "rotate(0deg)" }}
            />
          </button>
          {narrativeOpen && (
            <p className="text-xs text-tx-3 leading-relaxed mt-2.5 m-0 font-mono">
              {analysis.attack_narrative}
            </p>
          )}
        </div>
      )}

      {analysis.analyst_feedback && (
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Check size={12} className="text-status-online" />
          Analyst feedback: {analysis.analyst_feedback.verdict?.replace(/_/g, " ")}
          {analysis.analyst_feedback.agreed_with_ai !== null && (
            <span className={analysis.analyst_feedback.agreed_with_ai ? "text-status-online" : "text-sev-medium"}>
              · {analysis.analyst_feedback.agreed_with_ai ? "Agreed with AI" : "Disagreed with AI"}
            </span>
          )}
        </div>
      )}
    </div>
  );
});
