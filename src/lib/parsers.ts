// ============================================================================
// File parsing + column mapping heuristics.
// Supports CSV (via papaparse) and XLSX (via SheetJS).
// Detects common vendor aliases and proposes canonical mappings.
// ============================================================================
import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { ColumnMapping, DataSourceType, IntervalRecord, RawRow } from "./types";
import { readTemplateWorkbook } from "./template-xlsx";

/** Canonical fields we know how to map. */
/** Canonical fields we know how to map — expanded with real vendor headers from 15+ platforms. */
export const CANONICAL_FIELDS: Array<{
  key: keyof IntervalRecord | string;
  label: string;
  aliases: string[];
  required?: boolean;
  type: "string" | "number" | "percent" | "datetime" | "date" | "time" | "boolean";
}> = [
  { key: "intervalStart", label: "Interval start (datetime)", aliases: ["interval_start", "start_time", "datetime", "interval start", "start", "start date", "fecha hora", "inicio intervalo", "intervalo inicio", "date time", "interval start time", "interval_start_time", "report date", "period start", "from", "interval begin", "timestamp", "event time", "queue enqueue timestamp", "initiation timestamp", "conversation start"], required: true, type: "datetime" },
  { key: "intervalEnd", label: "Interval end (datetime)", aliases: ["interval_end", "end_time", "end", "fin intervalo", "interval end time", "to", "period end", "interval finish", "disconnect timestamp"], type: "datetime" },
  { key: "date", label: "Date", aliases: ["date", "fecha", "dia", "day", "contact_date", "call_date", "report date", "business date", "calendar date", "created date"], type: "date" },
  { key: "intervalLabel", label: "Interval label (HH:MM)", aliases: ["interval", "time", "hora", "interval_label", "interval label", "hh:mm", "time interval", "hour", "time of day", "slot", "period", "time slot"], type: "time" },
  { key: "queue", label: "Queue / Queue Name", aliases: ["queue", "queue_name", "queue name", "cola", "servicio", "dnis", "queueid", "campaign", "queue id", "split skill", "split", "skill queue", "in queue", "ring group", "contact center", "queue group", "acd group", "hunt group", "ivr queue", "campaign name", "queue split", "program", "line of business", "queue/split", "queue skill", "dn"], type: "string" },
  { key: "skill", label: "Skill", aliases: ["skill", "skill_name", "habilidad", "skill id", "proficiency", "language skill", "multiskill", "skill group"], type: "string" },
  { key: "channel", label: "Channel", aliases: ["channel", "media", "medio", "channel type", "media type", "interaction type", "contact type", "media type name", "work type", "channel name", "service type", "interaction channel"], type: "string" },
  { key: "site", label: "Site", aliases: ["site", "location", "centro", "sucursal", "site name", "site id", "location name", "center", "branch", "office", "region", "division", "site group"], type: "string" },
  { key: "team", label: "Team / Team Lead", aliases: ["team", "team_name", "equipo", "team lead", "supervisor", "group", "agent group", "team id", "squad", "ring group"], type: "string" },
  { key: "forecastVolume", label: "Forecast volume (calls/contacts)", aliases: ["forecast", "fcst_calls", "predicted_calls", "forecast_volume", "volume_forecast", "volumen_pronosticado", "pronostico", "pronóstico", "fcst volume", "forecast calls", "predicted volume", "expected calls", "projected calls", "call forecast", "forecast contacts", "predicted contacts", "est calls", "plan volume"], type: "number" },
  { key: "actualVolume", label: "Actual volume", aliases: ["actual_calls", "calls", "contacts", "actual volume", "volume", "volumen", "n_calls", "contactos", "handled", "answered_calls", "contacts offered", "contacts handled", "inbound calls", "total calls", "call volume", "interactions", "cases"], type: "number" },
  { key: "offered", label: "Calls offered", aliases: ["offered", "calls_offered", "ofrecidas", "llamadas ofrecidas", "calls received", "total_calls", "calls offered", "offered calls", "total offered", "incoming calls", "received", "arrivals", "contacts offered", "tasks created", "tickets created", "acd calls", "queued", "in queue", "offered contacts", "total offered"], type: "number" },
  { key: "answered", label: "Calls answered", aliases: ["answered", "calls_answered", "atendidas", "llamadas atendidas", "ans_calls", "accepted", "answered calls", "calls answered", "calls handled", "handled calls", "completed", "served", "acd calls answered", "tasks completed", "tickets solved", "resolved", "connected", "answered contacts", "contacts answered"], type: "number" },
  { key: "abandoned", label: "Abandoned", aliases: ["abandoned", "abandon", "abandons", "abandonadas", "abandoned_calls", "lost", "calls_lost", "abandoned calls", "calls abandoned", "abandons calls", "aban calls", "abandon rate count", "missed calls", "unanswered", "dropped", "tasks canceled", "lost calls", "aban", "abandon count"], type: "number" },
  { key: "forecastAht", label: "Forecast AHT (seconds)", aliases: ["fcst_aht", "forecast_aht", "predicted_aht", "aht_forecast", "aht pronosticado", "forecast avg handle time", "planned aht", "expected aht"], type: "number" },
  { key: "actualAht", label: "Actual AHT (seconds)", aliases: ["aht", "actual_aht", "avg_handle_time", "average handle time", "tmo", "tiempo medio operacion", "handle time", "average handling time", "aht seconds", "avg handling time", "handle time sec", "handling time", "avg talk time", "talk plus hold plus acw", "resolution time", "avg resolution time", "avg handle time sec"], type: "number" },
  { key: "talkTime", label: "Talk time (sec)", aliases: ["talk_time", "talk", "tiempo_conversacion", "conversation time", "avg talk time", "talk duration", "agent interaction duration", "handle talk", "avg acd time", "talk time sec"], type: "number" },
  { key: "holdTime", label: "Hold time (sec)", aliases: ["hold_time", "hold", "tiempo_espera", "hold duration", "avg hold time", "hold time sec"], type: "number" },
  { key: "acwTime", label: "ACW / Wrap (sec)", aliases: ["acw", "wrap_time", "wrap", "after_call_work", "trabajo_posterior", "posterior", "acw time", "wrap up time", "after contact work duration", "avg acw time", "post call work", "avg acw time sec"], type: "number" },
  { key: "serviceLevel", label: "Service Level (0-1 or %)", aliases: ["service_level", "sl", "svc_level", "nivel_servicio", "svclevel", "service level", "sl_pct", "service level %", "sla %", "sla", "sl %", "service level percent", "queue sla", "service level achieved", "sl achieved", "level of service", "grade of service", "sla achieved", "service level attained"], type: "percent" },
  { key: "serviceLevelTarget", label: "SL Target (0-1 or %)", aliases: ["sl_target", "service_level_target", "objetivo_sl", "target_sl", "sla target", "service level target", "sl goal", "target service level"], type: "percent" },
  { key: "serviceLevelThreshold", label: "SL Threshold (seconds)", aliases: ["sl_threshold", "service_level_threshold", "umbral_sl", "sl_secs", "service level threshold", "sla threshold sec"], type: "number" },
  { key: "asa", label: "ASA (seconds)", aliases: ["asa", "avg_speed_answer", "average speed of answer", "velocidad media respuesta", "avg_answer_speed", "average speed to answer", "avg wait time", "average wait time", "queue duration", "speed of answer", "avg speed ans", "average speed of answer sec", "wait time", "average queue time", "avg speed of ans", "average speed ans"], type: "number" },
  { key: "occupancy", label: "Occupancy (0-1 or %)", aliases: ["occupancy", "occ", "ocupacion", "utilization", "utilizacion", "occupancy %", "agent occupancy", "utilization %", "productive utilization", "occupancy percent"], type: "percent" },
  { key: "requiredStaff", label: "Required staff", aliases: ["required", "required_staff", "fte_required", "agents_required", "necesarios", "personal necesario", "req_agents", "staff required", "required agents", "agents required", "fte needed", "staff needed", "needed agents", "req staff", "agents needed", "required fte", "fte required", "staff requirement", "headcount required", "agents req", "required headcount"], type: "number" },
  { key: "scheduledStaff", label: "Scheduled staff", aliases: ["scheduled", "scheduled_staff", "fte_scheduled", "agents_scheduled", "programados", "sched_staff", "sched agents", "scheduled agents", "agents scheduled", "staff scheduled", "sched headcount", "planned agents", "rostered agents", "on queue agents", "scheduled fte", "sched agents", "planned headcount"], type: "number" },
  { key: "actualStaff", label: "Actual staff / logged in", aliases: ["actual_staff", "actual_staffing", "agents_logged", "logged_in", "presentes", "en piso", "agents_in", "staffed", "agents present", "actual agents", "agents present", "agents on call", "logged in agents", "available agents", "staffed agents", "actual headcount", "present agents", "agents available", "on staff", "active agents", "agents online", "avg pos staff", "staffed headcount", "agents staffed", "staffed agents", "avg staff"], type: "number" },
  { key: "availableStaff", label: "Available / ready agents", aliases: ["available", "available_agents", "ready", "agents_ready", "disponibles", "en cola", "agents available", "ready agents", "idle agents", "available staff"], type: "number" },
  { key: "agentId", label: "Agent ID", aliases: ["agent_id", "agentid", "id_agente", "employee_id", "emp_id", "agent username", "user id", "login id", "nt login", "agent login", "agent id number"], type: "string" },
  { key: "agentName", label: "Agent name", aliases: ["agent_name", "agent", "agente", "employee_name", "name", "nombre", "agent name", "full name", "display name", "user name", "employee name"], type: "string" },
  { key: "scheduledActivity", label: "Scheduled activity", aliases: ["scheduled_activity", "activity", "actividad_programada", "schedule_code", "sched_activity", "sched code", "scheduled state", "planned activity", "roster activity", "scheduled aux"], type: "string" },
  { key: "actualActivity", label: "Actual activity", aliases: ["actual_activity", "state", "estado", "current_state", "agent_state", "estado_actual", "actual state", "current status", "agent status", "actual aux"], type: "string" },
  { key: "auxCode", label: "AUX code", aliases: ["aux_code", "reason_code", "reason", "codigo_aux", "aux", "no productivo", "not ready reason", "aux reason", "aux code", "aux name", "not ready code", "unavailable reason", "aux category"], type: "string" },
  { key: "auxDurationSec", label: "AUX duration (sec)", aliases: ["aux_duration", "aux_time", "duracion_aux", "not_ready_time", "tiempo_aux", "aux duration", "aux time", "aux duration sec", "not ready duration", "unavailable duration", "aux total time", "aux time sec"], type: "number" },
];

