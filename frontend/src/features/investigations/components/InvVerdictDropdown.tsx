import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const VERDICT_OPTIONS = [
  { value: "true_positive",   label: "True Positive",  colorClass: "text-sev-critical", dotBg: "bg-sev-critical" },
  { value: "false_positive",  label: "False Positive", colorClass: "text-status-online", dotBg: "bg-status-online" },
  { value: "benign_positive", label: "Benign",         colorClass: "text-blue-400",      dotBg: "bg-blue-400" },
  { value: "suspicious",      label: "Suspicious",     colorClass: "text-sev-medium",    dotBg: "bg-sev-medium" },
  { value: "inconclusive",    label: "Inconclusive",   colorClass: "text-text-muted",    dotBg: "bg-text-muted" },
] as const;

export type VerdictValue = (typeof VERDICT_OPTIONS)[number]["value"];

interface Props {
  current: string | null;
  onSet: (v: string) => void;
  disabled?: boolean;
}

export function InvVerdictDropdown({ current, onSet, disabled }: Props) {
  const opt = VERDICT_OPTIONS.find((o) => o.value === current);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Set verdict"
          aria-haspopup="menu"
          disabled={disabled}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold font-mono",
            "border transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
            opt
              ? `${opt.colorClass} bg-current/10 border-current/30`
              : "text-text-muted bg-bg-subtle border-border hover:border-border-hover",
          )}
        >
          {opt && <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", opt.dotBg)} />}
          {opt?.label ?? "Verdict"}
          <ChevronDown size={10} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className={cn(
            "z-50 min-w-[160px] overflow-hidden rounded-lg py-1",
            "bg-bg-elevated border border-border shadow-panel",
            "animate-fade-in",
          )}
        >
          {VERDICT_OPTIONS.map((o) => (
            <DropdownMenu.Item
              key={o.value}
              onSelect={() => onSet(o.value)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs cursor-pointer outline-none",
                "transition-colors hover:bg-bg-hover",
                current === o.value ? "bg-bg-hover" : "",
                o.colorClass,
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", o.dotBg)} />
              {o.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
