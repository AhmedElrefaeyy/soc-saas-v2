import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Eye, EyeOff } from "lucide-react";
import { ticketingApi } from "@/api/ticketing";
import type { TicketProvider, TicketingConfig } from "@/api/ticketing";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import { extractApiError } from "@/lib/utils";

// ─── Provider tabs ────────────────────────────────────────────────────────────

const PROVIDERS: { value: TicketProvider; label: string }[] = [
  { value: "jira",        label: "Jira"        },
  { value: "servicenow",  label: "ServiceNow"  },
  { value: "pagerduty",   label: "PagerDuty"   },
];

const DEFAULT_CONFIG: TicketingConfig = {
  provider: "jira", api_token: "", base_url: "", project_key: "", default_assignee: "", enabled: false,
};

const PLACEHOLDERS: Record<string, string> = {
  jira_base_url:       "https://yourcompany.atlassian.net",
  servicenow_base_url: "https://yourcompany.service-now.com",
  pagerduty_base_url:  "https://api.pagerduty.com",
  jira_project_key:    "SOC",
  servicenow_project_key: "SIRT",
  pagerduty_project_key:  "routing-key",
};

function placeholder(provider: TicketProvider, key: string): string {
  return PLACEHOLDERS[`${provider}_${key}`] ?? "";
}

// ─── TicketingConfigSection ───────────────────────────────────────────────────

export function TicketingConfigSection() {
  const qc = useQueryClient();
  const [activeProvider, setActiveProvider] = useState<TicketProvider>("jira");
  const [configs, setConfigs]   = useState<Partial<Record<TicketProvider, TicketingConfig>>>({});
  const [showToken, setShowToken] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ["ticketing-configs"],
    queryFn: () => ticketingApi.getAllConfigs(),
    onSuccess: (data: TicketingConfig[]) => {
      const map: Partial<Record<TicketProvider, TicketingConfig>> = {};
      for (const c of data) map[c.provider] = c;
      setConfigs(map);
    },
    staleTime: 60_000,
  } as Parameters<typeof useQuery>[0]);

  const current = configs[activeProvider] ?? { ...DEFAULT_CONFIG, provider: activeProvider };

  const update = (key: keyof TicketingConfig, value: string | boolean) => {
    setConfigs((prev) => ({
      ...prev,
      [activeProvider]: { ...current, [key]: value },
    }));
  };

  const saveMutation = useMutation({
    mutationFn: ticketingApi.saveConfig,
    onSuccess: (data: TicketingConfig) => {
      void qc.invalidateQueries({ queryKey: ["ticketing-configs"] });
      setConfigs((prev) => ({ ...prev, [data.provider]: data }));
      toastSuccess(`${data.provider} configuration saved`);
    },
    onError: (e: unknown) => toastError(extractApiError(e), "Save failed"),
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-text-primary">Ticketing Integrations</h3>
        <p className="text-xs text-text-muted mt-0.5">Connect Jira, ServiceNow, or PagerDuty to auto-create tickets from investigations.</p>
      </div>

      {/* Provider tabs */}
      <div className="flex border-b border-border gap-1">
        {PROVIDERS.map((p) => {
          const cfg = configs[p.value];
          return (
            <button
              key={p.value}
              onClick={() => setActiveProvider(p.value)}
              className={cn(
                "px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors",
                activeProvider === p.value
                  ? "border-accent text-accent"
                  : "border-transparent text-text-muted hover:text-text-secondary",
              )}
            >
              {p.label}
              {cfg?.enabled && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-status-ok inline-block" />}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="skel h-48 rounded-xl animate-pulse" />
      ) : (
        <div className="space-y-4 rounded-xl border border-border bg-bg-elevated p-4">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-primary">Enable {PROVIDERS.find((p) => p.value === activeProvider)?.label}</p>
              <p className="text-2xs text-text-muted mt-0.5">Requires valid credentials below.</p>
            </div>
            <button
              onClick={() => update("enabled", !current.enabled)}
              className={cn(
                "relative w-10 h-5 rounded-full transition-colors",
                current.enabled ? "bg-accent" : "bg-bg-elevated border border-border",
              )}
              aria-label={current.enabled ? "Disable integration" : "Enable integration"}
            >
              <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", current.enabled ? "translate-x-5" : "translate-x-0.5")} />
            </button>
          </div>

          {/* Base URL */}
          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider text-text-muted">Base URL</label>
            <input
              value={current.base_url}
              onChange={(e) => update("base_url", e.target.value)}
              placeholder={placeholder(activeProvider, "base_url")}
              className="w-full px-2.5 py-1.5 rounded-lg bg-bg-card border border-border text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* API Token */}
          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider text-text-muted">
              {activeProvider === "pagerduty" ? "Integration Key" : "API Token"}
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={current.api_token}
                onChange={(e) => update("api_token", e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full px-2.5 pr-8 py-1.5 rounded-lg bg-bg-card border border-border text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2 top-1.5 text-text-muted hover:text-text-secondary transition-colors"
              >
                {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {/* Project key */}
          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider text-text-muted">
              {activeProvider === "pagerduty" ? "Routing Key" : "Project Key"}
            </label>
            <input
              value={current.project_key ?? ""}
              onChange={(e) => update("project_key", e.target.value)}
              placeholder={placeholder(activeProvider, "project_key")}
              className="w-full px-2.5 py-1.5 rounded-lg bg-bg-card border border-border text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Default assignee */}
          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider text-text-muted">Default Assignee (optional)</label>
            <input
              value={current.default_assignee ?? ""}
              onChange={(e) => update("default_assignee", e.target.value)}
              placeholder="username or email"
              className="w-full px-2.5 py-1.5 rounded-lg bg-bg-card border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate(current)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          <Save size={13} />
          {saveMutation.isPending ? "Saving…" : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}
