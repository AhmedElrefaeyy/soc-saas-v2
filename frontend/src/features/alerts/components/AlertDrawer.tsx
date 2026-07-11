import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict, format } from "date-fns";
import {
  Shield, Monitor, User, Globe, Brain, Link2, Clock, Tag,
  AlertTriangle, CheckCircle, XCircle, BarChart2, Send,
  ExternalLink, ChevronRight, FolderSearch, RotateCcw, Eye,
  ChevronDown, MessageSquare,
} from "lucide-react";
import * as Select from "@radix-ui/react-select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { promoteAlert } from "@/features/investigations/api/investigationsApi";
import { updateAlert } from "@/services/alertsApi";
import { settingsApi } from "@/api/settings";
import { cn, extractApiError } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Badge, SeverityBadge } from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { SkeletonText } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAlertDetail, useAlertContext, useAlertTimeline } from "../hooks/useAlerts";
import { alertsKeys } from "../hooks/useAlerts";
import { useTenantStore } from "@/stores/tenantStore";
import type { Alert, AlertRiskContext, AlertTimelineEvent, AIVerdictType, AlertStatus } from "../types";

// ─── Status display ───────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<AlertStatus, "default" | "primary" | "success" | "info"> = {
  open:           "default",
  acknowledged:   "primary",
  closed:         "success",
  false_positive: "info",
};
const STATUS_LABEL: Record<AlertStatus, string> = {
  open: "Open", acknowledged: "Acknowledged", closed: "Closed", false_positive: "False Positive",
};

// ─── AI verdict display ───────────────────────────────────────────────────────

const VERDICT_ICON: Record<AIVerdictType, React.ReactNode> = {
  true_positive:  <AlertTriangle className="w-4 h-4 text-severity-critical" />,
  false_positive: <CheckCircle className="w-4 h-4 text-status-online" />,
  benign:         <CheckCircle className="w-4 h-4 text-text-muted" />,
  pending:        <Brain className="w-4 h-4 text-severity-medium" />,
};
const VERDICT_LABEL: Record<AIVerdictType, string> = {
  true_positive: "True Positive", false_positive: "False Positive",
  benign: "Benign", pending: "Pending Analysis",
};

// ─── Section: Overview ────────────────────────────────────────────────────────

