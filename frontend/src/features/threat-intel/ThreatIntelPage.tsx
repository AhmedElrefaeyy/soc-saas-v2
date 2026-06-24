import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, RefreshCw, Upload, Search, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { threatIntelApi } from "@/api/threat-intel";
import type { CreateFeedPayload, FeedType } from "@/api/threat-intel";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import { extractApiError } from "@/lib/utils";

// ─── Feed type labels ─────────────────────────────────────────────────────────

const FEED_TYPES: { value: FeedType; label: string }[] = [
  { value: "stix_taxii", label: "STIX/TAXII" },
  { value: "csv",        label: "CSV Feed"    },
  { value: "opencti",    label: "OpenCTI"     },
  { value: "misp",       label: "MISP"        },
  { value: "manual",     label: "Manual IOC Import" },
];

const STATUS_COLORS: Record<string, string> = {
  active:  "bg-status-online/15 text-status-online",
  error:   "bg-severity-critical/15 text-severity-critical",
  syncing: "bg-accent/15 text-accent",
};

// ─── Add Feed Dialog ──────────────────────────────────────────────────────────

function AddFeedDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateFeedPayload>({ name: "", type: "stix_taxii", sync_interval_minutes: 60 });

  const mutation = useMutation({
    mutationFn: threatIntelApi.createFeed,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["threat-intel", "feeds"] });
      toastSuccess("Feed added", "Threat Intel");
      onClose();
    },
    onError: (e) => toastError(extractApiError(e), "Add feed failed"),
  });

  const inputCls = "w-full bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent";

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          role="dialog" aria-modal="true" onEscapeKeyDown={onClose}
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl border border-border bg-bg-card shadow-elevated"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <Dialog.Title className="text-sm font-bold text-text-primary">Add Threat Feed</Dialog.Title>
            <Dialog.Close asChild><button className="text-text-muted hover:text-text-primary"><X size={14} /></button></Dialog.Close>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1">
              <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">Feed Name</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. CIRCL MISP" />
            </div>
            <div className="space-y-1">
              <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">Type</label>
              <select className={cn(inputCls, "text-text-secondary")} value={form.type}
                onChange={(e) => setForm(f => ({ ...f, type: e.target.value as FeedType }))}>
                {FEED_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {form.type !== "manual" && (
              <>
                <div className="space-y-1">
                  <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">Endpoint URL</label>
                  <input className={inputCls} value={form.endpoint_url ?? ""} onChange={(e) => setForm(f => ({ ...f, endpoint_url: e.target.value }))} placeholder="https://…" />
                </div>
                <div className="space-y-1">
                  <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">API Key (masked)</label>
                  <input className={inputCls} type="password" value={form.api_key ?? ""} onChange={(e) => setForm(f => ({ ...f, api_key: e.target.value }))} placeholder="••••••••" />
                </div>
                <div className="space-y-1">
                  <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">Sync Interval (minutes)</label>
                  <input className={inputCls} type="number" min={5} value={form.sync_interval_minutes ?? 60}
                    onChange={(e) => setForm(f => ({ ...f, sync_interval_minutes: Number(e.target.value) }))} />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 px-5 pb-5">
            <button onClick={onClose} className="flex-1 btn btn-ghost btn-sm">Cancel</button>
            <button disabled={!form.name.trim() || mutation.isPending}
              onClick={() => mutation.mutate(form)} className="flex-1 btn btn-primary btn-sm">
              {mutation.isPending ? "Adding…" : "Add Feed"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── IOC Library Tab ──────────────────────────────────────────────────────────

function IOCLibrary() {
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["threat-intel", "iocs", page, search],
    queryFn: () => threatIntelApi.listIOCs({ page, search: search || undefined }),
    staleTime: 60_000,
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input type="search" placeholder="Search IOCs…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-elevated border border-border rounded-lg pl-7 pr-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent" />
        </div>
      </div>
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-bg-elevated border-b border-border">
            <tr>
              {["Indicator","Type","Source","Confidence","First Seen","Last Seen","Hits"].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 text-text-muted font-semibold uppercase tracking-wider text-2xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: 6 }, (_, i) => (
              <tr key={i} className="border-b border-border/50">
                {Array.from({ length: 7 }, (_, j) => <td key={j} className="px-3 py-2.5"><div className="skel h-4 rounded" /></td>)}
              </tr>
            )) : (data?.items ?? []).map((ioc) => (
              <tr key={ioc.id} className="border-b border-border/50 hover:bg-bg-elevated/50">
                <td className="px-3 py-2.5 font-mono text-text-primary">{ioc.indicator}</td>
                <td className="px-3 py-2.5"><span className="px-1.5 py-0.5 rounded bg-bg-elevated text-text-secondary text-2xs">{ioc.type}</span></td>
                <td className="px-3 py-2.5 text-text-muted">{ioc.source_feed_name}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <div className="flex-1 bg-bg-elevated rounded-full h-1 w-12">
                      <div className="h-1 rounded-full bg-accent" style={{ width: `${ioc.confidence}%` }} />
                    </div>
                    <span className="text-2xs text-text-muted">{ioc.confidence}%</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-text-muted">{new Date(ioc.first_seen).toLocaleDateString()}</td>
                <td className="px-3 py-2.5 text-text-muted">{new Date(ioc.last_seen).toLocaleDateString()}</td>
                <td className="px-3 py-2.5 font-mono text-accent">{ioc.hit_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.total > 50 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-bg-elevated">
            <span className="text-xs text-text-muted">{(page-1)*50+1}–{Math.min(page*50, data.total)} of {data.total}</span>
            <div className="flex gap-1">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="btn btn-ghost btn-xs">Prev</button>
              <button disabled={page*50>=data.total} onClick={() => setPage(p=>p+1)} className="btn btn-ghost btn-xs">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ThreatIntelPage ──────────────────────────────────────────────────────────

type TabId = "feeds" | "iocs" | "matches";

export function ThreatIntelPage() {
  useEffect(() => { document.title = "Threat Intelligence — NEURASHIELD"; }, []);

  const qc = useQueryClient();
  const [activeTab,   setActiveTab]   = useState<TabId>("feeds");
  const [addFeedOpen, setAddFeedOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: feeds, isLoading } = useQuery({
    queryKey: ["threat-intel", "feeds"],
    queryFn: threatIntelApi.listFeeds,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: threatIntelApi.deleteFeed,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["threat-intel", "feeds"] }); toastSuccess("Feed removed", "Threat Intel"); },
    onError: (e) => toastError(extractApiError(e), "Delete failed"),
  });

  const syncMutation = useMutation({
    mutationFn: threatIntelApi.syncFeed,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["threat-intel", "feeds"] }); toastSuccess("Sync started", "Threat Intel"); },
    onError: (e) => toastError(extractApiError(e), "Sync failed"),
  });

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await threatIntelApi.importIOCs(fd);
      toastSuccess(`Imported ${res.imported} IOCs`, "Threat Intel");
      void qc.invalidateQueries({ queryKey: ["threat-intel", "iocs"] });
    } catch (err) { toastError(extractApiError(err), "Import failed"); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const TABS: { id: TabId; label: string }[] = [
    { id: "feeds",   label: "Feeds"       },
    { id: "iocs",    label: "IOC Library" },
    { id: "matches", label: "IOC Matches" },
  ];

  return (
    <div className="pb-6">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-text-primary font-display">Threat Intelligence</h1>
          <p className="text-xs text-text-muted mt-0.5">Feed management, IOC library, and alert matches</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,.txt,.stix,.json" className="sr-only" onChange={handleFileImport} aria-label="Import IOC file" />
          <button onClick={() => fileRef.current?.click()} className="btn btn-ghost btn-sm flex items-center gap-1.5">
            <Upload size={12} /> Import IOCs
          </button>
          <button onClick={() => setAddFeedOpen(true)} className="btn btn-primary btn-sm flex items-center gap-1.5">
            <Plus size={12} /> Add Feed
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-bg-surface border border-border rounded-lg p-0.5 w-fit mb-4">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={cn("px-4 py-1.5 rounded-md text-xs font-semibold transition-all",
              activeTab === t.id ? "bg-primary-600 text-white" : "text-text-muted hover:text-text-secondary"
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "feeds" && (
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-bg-elevated border-b border-border">
              <tr>
                {["Feed Name","Type","Status","Last Updated","IOC Count"].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-text-muted font-semibold uppercase tracking-wider text-2xs">{h}</th>
                ))}
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 4 }, (_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 6 }, (_, j) => <td key={j} className="px-3 py-2.5"><div className="skel h-4 rounded" /></td>)}
                </tr>
              )) : (feeds ?? []).length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-text-muted">
                  No feeds configured. Add a feed to start enriching your detections.
                </td></tr>
              ) : (feeds ?? []).map((f) => (
                <tr key={f.id} className="border-b border-border/50 hover:bg-bg-elevated/50">
                  <td className="px-3 py-2.5 font-medium text-text-primary">{f.name}</td>
                  <td className="px-3 py-2.5 text-text-muted">{FEED_TYPES.find(t=>t.value===f.type)?.label ?? f.type}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn("px-1.5 py-0.5 rounded text-2xs font-bold", STATUS_COLORS[f.status] ?? "text-text-muted")}>{f.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-text-muted">{f.last_updated ? new Date(f.last_updated).toLocaleString() : "Never"}</td>
                  <td className="px-3 py-2.5 font-mono text-accent">{f.ioc_count.toLocaleString()}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => syncMutation.mutate(f.id)} disabled={syncMutation.isPending}
                        className="text-text-muted hover:text-accent transition-colors p-0.5" title="Sync now">
                        <RefreshCw size={12} className={syncMutation.isPending ? "animate-spin" : ""} />
                      </button>
                      <button onClick={() => deleteMutation.mutate(f.id)} disabled={deleteMutation.isPending}
                        className="text-text-muted hover:text-severity-critical transition-colors p-0.5">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "iocs" && <IOCLibrary />}

      {activeTab === "matches" && (
        <div className="bg-bg-card border border-border rounded-xl p-4 text-center text-sm text-text-muted py-12">
          IOC match history loads from <code className="font-mono text-xs">/threat-intel/matches</code> — no matches recorded yet.
        </div>
      )}

      <AddFeedDialog open={addFeedOpen} onClose={() => setAddFeedOpen(false)} />
    </div>
  );
}
