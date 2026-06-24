import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

interface Shortcut {
  keys: string[];
  description: string;
}

const SECTIONS: { label: string; shortcuts: Shortcut[] }[] = [
  {
    label: "Global",
    shortcuts: [
      { keys: ["?"],        description: "Open keyboard shortcuts" },
      { keys: ["Ctrl", "K"], description: "Open command palette" },
      { keys: ["Escape"],   description: "Close modal / drawer" },
    ],
  },
  {
    label: "Alert Triage",
    shortcuts: [
      { keys: ["Click row"],  description: "Open alert detail drawer" },
      { keys: ["Space"],      description: "Select / deselect row" },
      { keys: ["Shift", "↑↓"], description: "Extend selection" },
    ],
  },
  {
    label: "Threat Hunt",
    shortcuts: [
      { keys: ["Ctrl", "Enter"], description: "Run hunt query" },
      { keys: ["Ctrl", "E"],     description: "Export results as CSV" },
    ],
  },
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["Alt", "1"], description: "Go to Dashboard" },
      { keys: ["Alt", "2"], description: "Go to Alerts" },
      { keys: ["Alt", "3"], description: "Go to Investigations" },
      { keys: ["Alt", "4"], description: "Go to Hunt" },
    ],
  },
];

function Key({ label }: { label: string }) {
  return (
    <kbd className={cn(
      "inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5",
      "text-2xs font-mono font-bold text-text-secondary",
      "bg-bg-elevated border border-border rounded",
      "shadow-[0_1px_0_rgba(255,255,255,0.08)]",
    )}>
      {label}
    </kbd>
  );
}

export function ShortcutsModal() {
  const open = useUIStore((s) => s.shortcutsModalOpen);
  const close = useUIStore((s) => s.closeShortcutsModal);

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          role="dialog"
          aria-modal="true"
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-full max-w-lg rounded-xl border border-border bg-bg-card shadow-elevated",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2",
            "data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]",
          )}
          onEscapeKeyDown={close}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <Dialog.Title className="text-sm font-bold text-text-primary font-display">
              Keyboard Shortcuts
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                onClick={close}
                aria-label="Close keyboard shortcuts"
                className="text-text-muted hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
              >
                <X size={15} />
              </button>
            </Dialog.Close>
          </div>

          {/* Sections */}
          <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {SECTIONS.map((section) => (
              <div key={section.label}>
                <p className="text-2xs font-bold uppercase tracking-widest text-text-muted mb-2.5">
                  {section.label}
                </p>
                <div className="space-y-1.5">
                  {section.shortcuts.map((s) => (
                    <div key={s.description} className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-text-secondary">{s.description}</span>
                      <div className="flex items-center gap-1">
                        {s.keys.map((k, i) => (
                          <span key={i} className="flex items-center gap-1">
                            {i > 0 && <span className="text-2xs text-text-muted">+</span>}
                            <Key label={k} />
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border">
            <p className="text-2xs text-text-muted text-center">
              Press <Key label="?" /> to toggle this panel
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
