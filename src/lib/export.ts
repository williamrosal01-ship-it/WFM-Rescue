// Shared export helpers: CSV, XLSX (one sheet per section) and PDF (tables with page footer).
// Everything runs in the browser; no data is sent to a server.
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportValue = string | number | boolean | null | undefined;
export type ExportRow = Record<string, ExportValue>;
export type ExportSection = { name: string; title: string; rows: ExportRow[] };

const MAX_PDF_ROWS = 1000;

export function safeFileName(s: string): string {
  return s.replace(/[^\w-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "export";
}

export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function unionKeys(rows: ExportRow[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) if (!seen.has(k)) { seen.add(k); keys.push(k); }
  return keys;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** CSV with UTF-8 BOM (opens correctly in Excel), comma separator, RFC 4180 quoting. */
export function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return "";
  const headers = unionKeys(rows);
  const esc = (v: ExportValue) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "number" ? String(Math.round(v * 10000) / 10000) : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + [headers.map(esc).join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\r\n");
}

export function downloadCsv(baseName: string, rows: ExportRow[]) {
  triggerDownload(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }), `${safeFileName(baseName)}-${todayStamp()}.csv`);
}

function sheetName(s: string, used: Set<string>): string {
  let base = s.replace(/[\[\]\:\*\?\/\\]/g, " ").trim().slice(0, 28) || "Sheet";
  let name = base;
  let i = 2;
  while (used.has(name)) name = `${base.slice(0, 26)} ${i++}`;
  used.add(name);
  return name;
}

export function downloadXlsx(baseName: string, sections: ExportSection[]) {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  for (const s of sections) {
    const ws = XLSX.utils.json_to_sheet(s.rows.length > 0 ? s.rows : [{ info: "—" }]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName(s.name, used));
  }
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  triggerDownload(
    new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${safeFileName(baseName)}-${todayStamp()}.xlsx`,
  );
}

function pdfCell(v: ExportValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isInteger(v) ? v.toLocaleString("en-US") : v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return String(v);
}

/** PDF: title, subtitle, one table per section (max 1000 rows each), page numbers in the footer. */
export function downloadPdf(baseName: string, title: string, subtitle: string, sections: ExportSection[], footer: string) {
  const maxCols = Math.max(1, ...sections.map((s) => unionKeys(s.rows).length));
  const doc = new jsPDF({ orientation: maxCols > 6 ? "landscape" : "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(16, 42, 67);
  doc.text(title, 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 100, 110);
  const subLines = doc.splitTextToSize(subtitle, pageW - 28);
  doc.text(subLines, 14, 22);
  let y = 22 + subLines.length * 4.5 + 4;

  for (const s of sections) {
    if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 16; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(16, 42, 67);
    doc.text(s.title, 14, y);
    y += 3;
    const headers = unionKeys(s.rows);
    const body = s.rows.slice(0, MAX_PDF_ROWS).map((r) => headers.map((h) => pdfCell(r[h])));
    if (headers.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("—", 14, y + 5);
      y += 10;
      continue;
    }
    autoTable(doc, {
      startY: y,
      head: [headers],
      body,
      margin: { left: 14, right: 14, bottom: 16 },
      styles: { fontSize: 7, cellPadding: 1.4, overflow: "linebreak" },
      headStyles: { fillColor: [16, 42, 67], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
    const last = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    y = (last?.finalY ?? y) + 8;
    if (s.rows.length > MAX_PDF_ROWS) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text(`… ${s.rows.length - MAX_PDF_ROWS} more rows: use the CSV or XLSX export.`, 14, y - 3);
      y += 4;
    }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 125, 130);
    const h = doc.internal.pageSize.getHeight();
    doc.text(footer, 14, h - 7);
    doc.text(`${i} / ${pages}`, pageW - 14, h - 7, { align: "right" });
  }
  doc.save(`${safeFileName(baseName)}-${todayStamp()}.pdf`);
}
