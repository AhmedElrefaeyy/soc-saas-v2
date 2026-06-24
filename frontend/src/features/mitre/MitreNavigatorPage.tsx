import { useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import { apiClient } from "@/api/client";
import { MITRE_TACTICS } from "@/data/mitreMatrix";
import { cn } from "@/lib/utils";

// ─── Coverage data ─────────────────────────────────────────────────────────────

interface TechniqueCoverage {
  technique_id: string;
  rule_count: number;
}

function useCoverageData() {
  return useQuery({
    queryKey: ["rules", "coverage", "techniques"],
    queryFn: () =>
      apiClient.get<TechniqueCoverage[]>("/rules?group_by=mitre_technique").then((r) => r.data),
    staleTime: 300_000,
  });
}

// ─── Cell color ───────────────────────────────────────────────────────────────

function cellBgClass(count: number | undefined): string {
  if (!count || count === 0) return "bg-bg-subtle hover:bg-bg-elevated";
  if (count <= 5)  return "bg-severity-low/20 hover:bg-severity-low/30";
  if (count <= 20) return "bg-severity-medium/20 hover:bg-severity-medium/30";
  return "bg-severity-high/20 hover:bg-severity-high/30";
}

function cellTextClass(count: number | undefined): string {
  if (!count || count === 0) return "text-text-disabled";
  if (count <= 5)  return "text-severity-low";
  if (count <= 20) return "text-severity-medium";
  return "text-severity-high";
}

// ─── Export as PNG ────────────────────────────────────────────────────────────

async function exportPng() {
  const el = document.getElementById("mitre-matrix");
  if (!el) return;
  // Lazy-load html2canvas only when needed
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(el, { backgroundColor: "#0A0A0A", scale: 1.5 });
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a"); a.href = url; a.download = "mitre-navigator.png"; a.click();
}

// ─── MitreNavigatorPage ───────────────────────────────────────────────────────

export function MitreNavigatorPage() {
  useEffect(() => { document.title = "MITRE ATT&CK Navigator — NEURASHIELD"; }, []);

  const navigate = useNavigate();
  const { data: coverage } = useCoverageData();

  const coverageMap = new Map<string, number>(
    (coverage ?? []).map((c) => [c.technique_id, c.rule_count]),
  );

  const handleTechniqueClick = useCallback((techniqueId: string) => {
    navigate(`/alerts?mitre_technique=${techniqueId}`);
  }, [navigate]);

  const maxTechs = Math.max(...MITRE_TACTICS.map((t) => t.techniques.length));

  return (
    <div className="pb-6">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-text-primary font-display">MITRE ATT&CK Navigator</h1>
          <p className="text-xs text-text-muted mt-0.5">Enterprise Matrix v14 — {MITRE_TACTICS.length} tactics, detection coverage overlay</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-3 text-2xs text-text-muted">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-bg-subtle border border-border" /> No coverage</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-severity-low/20" /> 1–5 rules</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-severity-medium/20" /> 6–20</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-severity-high/20" /> 21+</span>
          </div>
          <button onClick={() => void exportPng()} className="btn btn-ghost btn-sm flex items-center gap-1.5">
            <Download size={12} /> Export PNG
          </button>
        </div>
      </div>

      <div id="mitre-matrix" className="overflow-x-auto">
        <div
          className="inline-grid gap-0.5 min-w-max"
          style={{ gridTemplateColumns: `repeat(${MITRE_TACTICS.length}, 120px)` }}
        >
          {/* Tactic headers */}
          {MITRE_TACTICS.map((tactic) => (
            <div
              key={tactic.id}
              className="bg-bg-card border border-border px-2 py-1.5 text-center"
            >
              <p className="text-2xs font-bold text-text-primary leading-tight">{tactic.name}</p>
              <p className="text-2xs text-text-muted mt-0.5">{tactic.shortId}</p>
            </div>
          ))}

          {/* Technique cells — row by row up to maxTechs */}
          {Array.from({ length: maxTechs }, (_, rowIdx) =>
            MITRE_TACTICS.map((tactic) => {
              const tech = tactic.techniques[rowIdx];
              if (!tech) {
                return <div key={`empty-${tactic.id}-${rowIdx}`} className="h-12 bg-transparent" />;
              }
              const count = coverageMap.get(tech.id);
              return (
                <button
                  key={tech.id}
                  title={`${tech.id}: ${tech.name}${count ? ` (${count} rules)` : ""}`}
                  onClick={() => handleTechniqueClick(tech.id)}
                  className={cn(
                    "h-12 px-1.5 py-1 border border-border/60 text-left transition-colors group",
                    cellBgClass(count),
                  )}
                >
                  <p className={cn("text-2xs font-mono leading-tight", cellTextClass(count))}>{tech.id}</p>
                  <p className="text-2xs text-text-muted leading-tight truncate group-hover:text-text-primary transition-colors">
                    {tech.name}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
