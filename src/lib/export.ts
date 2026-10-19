// Shared export helpers: CSV and XLSX (one sheet per section). PDF is printed from the page (see print-report.ts).
// Everything runs in the browser; no data is sent to a server.
import * as XLSX from "xlsx";

export type ExportValue = string | number | boolean | null | undefined;
export type ExportRow = Record<string, ExportValue>;
export type ExportSection = { name: string; title: string; rows: ExportRow[] };


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
