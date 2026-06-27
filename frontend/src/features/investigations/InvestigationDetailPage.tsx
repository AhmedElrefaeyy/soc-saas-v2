import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Clock, BookOpen, UserPlus, Loader2, Brain, MessagesSquare, LayoutDashboard, Share2, Paperclip, GitBranch, Network } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";
import { apiClient } from "@/api/client";
import { playbooksApi } from "@/api/playbooks";
import { toastError, toastSuccess } from "@/lib/toast";
import { extractApiError } from "@/lib/utils";
import { useInvDetail, useInvUpdateStatus, useInvSetVerdict } from "./hooks/useInvestigationDetail";
import { getRelatedAlerts } from "./api/investigationsApi";
import { InvLeftSidebar } from "./components/InvLeftSidebar";
import { StatusPipeline } from "./components/StatusPipeline";
import { InvVerdictDropdown } from "./components/InvVerdictDropdown";
import { InvStatusDropdown } from "./components/InvStatusDropdown";
import { WarRoomTab } from "./components/tabs/WarRoomTab";
import { SummaryTab } from "./components/tabs/SummaryTab";
import { AIAnalysisTab } from "./components/tabs/AIAnalysisTab";
import { TimelineTab } from "./components/tabs/TimelineTab";
import { GraphTab } from "./components/tabs/GraphTab";
import { EvidenceTab } from "./components/tabs/EvidenceTab";
import { PlaybookTab } from "./components/tabs/PlaybookTab";
import { ProcessTreeTab } from "./components/tabs/ProcessTreeTab";
import { NetworkSankeyTab } from "./components/tabs/NetworkSankeyTab";
import { AITriageAssistant } from "./components/AITriageAssistant";
import { InvExportButton } from "./components/InvExportButton";
import { TicketingIntegrationPanel } from "./components/TicketingIntegrationPanel";
import { IOCEnrichmentPanel } from "./components/IOCEnrichmentPanel";
import { CollaborativeWarRoom } from "./components/CollaborativeWarRoom";
import { ContainmentActionsPanel } from "./components/ContainmentActionsPanel";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = "warroom" | "summary" | "ai_analysis" | "timeline" | "graph" | "evidence" | "playbook" | "process_tree" | "network";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(s: number): string {
  return s >= 80 ? "#EF4444" : s >= 60 ? "#F97316" : s >= 30 ? "#F59E0B" : "#10B981";
}

function scoreLabel(s: number): string {
  return s >= 80 ? "CRITICAL" : s >= 60 ? "HIGH" : s >= 30 ? "MEDIUM" : "LOW";
}

