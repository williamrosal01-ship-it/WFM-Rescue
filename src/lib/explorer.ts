// ============================================================================
// Data Explorer: row-level view of the active interval dataset.
// Pure functions (no React, no DOM) so they can be unit-tested.
// Ported from v281 services/dataExplorer.ts (materialize, filter, CSV export).
// ============================================================================
import type { IntervalRecord } from "./types";

export type ExplorerLang = "es" | "en";

export type ExplorerFormat = "text" | "number" | "percent" | "date";

export interface ExplorerColumn {
  id: string;
  label: Record<ExplorerLang, string>;
  format: ExplorerFormat;
  get: (r: IntervalRecord) => unknown;
}

/** Column set for the explorer. Labels are full sentences in both languages. */
export const EXPLORER_COLUMNS: ExplorerColumn[] = [
  { id: "date", label: { es: "Fecha", en: "Date" }, format: "date", get: (r) => r.date },
  { id: "interval", label: { es: "Intervalo", en: "Interval" }, format: "text", get: (r) => r.intervalLabel },
  { id: "queue", label: { es: "Cola", en: "Queue" }, format: "text", get: (r) => r.queue },
  { id: "channel", label: { es: "Canal", en: "Channel" }, format: "text", get: (r) => r.channel },
  { id: "site", label: { es: "Sitio", en: "Site" }, format: "text", get: (r) => r.site },
  { id: "forecastVolume", label: { es: "Volumen pronosticado", en: "Forecast volume" }, format: "number", get: (r) => r.forecastVolume },
  { id: "offered", label: { es: "Ofrecidas", en: "Calls offered" }, format: "number", get: (r) => r.offered },
  { id: "answered", label: { es: "Atendidas", en: "Calls answered" }, format: "number", get: (r) => r.answered },
  { id: "abandoned", label: { es: "Abandonadas", en: "Abandoned" }, format: "number", get: (r) => r.abandoned },
  { id: "serviceLevel", label: { es: "Nivel de servicio", en: "Service level" }, format: "percent", get: (r) => r.serviceLevel },
  { id: "asa", label: { es: "ASA (seg)", en: "ASA (sec)" }, format: "number", get: (r) => r.asa },
  { id: "actualAht", label: { es: "TMO (seg)", en: "AHT (sec)" }, format: "number", get: (r) => r.actualAht },
  { id: "requiredStaff", label: { es: "Personal necesario", en: "Required staff" }, format: "number", get: (r) => r.requiredStaff },
  { id: "scheduledStaff", label: { es: "Personal programado", en: "Scheduled staff" }, format: "number", get: (r) => r.scheduledStaff },
  { id: "actualStaff", label: { es: "Personal presente", en: "Actual staff" }, format: "number", get: (r) => r.actualStaff },
  { id: "occupancy", label: { es: "Ocupación", en: "Occupancy" }, format: "percent", get: (r) => r.occupancy },
  { id: "sourceType", label: { es: "Tipo de fuente", en: "Source type" }, format: "text", get: (r) => r.sourceType },
];

/** Text of one cell. Percent values are stored as 0..1 and shown as 0..100 with one decimal. */
export const formatExplorerCell = (value: unknown, format: ExplorerFormat): string => {
  if (value === null || value === undefined || value === "") return "";
  if (format === "date") {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    if (format === "percent") return `${(value * 100).toFixed(1)}%`;
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  }
  return String(value);
};

export type ExplorerRow = Record<string, string>;

/** One text row per interval record, keyed by column id. */
export const materializeIntervalRows = (
  records: IntervalRecord[],
  columns: ExplorerColumn[] = EXPLORER_COLUMNS,
): ExplorerRow[] =>
  records.map((r) => {
    const row: ExplorerRow = {};
    for (const c of columns) row[c.id] = formatExplorerCell(c.get(r), c.format);
    return row;
  });

/** Columns whose label (in the given language) or id contains the query. */
export const filterExplorerColumns = (
  columns: ExplorerColumn[],
  query: string,
  lang: ExplorerLang,
): ExplorerColumn[] => {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return columns;
  return columns.filter((c) => c.label[lang].toLocaleLowerCase().includes(q) || c.id.toLowerCase().includes(q));
};

/** Rows where any displayed value contains the query, capped at limit. */
export const filterExplorerRows = (
  rows: ExplorerRow[],
  query: string,
  limit: number,
  columnIds?: string[],
): ExplorerRow[] => {
  const q = query.trim().toLocaleLowerCase();
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : rows.length;
  const out: ExplorerRow[] = [];
  for (const row of rows) {
    if (out.length >= safeLimit) break;
    if (!q) {
      out.push(row);
      continue;
    }
    const ids = columnIds ?? Object.keys(row);
    if (ids.some((id) => (row[id] ?? "").toLocaleLowerCase().includes(q))) out.push(row);
  }
  return out;
};

const csvCell = (v: string): string => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** CSV with a UTF-8 BOM (Excel opens accents correctly) and CRLF line endings. */
export const explorerCsv = (
  columns: ExplorerColumn[],
  rows: ExplorerRow[],
  lang: ExplorerLang,
): string => {
  const header = columns.map((c) => csvCell(c.label[lang]));
  const body = rows.map((row) => columns.map((c) => csvCell(row[c.id] ?? "")).join(","));
  return "\uFEFF" + [header.join(","), ...body].join("\r\n");
};

/** Safe file base name from a free-text label. */
export const explorerFileBase = (name: string): string =>
  name.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "dataset";
