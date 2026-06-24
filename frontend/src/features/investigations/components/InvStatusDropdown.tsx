import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const STATUS_OPTIONS = [
  { value: "new",            label: "New",            colorClass: "text-tx-3",          dotBg: "bg-tx-3" },
  { value: "active",         label: "Active",         colorClass: "text-blue-400",       dotBg: "bg-blue-400" },
  { value: "triaged",        label: "Triaged",        colorClass: "text-sev-medium",     dotBg: "bg-sev-medium" },
  { value: "investigating",  label: "Investigating",  colorClass: "text-status-online",  dotBg: "bg-status-online" },
  { value: "contained",      label: "Contained",      colorClass: "text-sev-high",       dotBg: "bg-sev-high" },
  { value: "resolved",       label: "Resolved",       colorClass: "text-status-online",  dotBg: "bg-status-online" },
  { value: "closed",         label: "Closed",         colorClass: "text-text-muted",     dotBg: "bg-text-muted" },
  { value: "false_positive", label: "False Positive", colorClass: "text-sev-critical",   dotBg: "bg-sev-critical" },
] as const;

export type StatusValue = (typeof STATUS_OPTIONS)[number]["value"];

interface Props {
  current: string;
  onChange: (s: string) => void;
  disabled?: boolean;
}

export function InvStatusDropdown({ current, onChange, disabled }: Props) {
  const opt = STATUS_OPTIONS.find((o) => o.value === current) ?? {
    label: current,
    colorClass: "text-tx-3",
    dotBg: "bg-tx-3",
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Set investigation status"
          aria-haspopup="menu"
          disabled={disabled}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold font-mono",
            "bg-bg-subtle border border-border transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            opt.colorClass,
          )}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", opt.dotBg)} />
          {opt.label}
          <ChevronDown size={10} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className={cn(
            "z-50 min-w-[170px] overflow-hidden rounded-lg py-1",
            "bg-bg-elevated border border-border shadow-panel",
            "animate-fade-in",
          )}
        >
          {STATUS_OPTIONS.map((o) => (
            <DropdownMenu.Item
              key={o.value}
              onSelect={() => onChange(o.value)}
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
