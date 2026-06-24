import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { iocsApi } from "@/api/iocs";
import type { IOCEnrichment, InvestigationIOCsResponse } from "@/api/iocs";
import { Shield, Globe, Loader2, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toastError } from "@/lib/toast";
import { extractApiError } from "@/lib/utils";

// ─── Flatten IOCs from response ───────────────────────────────────────────────

interface FlatIOC extends IOCEnrichment {
  _key: string;
}

function flattenIOCs(data: InvestigationIOCsResponse): FlatIOC[] {
  const result: FlatIOC[] = [];
  const groups: Array<IOCEnrichment[]> = [data.ips ?? [], data.domains ?? [], data.hashes ?? []];
  for (const list of groups) {
    for (const ioc of list) {
      result.push({ ...ioc, _key: `${ioc.type}:${ioc.indicator}` });
    }
  }
  return result;
}

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score, source }: { score: number; source: string }) {
  const cls =
    score >= 80 ? "bg-severity-critical/15 text-severity-critical border-severity-critical/30"
    : score >= 50 ? "bg-severity-high/15 text-severity-high border-severity-high/30"
    : score >= 20 ? "bg-severity-medium/15 text-severity-medium border-severity-medium/30"
    : "bg-status-ok/15 text-status-ok border-status-ok/30";

  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-bold border", cls)}>
      {source}: {score}
    </span>
  );
}

// ─── IOCRow ───────────────────────────────────────────────────────────────────

function IOCRow({ ioc, onEnrich, enriching }: {
  ioc: FlatIOC;
  onEnrich: (indicator: string, type: string) => void;
  enriching: boolean;
}) {
  const vtScore    = (ioc.vt_malicious ?? 0) > 0 ? Math.min(100, (ioc.vt_malicious ?? 0) * 4) : 0;
  const abuseScore = ioc.abuseipdb_confidence ?? 0;
  const hasScores  = vtScore > 0 || abuseScore > 0;
  const isMalicious = ioc.vt_verdict === "malicious";
  const country    = ioc.abuseipdb_country;

  return (
    <div className="border border-border rounded-lg px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-2">
        {ioc.type === "ip"
          ? <Globe  size={12} className="text-text-muted flex-shrink-0" />
          : <Shield size={12} className="text-text-muted flex-shrink-0" />
        }
        <code className="text-xs text-text-primary font-mono flex-1 min-w-0 truncate">{ioc.indicator}</code>
        <span className="text-2xs text-text-muted bg-bg-elevated px-1.5 py-0.5 rounded border border-border">
          {ioc.type}
        </span>
        {isMalicious
          ? <AlertTriangle size={11} className="text-severity-critical flex-shrink-0" />
          : <CheckCircle   size={11} className="text-status-ok flex-shrink-0" />
        }
      </div>

      {hasScores ? (
        <div className="flex flex-wrap gap-1">
          {vtScore    > 0 && <ScoreBadge score={vtScore}    source="VT"        />}
          {abuseScore > 0 && <ScoreBadge score={abuseScore} source="AbuseIPDB" />}
          {country && (
            <span className="text-2xs text-text-muted bg-bg-elevated px-1.5 py-0.5 rounded border border-border">
              {country}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-2xs text-text-muted">
            {ioc.last_seen
              ? `Last seen: ${new Date(ioc.last_seen).toLocaleDateString()}`
              : "Not enriched yet"}
          </span>
          <button
            onClick={() => onEnrich(ioc.indicator, ioc.type)}
            disabled={enriching}
            className="flex items-center gap-1 text-2xs text-accent hover:text-accent/80 transition-colors"
          >
            {enriching
              ? <Loader2 size={10} className="animate-spin" />
              : <RefreshCw size={10} />
            }
            Enrich
          </button>
        </div>
      )}

      {ioc.tags && ioc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ioc.tags.map((tag) => (
            <span key={tag} className="text-2xs px-1.5 py-0.5 rounded bg-accent/8 text-accent/80 border border-accent/20">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── IOCEnrichmentPanel ───────────────────────────────────────────────────────

interface Props {
  investigationId: string;
}

export function IOCEnrichmentPanel({ investigationId }: Props) {
  const [enrichingKey, setEnrichingKey] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["investigation-iocs", investigationId],
    queryFn: () => iocsApi.getForInvestigation(investigationId),
    staleTime: 120_000,
  });

  const enrichMutation = useMutation({
    mutationFn: ({ indicator, type }: { indicator: string; type: string }) =>
      iocsApi.enrich(indicator, type),
    onSuccess: () => { setEnrichingKey(null); void refetch(); },
    onError: (e) => { setEnrichingKey(null); toastError(extractApiError(e), "Enrichment failed"); },
  });

  const handleEnrich = (indicator: string, type: string) => {
    const key = `${type}:${indicator}`;
    setEnrichingKey(key);
    enrichMutation.mutate({ indicator, type });
  };

  const iocs = data ? flattenIOCs(data) : [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted">IOC Enrichment</h4>
        <span className="text-2xs text-text-muted">{iocs.length} indicators</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="skel h-14 rounded-lg animate-pulse" />)}
        </div>
      ) : iocs.length === 0 ? (
        <p className="text-xs text-text-muted py-4 text-center">No IOCs extracted for this investigation.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {iocs.map((ioc) => (
            <IOCRow
              key={ioc._key}
              ioc={ioc}
              onEnrich={handleEnrich}
              enriching={enrichingKey === ioc._key}
            />
          ))}
        </div>
      )}
    </div>
  );
}