export interface ParseResult {
  headers: string[];
  rows: RawRow[];
  suggestedMappings: ColumnMapping[];
  detectedType?: DataSourceType;
  totalRows: number;
  /** Set when the workbook used the template sheets (Intervalos / Horarios / Asistencia). */
  templateInfo?: {
    sheets: string[];
    skipped: number;
    duplicates: number;
    unknownHeaders: string[];
  };
  /** All sheet names of an XLSX workbook (empty for CSV). */
  sheetNames?: string[];
}

/** Normalize header for alias matching. */
export const normalizeHeader = (h: string): string =>
  h
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ")
    .replace(/["']/g, "")
    .replace(/\s+/g, " ")
    .replace(/[\(\)\/\\:;,\.\\_-]+/g, " ")
    .trim();

/** Find the canonical field for a file header, if any. */
export const matchCanonical = (header: string): ColumnMapping => {
  const n = normalizeHeader(header);
  for (const f of CANONICAL_FIELDS) {
    if (n === f.key.toLowerCase()) {
      return { fileColumn: header, canonicalField: f.key };
    }
    if (f.aliases.some((a) => normalizeHeader(a) === n)) {
      return { fileColumn: header, canonicalField: f.key };
    }
  }
  // Fuzzy contains
  for (const f of CANONICAL_FIELDS) {
    const key = f.key.toLowerCase();
    if (n.includes(key) || key.includes(n)) {
      // require at least 4 chars to avoid false positives
      if (n.length >= 4 && key.length >= 4) {
        return { fileColumn: header, canonicalField: f.key };
      }
    }
    for (const a of f.aliases) {
      const na = normalizeHeader(a);
      if ((n.includes(na) || na.includes(n)) && Math.min(n.length, na.length) >= 5) {
        return { fileColumn: header, canonicalField: f.key };
      }
    }
  }
  return { fileColumn: header, canonicalField: null };
};

/** Try to detect source type by looking for specific fields. */
export const detectSourceType = (headers: string[]): DataSourceType | undefined => {
  const n = headers.map(normalizeHeader);
  const has = (aliases: string[]) => aliases.some((a) => n.some((h) => h.includes(normalizeHeader(a))));
  if (has(["agent id", "agentid", "id_agente", "employee_id", "agent_name", "agente"])) {
    if (has(["scheduled_activity", "actividad_programada", "actual_activity", "estado_actual"])) return "adherence";
    return "agent";
  }
  if (has(["forecast_calls", "fcst_calls", "forecast volume", "pronostico", "pronóstico"]) && !has(["actual_calls", "answered", "atendidas"])) {
    return "forecast";
  }
  if (has(["scheduled_staff", "programados", "sched_staff"]) && !has(["actual_staff", "calls offered"])) {
    return "schedule";
  }
  if (has(["offered", "answered", "atendidas", "abandoned", "service_level", "aht", "asa"])) {
    return "actual";
  }
  if (has(["aux_code", "codigo_aux", "reason code", "not ready"])) {
    return "aux";
  }
  return undefined;
};

/** Parse a CSV File or string. */
export const parseCsv = async (input: File | string): Promise<ParseResult> => {
  const text = typeof input === "string" ? input : await input.text();
  return parseCsvText(text);
};

export const parseCsvText = (text: string): ParseResult => {
  const result = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  });
  const rows = result.data as RawRow[];
  const headers = result.meta.fields ?? [];
  return finalizeParse(headers, rows);
};

