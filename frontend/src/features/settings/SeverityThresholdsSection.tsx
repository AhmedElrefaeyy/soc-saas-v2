import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { apiClient } from "@/api/client";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import { extractApiError } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeverityThresholds {
  critical_min_score: number;  // 0–100
  high_min_score:     number;
  medium_min_score:   number;
  low_min_score:      number;
  escalate_after_minutes: number;
  auto_close_after_days:  number;
}

const DEFAULT: SeverityThresholds = {
  critical_min_score: 80, high_min_score: 60, medium_min_score: 30, low_min_score: 0,
  escalate_after_minutes: 60, auto_close_after_days: 30,
};

// ─── Score slider ─────────────────────────────────────────────────────────────

function ScoreSlider({
  label, value, min, max, color, onChange,
}: { label: string; value: number; min: number; max: number; color: string; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className={cn("text-xs font-semibold", color)}>{label}</label>
        <span className={cn("text-sm font-bold tabular-nums", color)}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
      <div className="flex justify-between text-2xs text-text-disabled">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// ─── SeverityThresholdsSection ────────────────────────────────────────────────

export function SeverityThresholdsSection() {
  const qc = useQueryClient();
  const [local, setLocal] = useState<SeverityThresholds>(DEFAULT);
  const [dirty, setDirty] = useState(false);

  useQuery({
    queryKey: ["severity-thresholds"],
    queryFn: () => apiClient.get<SeverityThresholds>("/settings/severity-thresholds").then((r) => r.data),
    onSuccess: (data: SeverityThresholds) => { setLocal(data); setDirty(false); },
    staleTime: 60_000,
  } as Parameters<typeof useQuery>[0]);

  const mutation = useMutation({
    mutationFn: (payload: SeverityThresholds) =>
      apiClient.put<SeverityThresholds>("/settings/severity-thresholds", payload).then((r) => r.data),
    onSuccess: (data: SeverityThresholds) => {
      void qc.setQueryData(["severity-thresholds"], data);
      toastSuccess("Thresholds saved");
      setDirty(false);
    },
    onError: (e: unknown) => toastError(extractApiError(e), "Failed to save"),
  });

  const update = (key: keyof SeverityThresholds, value: number) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const levels = [
    { key: "critical_min_score" as const, label: "Critical minimum", color: "text-severity-critical", min: 50, max: 100 },
    { key: "high_min_score"     as const, label: "High minimum",     color: "text-severity-high",     min: 25, max: 90  },
    { key: "medium_min_score"   as const, label: "Medium minimum",   color: "text-severity-medium",   min: 0,  max: 70  },
    { key: "low_min_score"      as const, label: "Low minimum",      color: "text-severity-low",      min: 0,  max: 50  },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-text-primary">Severity Thresholds</h3>
        <p className="text-xs text-text-muted mt-0.5">Define minimum threat scores for each severity tier.</p>
      </div>

      {/* Score sliders */}
      <div className="rounded-xl border border-border bg-bg-elevated p-4 space-y-5">
        {levels.map(({ key, label, color, min, max }) => (
          <ScoreSlider key={key} label={label} value={local[key]} min={min} max={max} color={color} onChange={(v) => update(key, v)} />
        ))}
      </div>

      {/* Color-coded preview bar */}
      <div className="rounded-xl border border-border bg-bg-card p-4">
        <p className="text-2xs uppercase tracking-wider text-text-muted mb-3">Score Bands Preview</p>
        <div className="flex h-6 rounded-lg overflow-hidden">
          <div className="bg-severity-low/60"             style={{ width: `${local.low_min_score}%` }} />
          <div className="bg-severity-medium/60"          style={{ width: `${local.medium_min_score - local.low_min_score}%` }} />
          <div className="bg-severity-high/60"            style={{ width: `${local.high_min_score - local.medium_min_score}%` }} />
          <div className="bg-severity-critical/60 flex-1" />
        </div>
        <div className="flex justify-between text-2xs text-text-muted mt-1">
          <span>0</span>
          <span className="text-severity-medium">{local.medium_min_score}</span>
          <span className="text-severity-high">{local.high_min_score}</span>
          <span className="text-severity-critical">{local.critical_min_score}</span>
          <span>100</span>
        </div>
      </div>

      {/* Escalation & auto-close */}
      <div className="rounded-xl border border-border bg-bg-elevated p-4 grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary">Escalate After (min)</label>
          <input
            type="number" min={5} max={1440}
            value={local.escalate_after_minutes}
            onChange={(e) => update("escalate_after_minutes", Number(e.target.value))}
            className="w-full px-2.5 py-1.5 rounded-lg bg-bg-card border border-border text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary">Auto-close After (days)</label>
          <input
            type="number" min={1} max={365}
            value={local.auto_close_after_days}
            onChange={(e) => update("auto_close_after_days", Number(e.target.value))}
            className="w-full px-2.5 py-1.5 rounded-lg bg-bg-card border border-border text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          disabled={!dirty || mutation.isPending}
          onClick={() => mutation.mutate(local)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          <Save size={13} />
          {mutation.isPending ? "Saving…" : "Save Thresholds"}
        </button>
      </div>
    </div>
  );
}
