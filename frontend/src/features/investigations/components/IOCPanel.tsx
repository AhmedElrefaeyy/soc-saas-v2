import React, { useMemo, useState, useCallback } from "react";
import { Shield, Globe, Terminal, Hash, Copy, Check } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import type { InvestigationDetail } from "../hooks/useInvestigationDetail";

// ─── IOC extraction ───────────────────────────────────────────────────────────

const MAX_IOC = { ips: 8, processes: 6, domains: 5, hashes: 3 };

function extractIOCs(texts: (string | undefined | null)[]) {
  const text = texts.filter(Boolean).join(" ");
  const ips       = [...new Set(text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) ?? [])];
  const processes = [...new Set((text.match(/\b[\w][\w.-]*\.exe\b/gi) ?? []).map((s) => s.toLowerCase()))];
  const hashes    = [...new Set(text.match(/\b[a-f0-9]{64}\b|\b[a-f0-9]{40}\b|\b[a-f0-9]{32}\b/gi) ?? [])];
  const domains   = [...new Set(
    (text.match(/\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|ru|cn|biz|top|xyz|gov|edu)\b/gi) ?? [])
      .map((d) => d.toLowerCase())
      .filter((d) => !d.endsWith(".exe") && !ips.some((ip) => d.startsWith(ip)))
  )];
  return {
    ips:       { items: ips.slice(0, MAX_IOC.ips),       total: ips.length       },
    processes: { items: processes.slice(0, MAX_IOC.processes), total: processes.length },
    hashes:    { items: hashes.slice(0, MAX_IOC.hashes), total: hashes.length    },
    domains:   { items: domains.slice(0, MAX_IOC.domains), total: domains.length  },
  };
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);
  return (
    <button
      onClick={copy}
      aria-label={copied ? "Copied!" : `Copy ${value}`}
      className={cn(
        "flex-shrink-0 p-0.5 rounded transition-colors",
        copied ? "text-emerald-400" : "text-text-muted hover:text-text-secondary",
      )}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
    </button>
  );
}

// ─── Hash item with tooltip ───────────────────────────────────────────────────

function HashItem({
  value,
  bgClass,
  borderClass,
}: {
  value: string;
  bgClass: string;
  borderClass: string;
}) {
  const isLong = value.length > 24;
  const display = isLong ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
  const hashLen =
    value.length === 64 ? "SHA-256" :
    value.length === 40 ? "SHA-1"   :
    value.length === 32 ? "MD5"     : "";

  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className={cn(
            "flex items-center gap-1 text-xs text-text-secondary py-0.5 px-1.5 rounded border font-mono leading-snug",
            bgClass, borderClass,
          )}>
            <span className="flex-1 min-w-0 truncate">{display}</span>
            {hashLen && (
              <span className="text-2xs text-text-muted flex-shrink-0 ml-0.5">{hashLen}</span>
            )}
            <CopyButton value={value} />
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 max-w-xs px-2 py-1.5 text-2xs font-mono text-text-primary bg-bg-card border border-border rounded-lg shadow-elevated break-all"
            sideOffset={4}
          >
            {value}
            <Tooltip.Arrow className="fill-border" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

// ─── IOCPanel ─────────────────────────────────────────────────────────────────

interface Props {
  inv: InvestigationDetail;
}

export const IOCPanel = React.memo(function IOCPanel({ inv }: Props) {
  const iocs = useMemo(
    () => extractIOCs([inv.executive_summary, inv.technical_summary, inv.title]),
    [inv.executive_summary, inv.technical_summary, inv.title],
  );

  const sections = [
    { icon: Globe,    colorClass: "text-sev-critical", bgClass: "bg-sev-critical/5",  borderClass: "border-sev-critical/15",  label: "IPs",      source: "OSINT",  ...iocs.ips },
    { icon: Terminal, colorClass: "text-sev-high",     bgClass: "bg-sev-high/5",      borderClass: "border-sev-high/15",      label: "Processes", source: "Events", ...iocs.processes },
    { icon: Globe,    colorClass: "text-blue-400",     bgClass: "bg-blue-500/5",      borderClass: "border-blue-500/15",      label: "Domains",  source: "DNS",    ...iocs.domains },
    { icon: Hash,     colorClass: "text-purple-400",   bgClass: "bg-purple-500/5",    borderClass: "border-purple-500/15",    label: "Hashes",   source: "AV",     ...iocs.hashes },
  ].filter((s) => s.items.length > 0);

  if (sections.length === 0) return null;

  return (
    <div className="bg-bg-subtle border border-border-card rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-widest text-text-muted mb-2.5">
        <Shield size={10} className="text-text-muted" />
        IOC Indicators
      </div>
      <div className="flex flex-col gap-2.5">
        {sections.map(({ icon: Icon, colorClass, bgClass, borderClass, label, source, items, total }) => (
          <div key={label}>
            <div className={`flex items-center gap-1 text-2xs uppercase tracking-wider mb-1 ${colorClass}`}>
              <Icon size={9} />
              {label}
              <span className="ml-auto text-text-muted normal-case font-normal tracking-normal">{source}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {label === "Hashes"
                ? items.map((item) => (
                    <HashItem key={item} value={item} bgClass={bgClass} borderClass={borderClass} />
                  ))
                : items.map((item) => (
                    <div key={item} className={cn(
                      "flex items-center gap-1 text-xs text-text-secondary py-0.5 px-1.5 rounded border font-mono break-all leading-snug",
                      bgClass, borderClass,
                    )}>
                      <span className="flex-1 min-w-0 break-all">{item}</span>
                      <CopyButton value={item} />
                    </div>
                  ))
              }
              {total > items.length && (
                <p className="text-2xs text-text-muted pl-1 mt-0.5">
                  Showing {items.length} of {total}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
