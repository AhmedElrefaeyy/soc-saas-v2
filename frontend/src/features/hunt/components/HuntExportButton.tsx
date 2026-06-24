import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Download, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function escapeCsv(v: unknown): string {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  rows: Record<string, unknown>[];
  filename?: string;
  disabled?: boolean;
  className?: string;
}

export function HuntExportButton({ rows, filename = "hunt-results", disabled, className }: Props) {
  const [open, setOpen] = useState(false);

  const exportCsv = () => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]!);
    const lines   = [headers.join(","), ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(","))];
    downloadBlob(lines.join("\n"), `${filename}.csv`, "text/csv;charset=utf-8;");
    setOpen(false);
  };

  const exportJson = () => {
    downloadBlob(JSON.stringify(rows, null, 2), `${filename}.json`, "application/json");
    setOpen(false);
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          disabled={disabled || rows.length === 0}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
            "border border-border text-text-secondary hover:text-text-primary hover:border-border-hover",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            className,
          )}
          aria-label="Export hunt results"
        >
          <Download size={12} />
          Export
          <ChevronDown size={10} className="text-text-muted" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={4}
          className="z-30 min-w-[120px] overflow-hidden rounded-lg border border-border bg-bg-card shadow-elevated"
        >
          <DropdownMenu.Item
            onSelect={exportCsv}
            className="flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-bg-elevated hover:text-text-primary cursor-pointer select-none outline-none"
          >
            CSV
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={exportJson}
            className="flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-bg-elevated hover:text-text-primary cursor-pointer select-none outline-none"
          >
            JSON
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