/**
 * Parse an XLSX File.
 * - Workbook with template sheets (Intervalos/Horarios/Asistencia or English names):
 *   the sheets are joined on date + interval + queue + channel.
 * - Otherwise: the given sheet, or the first sheet.
 */
export const parseXlsx = async (input: File, sheetName?: string): Promise<ParseResult> => {
  const buf = await input.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: false });
  const sheetNames = [...wb.SheetNames];
  if (!sheetName) {
    const tpl = readTemplateWorkbook(wb);
    if (tpl) {
      const result = finalizeParse(tpl.headers as string[], tpl.rows as RawRow[]);
      return {
        ...result,
        sheetNames,
        templateInfo: {
          sheets: Object.values(tpl.sheetNames).filter((n): n is string => Boolean(n)),
          skipped: tpl.skipped,
          duplicates: tpl.duplicates,
          unknownHeaders: Object.values(tpl.unknownHeaders).flat() as string[],
        },
      };
    }
  }
  const chosen = sheetName && wb.Sheets[sheetName] ? sheetName : wb.SheetNames[0];
  const sheet = wb.Sheets[chosen];
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: null, raw: false });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { ...finalizeParse(headers, rows), sheetNames };
};

function finalizeParse(headers: string[], rows: RawRow[]): ParseResult {
  const mappings = headers.map((h) => {
    const m = matchCanonical(h);
    const sample = rows[0]?.[h];
    return { ...m, exampleValue: sample as string | number | null | undefined };
  });
  const detectedType = detectSourceType(headers);
  return {
    headers,
    rows,
    suggestedMappings: mappings,
    detectedType,
    totalRows: rows.length,
  };
}