function OverviewSection({ alert }: { alert: Alert }) {
  return (
    <div className="space-y-4">
      {/* Description */}
      <div className="bg-bg-subtle rounded-lg p-3">
        <p className="text-sm text-text-secondary leading-relaxed">{alert.description}</p>
      </div>

      {/* Key attributes grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <Attr icon={<Shield className="w-3.5 h-3.5" />} label="Severity">
          <SeverityBadge severity={alert.severity} />
        </Attr>
        <Attr icon={<Clock className="w-3.5 h-3.5" />} label="Status">
          <Badge variant={STATUS_VARIANT[alert.status]}>{STATUS_LABEL[alert.status]}</Badge>
        </Attr>
        <Attr icon={<Monitor className="w-3.5 h-3.5" />} label="Hostname">
          <span className="text-xs font-mono text-text-secondary">{alert.hostname || "—"}</span>
        </Attr>
        <Attr icon={<User className="w-3.5 h-3.5" />} label="Username">
          <span className="text-xs text-text-secondary">{alert.username || "—"}</span>
        </Attr>
        <Attr icon={<Globe className="w-3.5 h-3.5" />} label="Source IP">
          <span className="text-xs font-mono text-text-secondary">{alert.sourceIp || "—"}</span>
        </Attr>
        <Attr icon={<BarChart2 className="w-3.5 h-3.5" />} label="Raw Events">
          <span className="text-xs text-text-secondary tabular-nums">{alert.rawEventCount}</span>
        </Attr>
        <Attr icon={<Clock className="w-3.5 h-3.5" />} label="First Seen">
          <span className="text-xs text-text-muted">
            {formatDistanceToNowStrict(new Date(alert.firstSeenAt), { addSuffix: true })}
          </span>
        </Attr>
        <Attr icon={<Clock className="w-3.5 h-3.5" />} label="Last Seen">
          <span className="text-xs text-text-muted">
            {formatDistanceToNowStrict(new Date(alert.lastSeenAt), { addSuffix: true })}
          </span>
        </Attr>
      </div>

      {/* MITRE */}
      {alert.mitre && (
        <div className="border border-border rounded-lg p-3 space-y-1">
          <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">MITRE ATT&amp;CK</p>
          <div className="flex flex-wrap gap-2 mt-1.5">
            <span className="px-2 py-0.5 text-xs font-mono bg-accent/10 text-accent border border-accent/20 rounded">
              {alert.mitre.techniqueId}
            </span>
            <span className="text-sm text-text-secondary">{alert.mitre.techniqueName}</span>
          </div>
          <p className="text-xs text-text-muted">{alert.mitre.tacticName} ({alert.mitre.tacticId})</p>
        </div>
      )}

      {/* Tags */}
      {alert.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {alert.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-2 py-0.5 text-xs bg-bg-elevated text-text-muted border border-border rounded-full"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Risk Context */}
      {alert.riskContext && <RiskContextCard rc={alert.riskContext} />}
    </div>
  );
}

// ─── Risk Context Card ────────────────────────────────────────────────────────

const ESCALATION_REASON_LABEL: Record<string, string> = {
  threat_ip_confirmed_malicious: "Confirmed malicious IP (AbuseIPDB ≥ 75)",
  threat_ip_suspicious:          "Suspicious IP (AbuseIPDB ≥ 25 or threat feed hit)",
  ueba_strong_anomaly:           "Strong behavioral anomaly (UEBA ≥ 0.80)",
  ueba_moderate_anomaly:         "Moderate behavioral anomaly (UEBA ≥ 0.60)",
  compound_threat_intel_and_ueba:"Compound: threat IP + behavioral anomaly",
  critical_attack_chain_detected:"Critical attack chain detected (floored to HIGH)",
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "text-severity-critical",
  high:     "text-severity-high",
  medium:   "text-severity-medium",
  low:      "text-severity-low",
  info:     "text-text-muted",
};

function RiskContextCard({ rc }: { rc: AlertRiskContext }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-bg-elevated hover:bg-bg-subtle transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-medium text-text-primary">Risk Assessment</span>
          {rc.severityEscalated && (
            <span className="px-1.5 py-0.5 text-2xs font-semibold bg-severity-critical/15 text-severity-critical border border-severity-critical/25 rounded">
              ESCALATED
            </span>
          )}
        </div>
        <ChevronRight
          className={cn(
            "w-3.5 h-3.5 text-text-muted transition-transform duration-150",
            expanded && "rotate-90"
          )}
        />
      </button>

      {expanded && (
        <div className="px-3 py-3 space-y-3 border-t border-border bg-bg-subtle/50">
          {/* Severity delta */}
          <div className="flex items-center gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="text-2xs text-text-muted uppercase tracking-wider">Rule Severity</p>
              <span className={cn("font-semibold capitalize", SEVERITY_COLOR[rc.ruleSeverity])}>
                {rc.ruleSeverity}
              </span>
            </div>
            {rc.severityEscalated && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-2xs text-text-muted uppercase tracking-wider">Final Severity</p>
                  <span className={cn("font-semibold capitalize", SEVERITY_COLOR[rc.finalSeverity])}>
                    {rc.finalSeverity}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Escalation reasons */}
          {rc.escalationReasons.length > 0 && (
            <div className="space-y-1">
              <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">
                Escalation Reasons
              </p>
              <ul className="space-y-1">
                {rc.escalationReasons.map((r) => (
                  <li key={r} className="flex items-start gap-1.5 text-xs text-text-secondary">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-severity-critical flex-shrink-0" />
                    {ESCALATION_REASON_LABEL[r] ?? r.replace(/_/g, " ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* UEBA */}
          {(rc.uebaScore > 0 || rc.uebaFlags.length > 0) && (
            <div className="space-y-1">
              <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">UEBA</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      rc.uebaScore >= 0.8 ? "bg-severity-critical" :
                      rc.uebaScore >= 0.6 ? "bg-severity-high" :
                      rc.uebaScore >= 0.4 ? "bg-severity-medium" : "bg-severity-low"
                    )}
                    style={{ width: `${Math.round(rc.uebaScore * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-text-secondary w-10 text-right">
                  {Math.round(rc.uebaScore * 100)}%
                </span>
              </div>
              {rc.uebaFlags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {rc.uebaFlags.map((f) => (
                    <span key={f} className="px-1.5 py-0.5 text-2xs font-mono bg-severity-high/10 text-severity-high border border-severity-high/20 rounded">
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Threat Intel */}
          {(rc.isThreatIp || rc.abuseConfidence > 0 || rc.threatIntelFlags.length > 0) && (
            <div className="space-y-1">
              <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">Threat Intel</p>
              <div className="flex items-center gap-3 text-xs text-text-secondary">
                {rc.isThreatIp && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-severity-critical" />
                    Threat IP
                  </span>
                )}
                {rc.abuseConfidence > 0 && (
                  <span>AbuseIPDB: <span className="font-mono font-semibold">{rc.abuseConfidence}%</span></span>
                )}
              </div>
              {rc.threatIntelFlags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {rc.threatIntelFlags.map((f) => (
                    <span key={f} className="px-1.5 py-0.5 text-2xs font-mono bg-severity-critical/10 text-severity-critical border border-severity-critical/20 rounded">
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section: Investigation Context ──────────────────────────────────────────

function InvestigationSection({
  alertId,
  correlationId,
}: {
  alertId: string;
  correlationId?: string;
}) {
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const tenantId  = useTenantStore((s) => s.activeTenant?.id) ?? "";
  const { data: ctx, isLoading } = useAlertContext(alertId);

  const promote = useMutation({
    mutationFn: () => promoteAlert(alertId),
    onSuccess: (res) => {
      toastSuccess("Investigation created successfully");
      qc.invalidateQueries({ queryKey: ["investigations"] });
      qc.invalidateQueries({ queryKey: alertsKeys.context(tenantId, alertId) });
      navigate(`/investigations/${res.investigation_id}`);
    },
    onError: (err) => {
      toastError(extractApiError(err), "Failed to promote alert");
    },
  });

  if (isLoading) return <SkeletonText lines={6} />;

  return (
    <div className="space-y-4">
      {/* Linked investigation */}
      {ctx?.investigation ? (
        <div className="border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-text-primary flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-accent" />
              Linked Investigation
            </p>
            <button
              onClick={() => navigate(`/investigations/${ctx.investigation!.id}`)}
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              Open <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <p className="text-sm text-text-secondary">{ctx.investigation.title}</p>
          <div className="flex gap-3 text-xs text-text-muted">
            <span>{ctx.investigation.alertCount} alerts</span>
            <span>•</span>
            <span className="capitalize">{ctx.investigation.status}</span>
          </div>
        </div>
      ) : correlationId ? (
        <div className="text-xs text-text-muted bg-bg-subtle p-3 rounded-lg">
          Part of correlation group <span className="font-mono text-accent">{correlationId}</span>
        </div>
      ) : (
        <div>
          <EmptyState
            icon={<Link2 className="w-5 h-5" />}
            title="No investigation linked"
            description="This alert hasn't been correlated yet."
            className="py-4"
          />
          <div className="flex justify-center mt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => promote.mutate()}
              disabled={promote.isPending}
              loading={promote.isPending}
            >
              <FolderSearch className="w-3.5 h-3.5" />
              {promote.isPending ? "Promoting…" : "Promote to Investigation"}
            </Button>
          </div>
        </div>
      )}

      {/* Related alerts */}
      {(ctx?.relatedAlerts ?? []).length > 0 && (
        <div className="space-y-1">
          <p className="text-2xs text-text-muted uppercase tracking-wider font-medium mb-2">
            Related Alerts ({ctx!.relatedAlerts.length})
          </p>
          {ctx!.relatedAlerts.slice(0, 5).map((a: Alert) => (
            <div
              key={a.id}
              className="flex items-center gap-2 py-1.5 border-b border-border last:border-0"
            >
              <SeverityBadge severity={a.severity} />
              <span className="flex-1 text-xs text-text-secondary truncate">{a.title}</span>
              <span className="text-2xs text-text-muted flex-shrink-0">
                {formatDistanceToNowStrict(new Date(a.createdAt), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section: Timeline ────────────────────────────────────────────────────────

const TIMELINE_ICONS: Record<string, React.ReactNode> = {
  alert_created:         <AlertTriangle className="w-3 h-3" />,
  status_changed:        <ChevronRight className="w-3 h-3" />,
  assigned:              <User className="w-3 h-3" />,
  note_added:            <Send className="w-3 h-3" />,
  ai_analyzed:           <Brain className="w-3 h-3" />,
  investigation_linked:  <Link2 className="w-3 h-3" />,
  tag_added:             <Tag className="w-3 h-3" />,
  tag_removed:           <Tag className="w-3 h-3" />,
  severity_changed:      <Shield className="w-3 h-3" />,
};

function TimelineEvent({ event }: { event: AlertTimelineEvent }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-6 h-6 rounded-full bg-bg-elevated border border-border flex items-center justify-center text-text-muted">
          {TIMELINE_ICONS[event.eventType] ?? <Clock className="w-3 h-3" />}
        </div>
        <div className="w-px flex-1 bg-border mt-1" />
      </div>
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-text-primary capitalize">
              {event.eventType.replace(/_/g, " ")}
            </p>
            {event.actorName && (
              <p className="text-2xs text-text-muted">by {event.actorName}</p>
            )}
            {typeof event.details.note === "string" && (
              <p className="mt-1 text-xs text-text-secondary bg-bg-subtle rounded p-2">
                {event.details.note}
              </p>
            )}
          </div>
          <span className="text-2xs text-text-muted flex-shrink-0">
            {format(new Date(event.createdAt), "MMM d, HH:mm")}
          </span>
        </div>
      </div>
    </div>
  );
}

function TimelineSection({ alertId }: { alertId: string }) {
  const { data: events, isLoading } = useAlertTimeline(alertId);

  if (isLoading) return <SkeletonText lines={8} />;
  if (!events?.length)
    return (
      <EmptyState
        icon={<Clock className="w-5 h-5" />}
        title="No timeline events"
        description="Events will appear here as the alert progresses."
        className="py-8"
      />
    );

  return (
    <div className="space-y-0">
      {events.map((e: AlertTimelineEvent) => (
        <TimelineEvent key={e.id} event={e} />
      ))}
    </div>
  );
}

// ─── Section: AI Analysis ─────────────────────────────────────────────────────

function AISection({ alert }: { alert: Alert }) {
  const verdict = alert.aiVerdict;

  if (!verdict || verdict.verdict === "pending") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-3 bg-severity-medium/10 border border-severity-medium/20 rounded-lg">
          <Brain className="w-4 h-4 text-severity-medium flex-shrink-0" />
          <p className="text-sm text-severity-medium">
            {verdict ? "AI analysis in progress..." : "Not yet analyzed by AI"}
          </p>
        </div>
        <p className="text-xs text-text-muted">
          The AI investigator will automatically analyze this alert and provide a verdict.
        </p>
      </div>
    );
  }

  const isTP = verdict.verdict === "true_positive";

  return (
    <div className="space-y-4">
      {/* Verdict card */}
      <div
        className={cn(
          "p-4 rounded-lg border",
          isTP
            ? "bg-severity-critical/10 border-severity-critical/20"
            : verdict.verdict === "false_positive"
            ? "bg-status-online/10 border-status-online/20"
            : "bg-bg-subtle border-border"
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          {VERDICT_ICON[verdict.verdict]}
          <span className="text-sm font-semibold text-text-primary">
            {VERDICT_LABEL[verdict.verdict]}
          </span>
          <span className="ml-auto text-xs text-text-muted">
            {verdict.confidence}% confidence
          </span>
        </div>
        <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full",
              isTP ? "bg-severity-critical" : "bg-status-online"
            )}
            style={{ width: `${verdict.confidence}%` }}
          />
        </div>
        {verdict.analyzedAt && (
          <p className="text-2xs text-text-muted mt-2">
            Analyzed {formatDistanceToNowStrict(new Date(verdict.analyzedAt), { addSuffix: true })}
          </p>
        )}
      </div>

      {/* Reasoning */}
      {verdict.reasoning && (
        <div className="space-y-1.5">
          <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">AI Reasoning</p>
          <div className="bg-bg-subtle rounded-lg p-3 border border-border">
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {verdict.reasoning}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Assignment Select ────────────────────────────────────────────────────────

const selectContentCls = cn(
  "z-50 min-w-[180px] overflow-hidden rounded-lg border border-border",
  "bg-bg-card shadow-elevated",
  "data-[state=open]:animate-in data-[state=closed]:animate-out",
  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
);

function AssignmentSelect({
  currentId,
  currentName,
  onAssign,
  disabled,
}: {
  currentId?: string;
  currentName?: string;
  onAssign: (userId: string | null, name: string | null) => void;
  disabled?: boolean;
}) {
  const tenantId = useTenantStore((s) => s.activeTenant?.id) ?? "";
  const { data: members = [] } = useQuery({
    queryKey: ["tenant-members", tenantId],
    queryFn:  () => settingsApi.getMembers(tenantId),
    enabled:  !!tenantId,
    staleTime: 120_000,
  });

  return (
    <Select.Root
      value={currentId ?? "__unassigned__"}
      onValueChange={(v) => {
        if (v === "__unassigned__") {
          onAssign(null, null);
        } else {
          const m = members.find((m) => m.user_id === v);
          onAssign(v, m?.full_name ?? m?.email ?? v);
        }
      }}
      disabled={disabled}
    >
      <Select.Trigger
        className={cn(
          "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-sm",
          "bg-bg-elevated border border-border text-text-secondary",
          "hover:border-border-hover hover:text-text-primary transition-colors",
          "focus:outline-none focus:ring-1 focus:ring-accent",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
        aria-label="Assign alert to analyst"
      >
        <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
          <User size={10} className="text-accent" />
        </div>
        <Select.Value placeholder="Unassigned">
          {currentName ?? "Unassigned"}
        </Select.Value>
        <Select.Icon asChild className="ml-auto text-text-muted">
          <ChevronDown size={12} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className={selectContentCls} position="popper" sideOffset={4}>
          <Select.Viewport className="p-1">
            <Select.Item
              value="__unassigned__"
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-muted rounded cursor-pointer select-none hover:bg-bg-elevated hover:text-text-primary focus:outline-none focus:bg-bg-elevated data-[highlighted]:bg-bg-elevated data-[highlighted]:text-text-primary"
            >
              <User size={10} />
              <Select.ItemText>Unassigned</Select.ItemText>
            </Select.Item>
            {members.map((m) => (
              <Select.Item
                key={m.user_id}
                value={m.user_id}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-secondary rounded cursor-pointer select-none hover:bg-bg-elevated hover:text-text-primary focus:outline-none focus:bg-bg-elevated data-[highlighted]:bg-bg-elevated data-[highlighted]:text-text-primary"
              >
                <div className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 text-2xs font-bold text-accent">
                  {(m.full_name ?? m.email ?? "?")[0].toUpperCase()}
                </div>
                <Select.ItemText>{m.full_name ?? m.email}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

// ─── Threaded notes feed ──────────────────────────────────────────────────────

interface NoteEntry {
  id:        string;
  text:      string;
  author:    string;
  createdAt: number;
}

function NotesFeed({
  existing,
  onSubmit,
  disabled,
}: {
  existing?: string;
  onSubmit: (text: string) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState<NoteEntry[]>(() => {
    if (!existing?.trim()) return [];
    return [{ id: "legacy", text: existing, author: "Analyst", createdAt: Date.now() - 1000 }];
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  const submit = () => {
    const text = draft.trim();
    if (!text || disabled) return;
    const entry: NoteEntry = {
      id: crypto.randomUUID(),
      text,
      author: "Me",
      createdAt: Date.now(),
    };
    setHistory((prev) => [...prev, entry]);
    setDraft("");
    onSubmit(text);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  return (
    <div className="space-y-2">
      {history.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-2 pr-0.5">
          {history.map((entry) => (
            <div key={entry.id} className="flex gap-2">
              <div className="w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-2xs font-bold text-accent">{entry.author[0]}</span>
              </div>
              <div className="flex-1 bg-bg-elevated border border-border rounded-lg px-2.5 py-1.5">
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <span className="text-2xs font-semibold text-text-primary">{entry.author}</span>
                  <span className="text-2xs text-text-muted flex-shrink-0">
                    {formatDistanceToNowStrict(new Date(entry.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-text-secondary whitespace-pre-wrap leading-snug">{entry.text}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
      <div className="flex gap-2">
        <div className="flex-1 flex items-start gap-1.5 bg-bg-elevated border border-border rounded-lg px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-accent">
          <MessageSquare size={12} className="text-text-muted flex-shrink-0 mt-0.5" />
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } }}
            placeholder="Add a note... (Ctrl+Enter to submit)"
            rows={2}
            disabled={disabled}
            aria-label="Add analyst note"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none disabled:opacity-50"
          />
        </div>
        <button
          onClick={submit}
          disabled={disabled || !draft.trim()}
          aria-label="Submit note"
          className="flex items-center justify-center w-8 h-8 mt-0.5 rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <Send size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Section: Analyst ─────────────────────────────────────────────────────────

function AnalystSection({ alert }: { alert: Alert }) {
  const qc = useQueryClient();
  const tenantId = useTenantStore((s) => s.activeTenant?.id) ?? "";

  // Optimistic updates for status / assignment mutations
  const mutation = useMutation({
    mutationFn: (payload: { status?: string; notes?: string; assigneeId?: string; assigneeName?: string }) =>
      updateAlert(alert.id, payload),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: alertsKeys.detail(tenantId, alert.id) });
      const prev = qc.getQueryData<Alert>(alertsKeys.detail(tenantId, alert.id));
      if (prev) {
        qc.setQueryData(alertsKeys.detail(tenantId, alert.id), {
          ...prev,
          ...(payload.status && { status: payload.status as AlertStatus }),
          ...(payload.assigneeId !== undefined && {
            assignedTo:   payload.assigneeId || undefined,
            assignedToName: payload.assigneeName || undefined,
          }),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(alertsKeys.detail(tenantId, alert.id), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: alertsKeys.detail(tenantId, alert.id) });
      void qc.invalidateQueries({ queryKey: alertsKeys.lists(tenantId) });
    },
  });

  const changeStatus = (status: string) => mutation.mutate({ status });
  const handleAssign = (userId: string | null, name: string | null) =>
    mutation.mutate({ assigneeId: userId ?? "", assigneeName: name ?? undefined });
  const handleNote      = (text: string) => mutation.mutate({ notes: text });

  const isLoading = mutation.isPending;
  const status    = alert.status;

  return (
    <div className="space-y-4">
      {/* Status actions */}
      <div className="border border-border rounded-lg p-3 space-y-3">
        <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">
          Status Actions
        </p>

        <div className="flex items-center gap-2 mb-2">
          <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {status === "open" && (
            <ActionBtn
              icon={<Eye className="w-3.5 h-3.5" />}
              label="Acknowledge"
              color="amber"
              disabled={isLoading}
              onClick={() => changeStatus("acknowledged")}
            />
          )}
          {(status === "open" || status === "acknowledged") && (
            <>
              <ActionBtn
                icon={<CheckCircle className="w-3.5 h-3.5" />}
                label="Close"
                color="green"
                disabled={isLoading}
                onClick={() => changeStatus("closed")}
              />
              <ActionBtn
                icon={<XCircle className="w-3.5 h-3.5" />}
                label="False Positive"
                color="blue"
                disabled={isLoading}
                onClick={() => changeStatus("false_positive")}
              />
            </>
          )}
          {(status === "closed" || status === "false_positive" || status === "acknowledged") && (
            <ActionBtn
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              label="Reopen"
              color="red"
              disabled={isLoading}
              onClick={() => changeStatus("open")}
            />
          )}
        </div>

        {mutation.isError && (
          <p className="text-xs text-severity-critical">
            Failed to update. Please try again.
          </p>
        )}
      </div>

      {/* Assignment */}
      <div className="border border-border rounded-lg p-3 space-y-2">
        <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">Assignment</p>
        <AssignmentSelect
          currentId={alert.assignedTo}
          currentName={alert.assignedToName}
          onAssign={(userId, name) => handleAssign(userId, name)}
          disabled={isLoading}
        />
      </div>

      {/* Notes — threaded feed */}
      <div className="border border-border rounded-lg p-3 space-y-2">
        <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">Analyst Notes</p>
        <NotesFeed
          existing={alert.notes}
          onSubmit={handleNote}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}

// ─── Action button helper ─────────────────────────────────────────────────────

function ActionBtn({
  icon, label, color, disabled, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: "amber" | "green" | "blue" | "red";
  disabled?: boolean;
  onClick: () => void;
}) {
  const colors = {
    amber: "border-amber-500/40 text-amber-400 hover:bg-amber-500/10",
    green: "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10",
    blue:  "border-blue-500/40 text-blue-400 hover:bg-blue-500/10",
    red:   "border-red-500/40 text-red-400 hover:bg-red-500/10",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        colors[color]
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Attribute helper ─────────────────────────────────────────────────────────

function Attr({
  icon, label, children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-2xs text-text-muted">
        {icon}
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ─── AlertDrawer ──────────────────────────────────────────────────────────────

interface AlertDrawerProps {
  alertId: string | null;
  onClose: () => void;
}

const TABS = [
  { id: "overview",        label: "Overview" },
  { id: "investigation",   label: "Context" },
  { id: "timeline",        label: "Timeline" },
  { id: "ai",              label: "AI Analysis" },
  { id: "analyst",         label: "Analyst" },
] as const;

export function AlertDrawer({ alertId, onClose }: AlertDrawerProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Reset to overview tab when the selected alert changes
  useEffect(() => {
    if (alertId) setActiveTab("overview");
  }, [alertId]);

  const { data: alert, isLoading } = useAlertDetail(alertId);

  return (
    <Drawer
      open={!!alertId}
      onClose={onClose}
      width="w-[580px]"
      title={isLoading ? "Loading..." : (alert?.title ?? "Alert Detail")}
      description={alert ? `Rule: ${alert.ruleName}` : undefined}
    >
      {isLoading || !alert ? (
        <div className="p-4 space-y-4">
          <SkeletonText lines={3} />
          <SkeletonText lines={6} />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <TabsList className="px-4 flex-shrink-0">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <TabsContent value="overview">
              <OverviewSection alert={alert} />
            </TabsContent>
            <TabsContent value="investigation">
              <InvestigationSection
                alertId={alert.id}
                correlationId={alert.correlationId}
              />
            </TabsContent>
            <TabsContent value="timeline">
              <TimelineSection alertId={alert.id} />
            </TabsContent>
            <TabsContent value="ai">
              <AISection alert={alert} />
            </TabsContent>
            <TabsContent value="analyst">
              <AnalystSection alert={alert} />
            </TabsContent>
          </div>
        </Tabs>
      )}
    </Drawer>
  );
}
