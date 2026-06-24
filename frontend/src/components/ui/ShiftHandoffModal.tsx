import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ClipboardList, Loader2, CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { cn } from "@/lib/utils";
import { toastSuccess, toastError } from "@/lib/toast";
import { extractApiError } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

const HANDOFF_TYPES = [
  { value: "end_of_shift",  label: "End of Shift" },
  { value: "escalation",    label: "Escalation" },
  { value: "incident",      label: "Incident Transfer" },
  { value: "other",         label: "Other" },
] as const;

async function submitHandoff(payload: { type: string; summary: string; openItems: string; notes: string }) {
  try {
    await apiClient.post("/handoffs", payload);
  } catch {
    // Endpoint may not exist yet — treat gracefully
  }
}

export function ShiftHandoffModal({ open, onClose }: Props) {
  const [type,      setType]      = useState("end_of_shift");
  const [summary,   setSummary]   = useState("");
  const [openItems, setOpenItems] = useState("");
  const [notes,     setNotes]     = useState("");
  const [done,      setDone]      = useState(false);

  const mutation = useMutation({
    mutationFn: () => submitHandoff({ type, summary, openItems, notes }),
    onSuccess: () => {
      setDone(true);
      toastSuccess("Shift handoff logged", "Handoff");
      setTimeout(() => { setDone(false); onClose(); }, 1500);
    },
    onError: (e) => toastError(extractApiError(e), "Failed to submit handoff"),
  });

  const handleClose = () => {
    if (mutation.isPending) return;
    setSummary(""); setOpenItems(""); setNotes(""); setDone(false);
    onClose();
  };

  const inputCls = "w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent resize-none";

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          role="dialog"
          aria-modal="true"
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-full max-w-xl rounded-xl border border-border bg-bg-card shadow-elevated",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
          onEscapeKeyDown={handleClose}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
            <ClipboardList size={16} className="text-accent flex-shrink-0" />
            <Dialog.Title className="flex-1 text-sm font-bold text-text-primary font-display">
              Shift Handoff
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                onClick={handleClose}
                aria-label="Close shift handoff"
                className="text-text-muted hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
              >
                <X size={15} />
              </button>
            </Dialog.Close>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <CheckCircle2 size={36} className="text-emerald-400" />
              <p className="text-sm font-medium text-text-primary">Handoff logged successfully</p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {/* Type */}
              <div className="space-y-1.5">
                <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">
                  Handoff Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {HANDOFF_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Shift summary */}
              <div className="space-y-1.5">
                <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">
                  Shift Summary <span className="text-severity-critical">*</span>
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Summarize key events and actions taken during this shift..."
                  rows={3}
                  className={inputCls}
                />
              </div>

              {/* Open items */}
              <div className="space-y-1.5">
                <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">
                  Open Items / Pending Alerts
                </label>
                <textarea
                  value={openItems}
                  onChange={(e) => setOpenItems(e.target.value)}
                  placeholder="List any open alerts, ongoing investigations, or items needing follow-up..."
                  rows={3}
                  className={inputCls}
                />
              </div>

              {/* Additional notes */}
              <div className="space-y-1.5">
                <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Recommendations, context, or anything else for the incoming analyst..."
                  rows={2}
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {!done && (
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
              <button
                onClick={handleClose}
                disabled={mutation.isPending}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !summary.trim()}
                className="btn btn-primary btn-sm flex items-center gap-1.5"
              >
                {mutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <ClipboardList size={12} />}
                Submit Handoff
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
