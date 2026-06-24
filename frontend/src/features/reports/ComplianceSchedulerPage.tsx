import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Mail, Download, Plus, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { apiClient } from "@/api/client";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import { extractApiError } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ComplianceTemplate = "soc2" | "pci_dss" | "iso27001" | "hipaa" | "gdpr";
type ScheduleFrequency = "once" | "weekly" | "monthly";
type ReportStatus = "pending" | "generating" | "completed" | "failed";

interface ScheduledReport {
  id: string;
  template: ComplianceTemplate;
  frequency: ScheduleFrequency;
  date_range_days: number;
  recipients: string[];
  next_run: string | null;
  last_run: string | null;
  status: ReportStatus;
  download_url?: string;
}

interface CreateSchedulePayload {
  template: ComplianceTemplate;
  frequency: ScheduleFrequency;
  date_range_days: number;
  recipients: string[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

const complianceApi = {
  list: () => apiClient.get<ScheduledReport[]>("/reports/compliance").then((r) => r.data),
  create: (p: CreateSchedulePayload) =>
    apiClient.post<ScheduledReport>("/reports/compliance/schedule", p).then((r) => r.data),
  generateNow: (p: Omit<CreateSchedulePayload, "frequency">) =>
    apiClient.post<ScheduledReport>("/reports/compliance/generate", p).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/reports/compliance/${id}`).then((r) => r.data),
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATES: { value: ComplianceTemplate; label: string; desc: string }[] = [
  { value: "soc2",     label: "SOC 2 Type II", desc: "Trust Services Criteria — security, availability, confidentiality" },
  { value: "pci_dss",  label: "PCI-DSS",        desc: "Payment Card Industry Data Security Standard" },
  { value: "iso27001", label: "ISO 27001",       desc: "Information security management system" },
  { value: "hipaa",    label: "HIPAA",           desc: "Health Insurance Portability and Accountability Act" },
  { value: "gdpr",     label: "GDPR",            desc: "General Data Protection Regulation" },
];

const DATE_RANGES = [
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 365, label: "Last 365 days" },
];

const STATUS_COLORS: Record<ReportStatus, string> = {
  pending:    "bg-bg-elevated text-text-muted",
  generating: "bg-accent/15 text-accent",
  completed:  "bg-status-online/15 text-status-online",
  failed:     "bg-severity-critical/15 text-severity-critical",
};

// ─── Schedule Dialog ──────────────────────────────────────────────────────────

function ScheduleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateSchedulePayload>({
    template: "soc2", frequency: "monthly", date_range_days: 30, recipients: [],
  });
  const [emailInput, setEmailInput] = useState("");

  const addEmail = () => {
    const e = emailInput.trim();
    if (e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !form.recipients.includes(e)) {
      setForm((f) => ({ ...f, recipients: [...f.recipients, e] }));
      setEmailInput("");
    }
  };

  const scheduleMutation = useMutation({
    mutationFn: complianceApi.create,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["compliance-reports"] }); toastSuccess("Report scheduled", "Compliance"); onClose(); },
    onError: (e) => toastError(extractApiError(e), "Schedule failed"),
  });

  const generateMutation = useMutation({
    mutationFn: (p: CreateSchedulePayload) => complianceApi.generateNow({ template: p.template, date_range_days: p.date_range_days, recipients: p.recipients }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["compliance-reports"] }); toastSuccess("Report generating…", "Compliance"); onClose(); },
    onError: (e) => toastError(extractApiError(e), "Generate failed"),
  });

  const inputCls = "w-full bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent";

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          role="dialog" aria-modal="true" onEscapeKeyDown={onClose}
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-xl border border-border bg-bg-card shadow-elevated"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <Dialog.Title className="text-sm font-bold text-text-primary">Schedule Compliance Report</Dialog.Title>
            <Dialog.Close asChild><button className="text-text-muted hover:text-text-primary"><X size={14} /></button></Dialog.Close>
          </div>
          <div className="p-5 space-y-4">
            {/* Template */}
            <div className="space-y-1.5">
              <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">Report Template</label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.value} type="button"
                    onClick={() => setForm(f => ({ ...f, template: t.value }))}
                    className={cn("text-left px-3 py-2 rounded-lg border transition-all",
                      form.template === t.value ? "border-accent bg-accent/8 text-text-primary" : "border-border text-text-muted hover:border-border-hover"
                    )}
                  >
                    <p className="text-xs font-semibold">{t.label}</p>
                    <p className="text-2xs text-text-muted mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            {/* Date range + frequency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">Date Range</label>
                <select className={cn(inputCls, "text-text-secondary")} value={form.date_range_days}
                  onChange={(e) => setForm(f => ({ ...f, date_range_days: Number(e.target.value) }))}>
                  {DATE_RANGES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">Schedule</label>
                <select className={cn(inputCls, "text-text-secondary")} value={form.frequency}
                  onChange={(e) => setForm(f => ({ ...f, frequency: e.target.value as ScheduleFrequency }))}>
                  <option value="once">One-time (now)</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            {/* Recipients */}
            <div className="space-y-2">
              <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">Email Recipients</label>
              <div className="flex gap-2">
                <input className={cn(inputCls, "flex-1")} type="email" value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addEmail()}
                  placeholder="analyst@company.com" />
                <button type="button" onClick={addEmail} className="btn btn-ghost btn-sm px-3">Add</button>
              </div>
              {form.recipients.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.recipients.map((email) => (
                    <span key={email} className="flex items-center gap-1 px-2 py-0.5 bg-bg-elevated rounded text-xs text-text-secondary">
                      <Mail size={10} /> {email}
                      <button onClick={() => setForm(f => ({ ...f, recipients: f.recipients.filter(e => e !== email) }))} className="text-text-muted hover:text-severity-critical ml-1">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 px-5 pb-5">
            <button onClick={() => generateMutation.mutate(form)} disabled={generateMutation.isPending} className="flex-1 btn btn-ghost btn-sm">
              Generate Now
            </button>
            <button onClick={() => scheduleMutation.mutate(form)} disabled={scheduleMutation.isPending} className="flex-1 btn btn-primary btn-sm">
              {scheduleMutation.isPending ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── ComplianceSchedulerPage ──────────────────────────────────────────────────

export function ComplianceSchedulerPage() {
  useEffect(() => { document.title = "Compliance Reports — NEURASHIELD"; }, []);

  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["compliance-reports"],
    queryFn: complianceApi.list,
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: complianceApi.delete,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["compliance-reports"] }); },
    onError: (e) => toastError(extractApiError(e), "Delete failed"),
  });

  return (
    <div className="pb-6">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-text-primary font-display">Compliance Reports</h1>
          <p className="text-xs text-text-muted mt-0.5">Schedule automated compliance reports for SOC 2, PCI-DSS, ISO 27001, HIPAA, GDPR</p>
        </div>
        <button onClick={() => setDialogOpen(true)} className="btn btn-primary btn-sm flex items-center gap-1.5">
          <Plus size={13} /> Schedule Report
        </button>
      </div>

      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-bg-elevated border-b border-border">
            <tr>
              {["Template","Range","Frequency","Recipients","Next Run","Last Run","Status"].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 text-text-muted font-semibold uppercase tracking-wider text-2xs">{h}</th>
              ))}
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: 3 }, (_, i) => (
              <tr key={i} className="border-b border-border/50">
                {Array.from({ length: 8 }, (_, j) => <td key={j} className="px-3 py-2.5"><div className="skel h-4 rounded" /></td>)}
              </tr>
            )) : (reports ?? []).length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-text-muted">
                No scheduled reports. Click "Schedule Report" to automate compliance reporting.
              </td></tr>
            ) : (reports ?? []).map((r) => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-bg-elevated/50">
                <td className="px-3 py-2.5 font-medium text-text-primary">{TEMPLATES.find(t=>t.value===r.template)?.label ?? r.template}</td>
                <td className="px-3 py-2.5 text-text-muted">{DATE_RANGES.find(d=>d.value===r.date_range_days)?.label ?? `${r.date_range_days}d`}</td>
                <td className="px-3 py-2.5 capitalize text-text-secondary">{r.frequency}</td>
                <td className="px-3 py-2.5 text-text-muted">
                  <div className="flex items-center gap-1"><Mail size={10} /> {r.recipients.length}</div>
                </td>
                <td className="px-3 py-2.5 text-text-muted">
                  {r.next_run ? (
                    <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(r.next_run).toLocaleDateString()}</span>
                  ) : "—"}
                </td>
                <td className="px-3 py-2.5 text-text-muted">
                  {r.last_run ? (
                    <span className="flex items-center gap-1"><Clock size={10} /> {new Date(r.last_run).toLocaleString()}</span>
                  ) : "—"}
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn("px-1.5 py-0.5 rounded text-2xs font-bold", STATUS_COLORS[r.status])}>{r.status}</span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    {r.download_url && (
                      <a href={r.download_url} download className="text-text-muted hover:text-accent transition-colors p-0.5">
                        <Download size={12} />
                      </a>
                    )}
                    <button onClick={() => deleteMutation.mutate(r.id)} disabled={deleteMutation.isPending}
                      className="text-text-muted hover:text-severity-critical transition-colors p-0.5">
                      <X size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ScheduleDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