function caseId(id: string): string {
  return `INC-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

// ─── SLA Timer — freezes at resolved_at or closed_at for terminal statuses ───

const TERMINAL_STATUSES = new Set(["resolved", "closed", "false_positive"]);

function useSLAElapsed(createdAt: string, status: string, resolvedAt?: string | null) {
  const [now, setNow] = useState(Date.now());
  const isTerminal = TERMINAL_STATUSES.has(status);

  useEffect(() => {
    if (isTerminal) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [isTerminal]);

  // Use resolvedAt if available, otherwise fall back to current time for active investigations
  const endTime = isTerminal
    ? resolvedAt
      ? new Date(resolvedAt).getTime()
      : new Date(createdAt).getTime() // fallback if field missing
    : now;

  const ms  = Math.max(0, endTime - new Date(createdAt).getTime());
  const h   = Math.floor(ms / 3_600_000);
  const m   = Math.floor((ms % 3_600_000) / 60_000);
  const str = h > 0 ? `${h}h ${m}m` : `${m}m`;
  const col = ms > 28_800_000 ? "#EF4444" : ms > 14_400_000 ? "#F97316" : ms > 3_600_000 ? "#F59E0B" : "#10B981";
  return { str, col };
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="page-in">
      <div className="skel w-72 h-6 mb-4" />
      <div className="skel w-48 h-4 mb-6" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => <div key={i} className="skel h-28 rounded-lg" />)}
      </div>
    </div>
  );
}

// ─── InvestigationDetailPage ──────────────────────────────────────────────────

export function InvestigationDetailPage() {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const currentUser  = useAuthStore((s) => s.user);
  const queryClient  = useQueryClient();

  // URL-synced tab state
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId) ?? "warroom";
  const setActiveTab = (tab: TabId) =>
    setSearchParams((p) => { p.set("tab", tab); return p; }, { replace: true });

  const { data: inv, isLoading } = useInvDetail(id ?? "");
  const updateStatus = useInvUpdateStatus(id ?? "");
  const setVerdict   = useInvSetVerdict(id ?? "");

  const [assigning, setAssigning]       = useState(false);
  const [assignedLabel, setAssignedLabel] = useState(false);

  const { data: invPlaybooks, isLoading: playbooksLoading } = useQuery({
    queryKey: ["playbooks", "investigation", id],
    queryFn:  () => playbooksApi.list({ investigation_id: id }),
    enabled:  !!id,
    staleTime: 30_000,
  });
  const linkedPlaybook = invPlaybooks?.[0] ?? null;

  const { data: relatedAlerts = [] } = useQuery({
    queryKey: ["inv-related-alerts-hosts", id],
    queryFn:  () => getRelatedAlerts(id!),
    enabled:  !!id && !!inv,
    staleTime: 60_000,
  });
  const hostnames = [...new Set(relatedAlerts.map((a) => a.hostname).filter(Boolean))] as string[];

  const sla = useSLAElapsed(
    inv?.created_at ?? new Date().toISOString(),
    inv?.status ?? "new",
    inv?.resolved_at ?? inv?.closed_at,
  );

  const handleAssign = async () => {
    if (!currentUser || assigning) return;
    setAssigning(true);
    try {
      await apiClient.patch(`/investigations/${id}/assign`, { assigned_to: currentUser.id });
      setAssignedLabel(true);
      toastSuccess("Investigation assigned to you", "Assigned");
      queryClient.invalidateQueries({ queryKey: ["inv-detail", id] });
      setTimeout(() => setAssignedLabel(false), 2000);
    } catch (err) {
      toastError(extractApiError(err), "Assignment failed");
    } finally {
      setAssigning(false);
    }
  };

  if (isLoading) return <DetailSkeleton />;
  if (!inv) {
    return (
      <div className="page-in text-center pt-20">
        <div className="text-sm text-text-muted">Investigation not found.</div>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => navigate("/investigations")}>
          ← Back
        </Button>
      </div>
    );
  }

  const color = scoreColor(inv.threat_score);
  const title = inv.title ?? `Investigation ${inv.investigation_id.slice(0, 8)}`;

  const TABS: { id: TabId; label: string; icon: React.ElementType; badge?: boolean; disabled?: boolean }[] = [
    { id: "warroom",     label: "War Room",   icon: MessagesSquare                        },
    { id: "summary",     label: "Summary",    icon: LayoutDashboard                       },
    { id: "ai_analysis", label: "AI",         icon: Brain, badge: !!inv.ai_analysis_json  },
    { id: "timeline",    label: "Timeline",   icon: Clock                                 },
    { id: "graph",        label: "Graph",        icon: Share2                                },
    { id: "evidence",     label: "Evidence",     icon: Paperclip                             },
    { id: "process_tree", label: "Process Tree", icon: GitBranch                             },
    { id: "network",      label: "Network",      icon: Network                               },
    { id: "playbook",     label: "Playbook",     icon: BookOpen, disabled: !linkedPlaybook   },
  ];

  return (
    <div
      className="page-in flex flex-col overflow-hidden gap-0"
      style={{ height: "calc(100vh - 50px - 40px)" }}
    >
      {/* ── Compact Header ── */}
      <div className="flex items-center gap-2.5 py-2 pb-2.5 border-b border-border flex-shrink-0 flex-wrap">
        <button
          onClick={() => navigate("/investigations")}
          aria-label="Back to investigations"
          className="text-text-muted hover:text-text-secondary transition-colors flex-shrink-0"
        >
          <ArrowLeft size={14} />
        </button>

        <span className="text-2xs font-bold font-mono text-text-muted flex-shrink-0 tracking-wider">
          {caseId(inv.investigation_id)}
        </span>

        <h1 className="text-sm font-bold text-text-primary font-display flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap m-0">
          {title}
        </h1>

        {/* Score pill */}
        <div
          className="flex items-center gap-1.5 flex-shrink-0 px-2.5 py-0.5 rounded"
          style={{ background: `${color}18`, border: `1px solid ${color}40` }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
          <span className="text-xs font-bold font-mono" style={{ color }}>
            {inv.threat_score}
          </span>
          <span className="text-2xs font-bold uppercase" style={{ color: `${color}CC` }}>
            {scoreLabel(inv.threat_score)}
          </span>
        </div>

        {/* SLA timer */}
        <div className="flex items-center gap-1.5 flex-shrink-0 px-2.5 py-0.5 rounded bg-bg-subtle border border-border">
          <Clock size={11} style={{ color: sla.col }} />
          <span className="text-xs font-semibold font-mono" style={{ color: sla.col }}>
            {sla.str}
          </span>
        </div>

        {/* Controls */}
        <div className="flex gap-1.5 flex-shrink-0 items-center">
          {playbooksLoading ? (
            <Loader2 size={11} className="text-text-muted animate-spin" />
          ) : linkedPlaybook ? (
            <button
              onClick={() => setActiveTab("playbook")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold font-mono bg-accent/8 border border-accent/20 text-blue-300"
            >
              <BookOpen size={11} />
              Playbook
              <span
                className="text-2xs px-1 py-px rounded font-bold"
                style={{
                  background: linkedPlaybook.created_by_id === null ? "rgba(139,92,246,0.2)" : "rgba(59,130,246,0.2)",
                  color:      linkedPlaybook.created_by_id === null ? "#A78BFA" : "#93C5FD",
                }}
              >
                {linkedPlaybook.created_by_id === null ? "AUTO" : "MANUAL"}
              </span>
            </button>
          ) : null}

          <AITriageAssistant context={{ type: "investigation", inv }} />
          <InvExportButton inv={inv} />
          <InvVerdictDropdown
            current={inv.verdict}
            onSet={(v) => setVerdict.mutate(v)}
            disabled={updateStatus.isPending}
          />
          <InvStatusDropdown
            current={inv.status}
            onChange={(s) => updateStatus.mutate(s)}
            disabled={updateStatus.isPending}
          />
          <Button variant="secondary" size="sm" onClick={handleAssign} disabled={assigning}>
            <UserPlus size={11} /> {assignedLabel ? "Assigned" : "Assign"}
          </Button>
        </div>
      </div>

      {/* Ticketing row */}
      <div className="py-1.5 border-b border-border/40 flex-shrink-0">
        <TicketingIntegrationPanel inv={inv} />
      </div>

      {/* ── Status Pipeline ── */}
      <div className="py-2 border-b border-border/50 flex-shrink-0">
        <StatusPipeline current={inv.status} />
      </div>

      {/* ── Body: sidebar + tabs ── */}
      <div className="flex-1 flex gap-4 overflow-hidden pt-3.5">

        <div className="flex flex-col gap-3 overflow-y-auto" style={{ width: 260, minWidth: 260, maxHeight: "100%" }}>
          <InvLeftSidebar inv={inv} />
          <IOCEnrichmentPanel investigationId={inv.investigation_id} />
          <ContainmentActionsPanel
            investigationId={inv.investigation_id}
            hostnames={hostnames}
          />
        </div>

        {/* Right: tab bar + content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex gap-0 border-b border-border flex-shrink-0 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon   = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTab(tab.id)}
                  disabled={tab.disabled}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium transition-all whitespace-nowrap",
                    "border-b-2 -mb-px border-transparent",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    active
                      ? "text-blue-300 border-b-accent"
                      : "text-text-muted hover:text-text-secondary",
                  )}
                >
                  <Icon size={12} />
                  {tab.label}
                  {tab.badge && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content — lazy per-tab queries */}
          <div className="flex-1 overflow-y-auto pt-3.5 pr-1">
            {activeTab === "warroom" && (
              <>
                <CollaborativeWarRoom investigationId={id!} />
                <WarRoomTab id={id!} inv={inv} isActive={activeTab === "warroom"} />
              </>
            )}
            {activeTab === "summary" && <SummaryTab inv={inv} />}
            {activeTab === "ai_analysis" && <AIAnalysisTab inv={inv} id={id!} />}
            {activeTab === "timeline" && (
              <TimelineTab id={id!} isActive={activeTab === "timeline"} />
            )}
            {activeTab === "graph" && (
              <GraphTab id={id!} isActive={activeTab === "graph"} />
            )}
            {activeTab === "evidence" && (
              <EvidenceTab id={id!} isActive={activeTab === "evidence"} />
            )}
            {activeTab === "process_tree" && (
              <ProcessTreeTab id={id!} isActive={activeTab === "process_tree"} />
            )}
            {activeTab === "network" && (
              <NetworkSankeyTab id={id!} isActive={activeTab === "network"} />
            )}
            {activeTab === "playbook" && linkedPlaybook && (
              <PlaybookTab playbook={linkedPlaybook} isActive={activeTab === "playbook"} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
