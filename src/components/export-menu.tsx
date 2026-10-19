"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { Button } from "@/components/ui";
import { useTx } from "@/lib/tx";
import { downloadCsv, downloadXlsx, type ExportRow, type ExportSection } from "@/lib/export";
import { printReport } from "@/lib/print-report";
import { useUploadsEnabled } from "@/lib/plan-access";

/**
 * One "Download" button with a menu: CSV, XLSX, PDF.
 * Demo: PDF only. CSV and XLSX are Pro (they expose the source templates), shown as "Pro only".
 */
export function ExportMenu({
  name,
  title,
  sections,
  disabled,
}: {
  name: string;
  title: string;
  subtitle?: string;
  sections: ExportSection[];
  disabled?: boolean;
}) {
  const tx = useTx();
  const USER_UPLOADS_ENABLED = useUploadsEnabled();
    const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const empty = disabled || sections.every((s) => s.rows.length === 0);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const items = [
    { id: "csv", label: "CSV", pro: true, run: () => downloadCsv(name, sections[0]?.rows ?? []) },
    { id: "xlsx", label: "XLSX", pro: true, run: () => downloadXlsx(name, sections) },
    { id: "pdf", label: tx("PDF (guardar como PDF)", "PDF (save as PDF)"), pro: false, run: () => printReport(title) },
  ];

  return (
    <div ref={wrap} className="relative">
      <Button variant="secondary" size="sm" disabled={empty} onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        <Download className="h-3.5 w-3.5" /> {tx("Descargar", "Download")} <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-1 w-48 overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-lg">
          {items.map((it) => {
            const locked = it.pro && !USER_UPLOADS_ENABLED;
            return (
              <button
                key={it.id}
                type="button"
                role="menuitem"
                disabled={locked}
                onClick={() => {
                  it.run();
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:text-[var(--text-quaternary)] disabled:hover:bg-transparent"
              >
                <span>{it.label}</span>
                {locked ? (
                  <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-strong)]">{tx("Solo Pro", "Pro only")}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