/**
 * Language of the data file (not of the interface). Controls how ambiguous text is read:
 * es: 1.234,5 numbers and day/month dates (05/10/2026 = 5 Oct); en: 1,234.5 and month/day (05/10/2026 = 10 May).
 */
export type DataLanguage = "es" | "en";

/** Number from text in the data's language. Unambiguous patterns win over the language default. */
export const parseLocaleNumber = (text: string, lang: DataLanguage): number | null => {
  let s = text.trim().replace(/[\$€£%\s\u00A0]/g, "");
  if (!s) return null;
  if (lang === "es") {
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^-?\d+,\d+$/.test(s)) s = s.replace(",", ".");
  } else {
    if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
    else if (/^-?\d+,\d{1,2}$/.test(s)) s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const ISO_DATE_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
const SLASH_DATE_RE = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4}|\d{2})(?:[T\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?(?:\s*([AaPp])\.?[Mm]\.?)?$/;

const localDate = (y: number, mo: number, d: number, h = 0, mi = 0, sec = 0): Date | null => {
  const dt = new Date(y, mo, d, h, mi, sec);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
};

/** Date/time text. Ambiguous a/b/yyyy is read day-first for es and month-first for en. */
export const parseDateText = (text: string, lang: DataLanguage): Date | null => {
  const s = text.trim();
  const iso = s.match(ISO_DATE_RE);
  if (iso) {
    return localDate(+iso[1]!, +iso[2]! - 1, +iso[3]!, +(iso[4] ?? 0), +(iso[5] ?? 0), +(iso[6] ?? 0));
  }
  const m = s.match(SLASH_DATE_RE);
  if (m) {
    const a = +m[1]!;
    const b = +m[2]!;
    let year = +m[3]!;
    if (m[3]!.length === 2) year += 2000;
    let day: number;
    let month: number;
    if (a > 12) { day = a; month = b; }
    else if (b > 12) { month = a; day = b; }
    else if (lang === "es") { day = a; month = b; }
    else { month = a; day = b; }
    let h = +(m[4] ?? 0);
    const ampm = m[7]?.toLowerCase();
    if (ampm === "p" && h < 12) h += 12;
    if (ampm === "a" && h === 12) h = 0;
    return localDate(year, month - 1, day, h, +(m[5] ?? 0), +(m[6] ?? 0));
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Coerce a raw cell value to the canonical JS type, reading text in the data's language. */
export const coerceValue = (
  raw: unknown,
  type: "string" | "number" | "percent" | "datetime" | "date" | "time" | "boolean",
  lang: DataLanguage = "en",
): unknown => {
  if (raw == null || raw === "") return null;
  if (type === "string") return String(raw).trim();
  if (type === "boolean") {
    if (typeof raw === "boolean") return raw;
    const s = String(raw).toLowerCase().trim();
    return ["1", "true", "yes", "si", "sí", "y"].includes(s);
  }
  if (type === "number") {
    if (raw instanceof Date) return raw.getTime();
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
    return parseLocaleNumber(String(raw), lang);
  }
  if (type === "percent") {
    if (typeof raw === "number") return raw > 1 ? raw / 100 : raw;
    const n = parseLocaleNumber(String(raw), lang);
    if (n == null) return null;
    // If >1 assume it's already a percentage (85 means 85%); else 0.85
    return n > 1 ? n / 100 : n;
  }
  // date, datetime, time
  if (raw instanceof Date) return raw;
  const s = String(raw).trim();
  if (type === "time") {
    const tm = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?$/);
    if (tm) {
      let h = parseInt(tm[1]!, 10);
      const mm = parseInt(tm[2]!, 10);
      const ampm = tm[4];
      if (ampm) {
        if (ampm.toLowerCase() === "pm" && h < 12) h += 12;
        if (ampm.toLowerCase() === "am" && h === 12) h = 0;
      }
      const t = new Date();
      t.setHours(h, mm, 0, 0);
      return t;
    }
  }
  return parseDateText(s, lang);
};

/**
 * Apply mappings and coerce rows into IntervalRecord[] (best effort).
 * Fields without mappings are dropped; unrecognized columns are ignored.
 */
export const applyMappings = (
  rows: RawRow[],
  mappings: ColumnMapping[],
  options: { dataLanguage?: DataLanguage } = {},
): IntervalRecord[] => {
  const lang = options.dataLanguage ?? "en";
  const out: IntervalRecord[] = [];
  for (const row of rows) {
    const rec: Record<string, unknown> = { sourceType: "actual" };
    for (const m of mappings) {
      if (!m.canonicalField) continue;
      const def = CANONICAL_FIELDS.find((f) => f.key === m.canonicalField);
      if (!def) continue;
      const raw = row[m.fileColumn];
      rec[m.canonicalField] = coerceValue(raw, def.type, lang);
    }
    // Derive intervalStart/End if we have date + intervalLabel
    if (!rec.intervalStart && rec.date && rec.intervalLabel) {
      const d = rec.date instanceof Date ? rec.date : new Date(String(rec.date));
      const tm = String(rec.intervalLabel).match(/(\d{1,2}):(\d{2})/);
      if (tm && !Number.isNaN(d.getTime())) {
        const h = parseInt(tm[1]!, 10);
        const mm = parseInt(tm[2]!, 10);
        const start = new Date(d);
        start.setHours(h, mm, 0, 0);
        rec.intervalStart = start;
        rec.intervalEnd = new Date(start.getTime() + 15 * 60 * 1000);
      }
    }
    if (rec.intervalStart instanceof Date && !rec.intervalEnd) {
      rec.intervalEnd = new Date((rec.intervalStart as Date).getTime() + 15 * 60 * 1000);
    }
    // Ensure id
    const key =
      (rec.intervalStart instanceof Date ? rec.intervalStart.toISOString() : String(rec.intervalStart ?? Math.random())) +
      "-" + String(rec.queue ?? "") +
      "-" + String(rec.channel ?? "");
    const finalRec = { id: key, ...(rec as Record<string, unknown>) } as unknown as IntervalRecord;
    out.push(finalRec);
  }
  return out;
};
