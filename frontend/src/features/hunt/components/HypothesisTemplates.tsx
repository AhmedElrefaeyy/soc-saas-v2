import { useState } from "react";
import { ChevronRight, ChevronDown, BookOpen, Search } from "lucide-react";
import { HUNT_TEMPLATES } from "@/data/huntTemplates";
import type { HuntTemplate } from "@/data/huntTemplates";
import { cn } from "@/lib/utils";

// ─── Group templates by tactic ────────────────────────────────────────────────

function groupByTactic(templates: HuntTemplate[]): Map<string, HuntTemplate[]> {
  const map = new Map<string, HuntTemplate[]>();
  for (const t of templates) {
    const key = t.tactic ?? "General";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return map;
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({ template, onSelect }: { template: HuntTemplate; onSelect: (t: HuntTemplate) => void }) {
  return (
    <button
      onClick={() => onSelect(template)}
      className="w-full text-left px-3 py-2 rounded-lg hover:bg-bg-elevated transition-colors group"
    >
      <p className="text-xs font-semibold text-text-secondary group-hover:text-text-primary transition-colors">{template.name}</p>
      <p className="text-2xs text-text-muted mt-0.5 line-clamp-2">{template.description}</p>
      {template.kql && (
        <code className="text-2xs text-accent/80 font-mono mt-1 block truncate">{template.kql}</code>
      )}
    </button>
  );
}

// ─── Tactic group ─────────────────────────────────────────────────────────────

function TacticGroup({ tactic, templates, onSelect }: { tactic: string; templates: HuntTemplate[]; onSelect: (t: HuntTemplate) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-bg-card hover:bg-bg-elevated transition-colors"
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDown size={11} className="text-text-muted" /> : <ChevronRight size={11} className="text-text-muted" />}
        <span className="text-xs font-bold text-text-secondary flex-1 text-left">{tactic}</span>
        <span className="text-2xs text-text-muted">{templates.length}</span>
      </button>

      {expanded && (
        <div className="border-t border-border bg-bg-card divide-y divide-border/50">
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── HypothesisTemplates ──────────────────────────────────────────────────────

interface Props {
  onSelect: (template: HuntTemplate) => void;
  className?: string;
}

export function HypothesisTemplates({ onSelect, className }: Props) {
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState(true);

  const filtered = HUNT_TEMPLATES.filter(
    (t) => !filter || t.name.toLowerCase().includes(filter.toLowerCase()) || (t.description ?? "").toLowerCase().includes(filter.toLowerCase()),
  );

  const grouped = groupByTactic(filtered);

  return (
    <div className={cn("border border-border rounded-xl bg-bg-card overflow-hidden flex flex-col", className)}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 px-4 py-2.5 hover:bg-bg-elevated transition-colors flex-shrink-0"
        aria-expanded={expanded}
      >
        <BookOpen size={12} className="text-accent" />
        <span className="text-xs font-bold text-text-secondary flex-1 text-left">Hypothesis Templates</span>
        {expanded ? <ChevronDown size={11} className="text-text-muted" /> : <ChevronRight size={11} className="text-text-muted" />}
      </button>

      {expanded && (
        <>
          {/* Search */}
          <div className="px-3 pb-2 border-b border-border flex-shrink-0">
            <div className="relative">
              <Search size={10} className="absolute left-2 top-1.5 text-text-muted pointer-events-none" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter templates…"
                className="w-full pl-6 pr-2 py-1 text-xs bg-bg-elevated border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* Groups */}
          <div className="overflow-y-auto flex-1 p-2 space-y-1.5" style={{ maxHeight: 380 }}>
            {grouped.size === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">No templates match.</p>
            ) : (
              Array.from(grouped.entries()).map(([tactic, templates]) => (
                <TacticGroup key={tactic} tactic={tactic} templates={templates} onSelect={onSelect} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
