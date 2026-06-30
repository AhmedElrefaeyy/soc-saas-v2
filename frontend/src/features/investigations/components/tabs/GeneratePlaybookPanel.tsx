import { useState } from "react";
import { BookOpen, Wand2, Loader2, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { playbooksApi } from "@/api/playbooks";
import type { InvestigationDetail } from "../../hooks/useInvestigationDetail";

interface Props {
  inv: InvestigationDetail;
}

const scoreToSeverity = (score: number) =>
  score >= 90 ? "critical" : score >= 70 ? "high" : score >= 40 ? "medium" : "low";

export function GeneratePlaybookPanel({ inv }: Props) {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await playbooksApi.generate({
        investigation_id: inv.investigation_id,
        severity: scoreToSeverity(inv.threat_score),
      });
      // Invalidate so the parent re-queries linkedPlaybook
      qc.invalidateQueries({ queryKey: ["playbooks", "investigation", inv.investigation_id] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-[480px] mx-auto mt-12 text-center">
      <div
        className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-5"
        style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
      >
        <BookOpen size={26} className="text-blue-400" />
      </div>
      <div className="text-base font-bold text-text-primary mb-2">No playbook attached</div>
      <div className="text-sm text-text-muted mb-6 leading-relaxed max-w-[340px] mx-auto">
        Generate a step-by-step response playbook tailored to this investigation's severity,
        host, and MITRE tactics.
      </div>

      {error && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg border mb-4 text-left"
          style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)" }}
        >
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}

      <Button onClick={handleGenerate} disabled={generating}>
        {generating ? (
          <><Loader2 size={13} className="animate-spin" /> Generating…</>
        ) : (
          <><Wand2 size={13} /> Generate Playbook</>
        )}
      </Button>

      <div className="mt-4 text-2xs text-text-disabled">
        Severity mapped from threat score {inv.threat_score} → {scoreToSeverity(inv.threat_score)}
      </div>
    </div>
  );
}
