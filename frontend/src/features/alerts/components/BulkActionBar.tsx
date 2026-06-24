import { useState, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import {
  X, CheckCircle, XCircle, Shield, ChevronDown, ListFilter, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBulkAlerts } from "../hooks/useBulkAlerts";
import type { BulkAlertAction, AlertSeverity, AlertStatus } from "../types";

interface BulkActionBarProps {
  selectedIds: string[];
  onClear: () => void;
}

interface ActionDef {
  id: BulkAlertAction;
  label: string;
  icon: React.ReactNode;
  variant?: "danger" | "success" | "default";
  requiresConfirm?: boolean;
}

const ACTIONS: ActionDef[] = [
  { id: "close",               label: "Close",    icon: <XCircle className="w-3.5 h-3.5" />,    requiresConfirm: true },
  { id: "reopen",              label: "Reopen",   icon: <CheckCircle className="w-3.5 h-3.5" /> },
  { id: "mark_true_positive",  label: "Mark TP",  icon: <Shield className="w-3.5 h-3.5" />,     variant: "danger", requiresConfirm: true },
  { id: "mark_false_positive", label: "Mark FP",  icon: <CheckCircle className="w-3.5 h-3.5" />, variant: "success" },
];

const SEVERITY_OPTIONS: AlertSeverity[] = ["critical", "high", "medium", "low", "info"];

const STATUS_OPTIONS: { value: AlertStatus; label: string }[] = [
  { value: "open",           label: "Open" },
  { value: "acknowledged",   label: "Acknowledged" },
  { value: "closed",         label: "Closed" },
  { value: "false_positive", label: "False Positive" },
];

const REASON_OPTIONS = [
  { value: "investigation_complete", label: "Investigation complete" },
  { value: "false_positive",         label: "Confirmed false positive" },
  { value: "duplicate",              label: "Duplicate alert" },
  { value: "accepted_risk",          label: "Accepted risk" },
  { value: "remediated",             label: "Issue remediated" },
  { value: "escalated",              label: "Escalated to tier 2" },
  { value: "other",                  label: "Other" },
];

const selectTriggerCls = cn(
  "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-sm",
  "bg-bg-elevated border border-border text-text-secondary",
  "hover:border-border-hover transition-colors",
  "focus:outline-none focus:ring-1 focus:ring-accent",
);
const selectContentCls = cn(
  "z-[60] min-w-[180px] overflow-hidden rounded-lg border border-border",
  "bg-bg-card shadow-elevated",
);
const selectItemCls = cn(
  "flex items-center px-2.5 py-1.5 text-xs text-text-secondary cursor-pointer select-none",
  "hover:bg-bg-elevated hover:text-text-primary focus:outline-none",
  "data-[highlighted]:bg-bg-elevated data-[highlighted]:text-text-primary",
);

// ─── Change Status Dialog ─────────────────────────────────────────────────────

function ChangeStatusDialog({
  open,
  count,
  onClose,
  onConfirm,
}: {
  open: boolean;
  count: number;
  onClose: () => void;
  onConfirm: (status: AlertStatus, reason: string, notes: string) => void;
}) {
  const [status, setStatus] = useState<AlertStatus>("closed");
  const [reason, setReason] = useState("investigation_complete");
  const [notes,  setNotes]  = useState("");

  const handleConfirm = () => {
    onConfirm(status, reason, notes);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          role="dialog"
          aria-modal="true"
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-full max-w-md rounded-xl border border-border bg-bg-card shadow-elevated",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
          onEscapeKeyDown={onClose}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <Dialog.Title className="text-sm font-bold text-text-primary font-display">
              Change Status — {count} alerts
            </Dialog.Title>
            <Dialog.Close asChild>
              <button onClick={onClose} aria-label="Close dialog" className="text-text-muted hover:text-text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-accent rounded">
                <X size={15} />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-5 space-y-4">
            {/* New status */}
            <div className="space-y-1.5">
              <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">New Status</label>
              <Select.Root value={status} onValueChange={(v) => setStatus(v as AlertStatus)}>
                <Select.Trigger className={selectTriggerCls} aria-label="Select new status">
                  <Select.Value />
                  <Select.Icon asChild className="ml-auto text-text-muted">
                    <ChevronDown size={12} />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className={selectContentCls} position="popper" sideOffset={4}>
                    <Select.Viewport className="p-1">
                      {STATUS_OPTIONS.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value} className={selectItemCls}>
                          <Select.ItemText>{opt.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Reason code */}
            <div className="space-y-1.5">
              <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">Reason</label>
              <Select.Root value={reason} onValueChange={setReason}>
                <Select.Trigger className={selectTriggerCls} aria-label="Select reason code">
                  <Select.Value />
                  <Select.Icon asChild className="ml-auto text-text-muted">
                    <ChevronDown size={12} />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className={selectContentCls} position="popper" sideOffset={4}>
                    <Select.Viewport className="p-1">
                      {REASON_OPTIONS.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value} className={selectItemCls}>
                          <Select.ItemText>{opt.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-2xs font-bold uppercase tracking-widest text-text-muted">
                Notes <span className="normal-case font-normal">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add context or resolution notes..."
                rows={3}
                className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
            <button onClick={onClose} className="btn btn-ghost btn-sm">Cancel</button>
            <button onClick={handleConfirm} className="btn btn-primary btn-sm">
              Apply to {count} alerts
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── BulkActionBar ────────────────────────────────────────────────────────────

export function BulkActionBar({ selectedIds, onClear }: BulkActionBarProps) {
  const { mutate, isPending } = useBulkAlerts();
  const shouldReduceMotion = useReducedMotion();
  const [confirmAction,    setConfirmAction]    = useState<BulkAlertAction | null>(null);
  const [showSeverity,     setShowSeverity]     = useState(false);
  const [changeStatusOpen, setChangeStatusOpen] = useState(false);

  const springConfig = shouldReduceMotion
    ? { type: "tween" as const, duration: 0.01 }
    : { type: "spring" as const, stiffness: 400, damping: 30 };

  const dispatch = useCallback((
    action: BulkAlertAction,
    extra?: { assignTo?: string; tag?: string; severity?: AlertSeverity }
  ) => {
    mutate({ alertIds: selectedIds, action, ...extra }, { onSuccess: () => onClear() });
  }, [mutate, selectedIds, onClear]);

  const handleAction = (def: ActionDef) => {
    if (def.requiresConfirm) setConfirmAction(def.id);
    else dispatch(def.id);
  };

  const handleChangeStatus = (status: AlertStatus, _reason: string, _notes: string) => {
    const actionMap: Record<AlertStatus, BulkAlertAction> = {
      open:           "reopen",
      acknowledged:   "close",
      closed:         "close",
      false_positive: "mark_false_positive",
    };
    dispatch(actionMap[status] ?? "close");
  };

  return (
    <>
      <ChangeStatusDialog
        open={changeStatusOpen}
        count={selectedIds.length}
        onClose={() => setChangeStatusOpen(false)}
        onConfirm={handleChangeStatus}
      />

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={springConfig}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-surface shadow-xl shadow-black/30 backdrop-blur-sm">
              {/* Selection count */}
              <div className="flex items-center gap-2 pr-3 border-r border-border">
                <span className="text-sm font-semibold text-text-primary tabular-nums">
                  {selectedIds.length}
                </span>
                <span className="text-xs text-text-muted">selected</span>
                <button
                  onClick={onClear}
                  aria-label="Clear selection"
                  className="ml-1 text-text-muted hover:text-text-primary transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Change Status (with reason code) */}
              <button
                onClick={() => setChangeStatusOpen(true)}
                disabled={isPending}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-elevated rounded-md transition-colors disabled:opacity-50"
                aria-label="Change alert status with reason code"
              >
                <ListFilter className="w-3.5 h-3.5" />
                Change Status
              </button>

              {/* Action buttons */}
              {ACTIONS.map((def) => (
                <button
                  key={def.id}
                  onClick={() => handleAction(def)}
                  disabled={isPending}
                  aria-label={def.label}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50",
                    def.variant === "danger"
                      ? "text-severity-critical hover:bg-severity-critical/10"
                      : def.variant === "success"
                      ? "text-status-online hover:bg-status-online/10"
                      : "text-text-secondary hover:bg-bg-elevated"
                  )}
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : def.icon}
                  {def.label}
                </button>
              ))}

              {/* Severity dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSeverity((v) => !v)}
                  disabled={isPending}
                  aria-expanded={showSeverity}
                  aria-label="Change severity"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-elevated rounded-md transition-colors disabled:opacity-50"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Severity
                  <ChevronDown className="w-3 h-3" />
                </button>

                <AnimatePresence>
                  {showSeverity && (
                    <motion.div
                      role="menu"
                      aria-label="Severity options"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute bottom-full mb-2 left-0 w-32 bg-bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-50"
                    >
                      {SEVERITY_OPTIONS.map((sev) => (
                        <button
                          key={sev}
                          role="menuitem"
                          onClick={() => {
                            dispatch("update_severity", { severity: sev });
                            setShowSeverity(false);
                          }}
                          className="w-full px-3 py-2 text-xs text-left text-text-secondary hover:bg-bg-elevated capitalize transition-colors"
                        >
                          {sev}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Confirm modal */}
            <AnimatePresence>
              {confirmAction && (
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Confirm ${confirmAction}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-72 bg-bg-surface border border-border rounded-xl shadow-2xl p-4 z-50"
                  onKeyDown={(e) => { if (e.key === "Escape") setConfirmAction(null); }}
                  tabIndex={-1}
                >
                  <p className="text-sm font-medium text-text-primary mb-1">Confirm action</p>
                  <p className="text-xs text-text-muted mb-4">
                    Apply "{confirmAction.replace(/_/g, " ")}" to{" "}
                    <span className="text-text-primary font-medium">{selectedIds.length}</span> alerts?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="flex-1 py-1.5 text-xs rounded-md border border-border text-text-muted hover:bg-bg-elevated transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { dispatch(confirmAction); setConfirmAction(null); }}
                      className="flex-1 py-1.5 text-xs rounded-md bg-severity-critical text-white hover:bg-severity-critical/90 transition-colors"
                    >
                      Confirm
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
