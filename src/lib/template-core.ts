// ============================================================================
// Source templates: column definitions, header resolution and sheet merge.
// Pure module (no I/O, no xlsx dependency) so it can be unit-tested directly.
//
// A template workbook has three data sheets, one per role:
//   intervals  -> volumes, service level, ASA, AHT per interval
//   schedule   -> scheduled and required staff per interval
//   attendance -> actual staff per interval
// Rows are joined on date + interval + queue + channel, so one workbook can
// describe a full interval (volume + staffing) for the same queue.
// ============================================================================

export const TEMPLATE_SOURCES = ["salesforce", "five9", "verint", "other"] as const;
export type TemplateSource = (typeof TEMPLATE_SOURCES)[number];

export type TemplateLang = "es" | "en";
export type TemplateRole = "intervals" | "schedule" | "attendance";
export const TEMPLATE_ROLES: TemplateRole[] = ["intervals", "schedule", "attendance"];

export type TemplateKey =
  | "date"
  | "intervalLabel"
  | "queue"
  | "channel"
  | "offered"
  | "answered"
  | "abandoned"
  | "serviceLevel"
  | "serviceLevelThreshold"
  | "asa"
  | "actualAht"
  | "scheduledStaff"
  | "requiredStaff"
  | "actualStaff";

export type TemplateColumnType = "date" | "time" | "text" | "number" | "percent";

export interface TemplateColumn {
  key: TemplateKey;
  roles: TemplateRole[];
  required: boolean;
  type: TemplateColumnType;
  header: Record<TemplateLang, string>;
  /** Extra names accepted when reading an uploaded file (normalized on compare). */
  aliases: string[];
  unit: Record<TemplateLang, string>;
  description: Record<TemplateLang, string>;
  example: Record<TemplateLang, string>;
  /** Field label in the source system. "—" = not verified; confirm with the client. */
  origin: Partial<Record<TemplateSource, string>>;
}

const ALL: TemplateRole[] = ["intervals", "schedule", "attendance"];

export const TEMPLATE_COLUMNS: TemplateColumn[] = [
  {
    key: "date", roles: ALL, required: true, type: "date",
    header: { es: "Fecha", en: "Date" }, aliases: ["date", "fecha", "dia", "day"], unit: { es: "AAAA-MM-DD", en: "YYYY-MM-DD" },
    description: { es: "Día del intervalo. Acepta AAAA-MM-DD, DD/MM/AAAA o una celda de fecha de Excel.", en: "Day of the interval. Accepts YYYY-MM-DD, DD/MM/YYYY or an Excel date cell." },
    example: { es: "2026-10-05", en: "2026-10-05" },
    origin: { five9: "Date" },
  },
  {
    key: "intervalLabel", roles: ALL, required: true, type: "time",
    header: { es: "Intervalo", en: "Interval" }, aliases: ["intervalLabel", "interval", "hora", "hh:mm"], unit: { es: "HH:MM", en: "HH:MM" },
    description: { es: "Inicio del intervalo de 15 minutos en formato 24 h.", en: "Start of the 15-minute interval in 24-hour format." },
    example: { es: "08:15", en: "08:15" },
    origin: { five9: "Hour of Day" },
  },
  {
    key: "queue", roles: ALL, required: true, type: "text",
    header: { es: "Cola", en: "Queue" }, aliases: ["queue", "skill", "cola", "servicio"], unit: { es: "", en: "" },
    description: { es: "Nombre exacto de la cola o habilidad. Usa el mismo texto en las tres hojas.", en: "Exact name of the queue or skill. Use the same text in all three sheets." },
    example: { es: "Ventas", en: "Sales" },
    origin: { five9: "Skill" },
  },
  {
    key: "channel", roles: ALL, required: true, type: "text",
    header: { es: "Canal", en: "Channel" }, aliases: ["channel", "media", "medio"], unit: { es: "", en: "" },
    description: { es: "Canal de atención (voz, chat, correo…). Usa el mismo texto en las tres hojas; si solo hay un canal, escribe Voz.", en: "Service channel (voice, chat, email…). Use the same text in all three sheets; if there is only one channel, write Voz or Voice." },
    example: { es: "Voz", en: "Voice" },
    origin: {},
  },
  {
    key: "offered", roles: ["intervals"], required: false, type: "number",
    header: { es: "Ofrecidas", en: "Calls offered" }, aliases: ["offered", "calls offered", "ofrecidas", "llamadas ofrecidas", "calls"], unit: { es: "número", en: "count" },
    description: { es: "Interacciones que llegaron a la cola en el intervalo.", en: "Interactions that reached the queue in the interval." },
    example: { es: "120", en: "120" },
    origin: { five9: "Calls" },
  },
  {
    key: "answered", roles: ["intervals"], required: false, type: "number",
    header: { es: "Atendidas", en: "Calls answered" }, aliases: ["answered", "calls answered", "atendidas", "llamadas atendidas"], unit: { es: "número", en: "count" },
    description: { es: "Interacciones atendidas por un agente en el intervalo.", en: "Interactions answered by an agent in the interval." },
    example: { es: "104", en: "104" },
    origin: { five9: "Calls Answered" },
  },
  {
    key: "abandoned", roles: ["intervals"], required: false, type: "number",
    header: { es: "Abandonadas", en: "Abandoned" }, aliases: ["abandoned", "abandonadas", "calls abandoned"], unit: { es: "número", en: "count" },
    description: { es: "Interacciones abandonadas antes de ser atendidas.", en: "Interactions abandoned before being answered." },
    example: { es: "9", en: "9" },
    origin: { five9: "Abandoned (count)" },
  },
  {
    key: "serviceLevel", roles: ["intervals"], required: false, type: "percent",
    header: { es: "Nivel de servicio (%)", en: "Service level (%)" }, aliases: ["service level", "servicelevel", "nivel de servicio", "sl", "sla"], unit: { es: "% (0–100)", en: "% (0–100)" },
    description: { es: "Porcentaje de interacciones atendidas dentro del umbral.", en: "Percentage of interactions answered within the threshold." },
    example: { es: "82", en: "82" },
    origin: { five9: "Service Level (% of records)" },
  },
  {
    key: "serviceLevelThreshold", roles: ["intervals"], required: false, type: "number",
    header: { es: "Umbral SL (seg)", en: "SL threshold (sec)" }, aliases: ["sl threshold", "umbral sl", "service level threshold"], unit: { es: "segundos", en: "seconds" },
    description: { es: "Segundos del umbral de nivel de servicio (opcional).", en: "Service level threshold in seconds (optional)." },
    example: { es: "20", en: "20" },
    origin: { five9: "Speed of answer threshold" },
  },
  {
    key: "asa", roles: ["intervals"], required: false, type: "number",
    header: { es: "ASA (seg)", en: "ASA (sec)" }, aliases: ["asa", "velocidad media de respuesta", "average speed of answer"], unit: { es: "segundos", en: "seconds" },
    description: { es: "Tiempo promedio de espera de las interacciones atendidas.", en: "Average wait time of answered interactions." },
    example: { es: "14", en: "14" },
    origin: {},
  },
  {
    key: "actualAht", roles: ["intervals"], required: false, type: "number",
    header: { es: "TMO (seg)", en: "AHT (sec)" }, aliases: ["aht", "tmo", "actualaht", "tiempo medio de operacion"], unit: { es: "segundos", en: "seconds" },
    description: { es: "Tiempo medio de manejo (conversación + espera + trabajo posterior).", en: "Average handle time (talk + hold + wrap-up)." },
    example: { es: "310", en: "310" },
    origin: {},
  },
  {
    key: "scheduledStaff", roles: ["schedule"], required: false, type: "number",
    header: { es: "Personal programado", en: "Scheduled staff" }, aliases: ["scheduled staff", "scheduledstaff", "programados", "agentes programados"], unit: { es: "personas", en: "people" },
    description: { es: "Agentes programados en el intervalo, según la exportación de horarios.", en: "Agents scheduled in the interval, from the schedule export." },
    example: { es: "22", en: "22" },
    origin: { verint: "Start and end times / Activity assignments" },
  },
  {
    key: "requiredStaff", roles: ["schedule"], required: false, type: "number",
    header: { es: "Personal necesario", en: "Required staff" }, aliases: ["required staff", "requiredstaff", "necesarios", "agentes necesarios"], unit: { es: "personas", en: "people" },
    description: { es: "Agentes necesarios para cumplir la meta del intervalo (del plan o forecast).", en: "Agents needed to meet the interval target (from the plan or forecast)." },
    example: { es: "20", en: "20" },
    origin: {},
  },
  {
    key: "actualStaff", roles: ["attendance"], required: false, type: "number",
    header: { es: "Personal presente", en: "Actual staff" }, aliases: ["actual staff", "actualstaff", "presentes", "agentes presentes", "logged in"], unit: { es: "personas", en: "people" },
    description: { es: "Agentes conectados y en cola durante el intervalo.", en: "Agents logged in and on queue during the interval." },
    example: { es: "21", en: "21" },
    origin: { verint: "Adherence / time record" },
  },
];

/** Sheet names per role and language. Reading accepts both languages. */
export const TEMPLATE_SHEET_NAMES: Record<TemplateLang, Record<TemplateRole, string>> = {
  es: { intervals: "Intervalos", schedule: "Horarios", attendance: "Asistencia" },
  en: { intervals: "Intervals", schedule: "Schedule", attendance: "Attendance" },
};

export const TEMPLATE_SHEET_ALIASES: Record<TemplateRole, string[]> = {
  intervals: ["intervalos", "intervals"],
  schedule: ["horarios", "schedule"],
  attendance: ["asistencia", "attendance"],
};

export const TEMPLATE_SOURCE_LABEL: Record<TemplateSource, Record<TemplateLang, string>> = {
  salesforce: { es: "Salesforce", en: "Salesforce" },
  five9: { es: "Five9", en: "Five9" },
  verint: { es: "Verint", en: "Verint" },
  other: { es: "Otra fuente", en: "Other source" },
};

export const TEMPLATE_TYPE_LABEL: Record<TemplateLang, Record<TemplateColumnType, string>> = {
  es: { date: "fecha", time: "hora HH:MM", text: "texto", number: "número", percent: "porcentaje 0–100" },
  en: { date: "date", time: "time HH:MM", text: "text", number: "number", percent: "percent 0–100" },
};

/** Per-source guidance shown in the Instructions sheet. */
export const TEMPLATE_SOURCE_NOTES: Record<TemplateSource, Record<TemplateLang, string>> = {
  salesforce: {
    es: "Salesforce: los nombres de campo cambian según cada organización. Usa la columna Origen del Diccionario solo como referencia y confirma el mapeo con el cliente antes de cargar.",
    en: "Salesforce: field names change from one organization to another. Use the Origin column in the Dictionary only as a reference and confirm the mapping with the client before loading.",
  },
  five9: {
    es: "Five9: los reportes por cola y hora alimentan la hoja Intervalos. La columna Origen del Diccionario indica el campo del reporte de Five9 para cada dato.",
    en: "Five9: skill-by-hour reports feed the Intervals sheet. The Origin column in the Dictionary shows the Five9 report field for each value.",
  },
  verint: {
    es: "Verint WFM: Horarios se obtiene de la exportación de horarios (inicio, fin y actividades) convertida a personal por intervalo. Asistencia sale del reporte de adherencia o del registro de tiempo.",
    en: "Verint WFM: Schedule comes from the schedule export (start, end and activities) converted to staff per interval. Attendance comes from the adherence report or the time record.",
  },
  other: {
    es: "Otra fuente: copia los datos de tu reporte a cada hoja. No hace falta usar los nombres de campo de ningún sistema específico.",
    en: "Other source: copy the data from your report into each sheet. You do not need the field names of any specific system.",
  },
};

export const TEMPLATE_STEPS: Record<TemplateLang, string[]> = {
  es: [
    "1. Llena la hoja Intervalos: una fila por intervalo, cola y canal.",
    "2. Llena Horarios y Asistencia con la misma fecha, intervalo, cola y canal que en Intervalos.",
    "3. No cambies los nombres de las hojas ni de los encabezados. Puedes ordenar las columnas.",
    "4. Fechas: AAAA-MM-DD o celda de fecha. Horas: HH:MM con intervalos de 15 minutos.",
    "5. Porcentajes de 0 a 100. Tiempos (ASA, TMO, umbral) en segundos.",
    "6. Si una hoja no tiene datos, déjala solo con encabezados: esos campos quedan vacíos.",
    "7. Guarda como .xlsx y súbelo en Importar datos. Las columnas se reconocen automáticamente.",
  ],
  en: [
    "1. Fill the Intervals sheet: one row per interval, queue and channel.",
    "2. Fill Schedule and Attendance with the same date, interval, queue and channel as in Intervals.",
    "3. Do not rename the sheets or the headers. You can reorder the columns.",
    "4. Dates: YYYY-MM-DD or a date cell. Times: HH:MM with 15-minute intervals.",
    "5. Percentages from 0 to 100. Times (ASA, AHT, threshold) in seconds.",
    "6. If a sheet has no data, leave it with headers only: those fields stay empty.",
    "7. Save as .xlsx and upload it in Import data. Columns are recognized automatically.",
  ],
};

const stripAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Normalize a header for comparison: no accents, no parenthesized units, lowercase. */
export const normalizeTemplateHeader = (h: unknown): string =>
  stripAccents(String(h ?? ""))
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const HEADER_INDEX: Map<string, TemplateKey> = (() => {
  const m = new Map<string, TemplateKey>();
  for (const c of TEMPLATE_COLUMNS) {
    const names = [c.header.es, c.header.en, c.key, ...c.aliases];
    for (const n of names) {
      const k = normalizeTemplateHeader(n);
      if (k && !m.has(k)) m.set(k, c.key);
    }
  }
  return m;
})();

/** Resolve a file header to a template field, or null if unknown. */
export const resolveTemplateHeader = (h: unknown): TemplateKey | null =>
  HEADER_INDEX.get(normalizeTemplateHeader(h)) ?? null;

export const getTemplateColumn = (key: TemplateKey): TemplateColumn => {
  const c = TEMPLATE_COLUMNS.find((x) => x.key === key);
  if (!c) throw new Error(`Unknown template key ${key}`);
  return c;
};

/** Columns that a given role's sheet should contain, in template order. */
export const columnsForRole = (role: TemplateRole): TemplateColumn[] =>
  TEMPLATE_COLUMNS.filter((c) => c.roles.includes(role));

// ----------------------------------------------------------------------------
// Value normalization
// ----------------------------------------------------------------------------

const EXCEL_EPOCH_DAYS = 25569; // 1970-01-01 in Excel serial days

/** Local-midnight Date from a date-ish cell value, or null. */
export const toTemplateDate = (raw: unknown): Date | null => {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : new Date(raw.getFullYear(), raw.getMonth(), raw.getDate());
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 1) return null;
    const utc = new Date((Math.floor(raw) - EXCEL_EPOCH_DAYS) * 86400000);
    return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
  }
  const s = String(raw).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return validDate(+m[1]!, +m[2]! - 1, +m[3]!);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})$/);
  if (m) {
    const y = m[3]!.length === 2 ? 2000 + +m[3]! : +m[3]!;
    return validDate(y, +m[2]! - 1, +m[1]!);
  }
  return null;
};

const validDate = (y: number, mo: number, d: number): Date | null => {
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
};

/** "HH:MM" from a time-ish cell value (Excel time fraction, Date or text), or null. */
export const toTemplateTime = (raw: unknown): string | null => {
  if (raw == null || raw === "") return null;
  let minutes: number | null = null;
  if (raw instanceof Date) {
    minutes = raw.getHours() * 60 + raw.getMinutes();
  } else if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 0) return null;
    const frac = raw >= 1 ? raw - Math.floor(raw) : raw;
    minutes = Math.round(frac * 1440) % 1440;
  } else {
    const m = String(raw).match(/(\d{1,2}):(\d{2})/);
    if (m && +m[1]! <= 23 && +m[2]! <= 59) minutes = +m[1]! * 60 + +m[2]!;
  }
  if (minutes == null || minutes < 0 || minutes >= 1440) return null;
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

const toText = (raw: unknown): string => (raw == null ? "" : String(raw).trim());

const VALUE_KEYS: TemplateKey[] = [
  "offered", "answered", "abandoned", "serviceLevel", "serviceLevelThreshold",
  "asa", "actualAht", "scheduledStaff", "requiredStaff", "actualStaff",
];

// ----------------------------------------------------------------------------
// Merge
// ----------------------------------------------------------------------------

export type TemplateSheetRows = Partial<Record<TemplateRole, Array<Record<string, unknown>>>>;

export interface TemplateMergeResult {
  /** Canonical field keys present in the merged rows, in template order. */
  headers: TemplateKey[];
  rows: Array<Record<string, unknown>>;
  /** Rows dropped because date, interval or queue could not be read. */
  skipped: number;
  /** Rows that repeated a key already seen in the same sheet (last value wins). */
  duplicates: number;
  /** Roles that were provided. */
  sheetsUsed: TemplateRole[];
  /** Headers that matched no template field, per role. */
  unknownHeaders: Partial<Record<TemplateRole, string[]>>;
}

/**
 * Join the three template sheets on date + interval + queue + channel.
 * Keys present in only one sheet still produce a row (outer join).
 * Output rows use canonical field keys, so they can go straight into finalizeParse.
 */
export const mergeTemplateSheets = (sheets: TemplateSheetRows): TemplateMergeResult => {
  const merged = new Map<string, Record<string, unknown>>();
  const seen = new Map<string, Set<string>>();
  const unknownHeaders: Partial<Record<TemplateRole, string[]>> = {};
  let skipped = 0;
  let duplicates = 0;
  const sheetsUsed = TEMPLATE_ROLES.filter((r) => sheets[r] !== undefined);

  for (const role of TEMPLATE_ROLES) {
    const rows = sheets[role];
    if (!rows) continue;
    const headerMap = new Map<string, TemplateKey | null>();
    for (const row of rows) {
      for (const h of Object.keys(row)) {
        if (!headerMap.has(h)) headerMap.set(h, resolveTemplateHeader(h));
      }
    }
    unknownHeaders[role] = [...headerMap.entries()].filter(([, k]) => k == null).map(([h]) => h);

    for (const row of rows) {
      const rec: Record<string, unknown> = {};
      for (const [h, key] of headerMap) {
        if (key == null) continue;
        const v = row[h];
        if (v == null || v === "") continue;
        rec[key] = v;
      }
      const date = toTemplateDate(rec.date);
      const label = toTemplateTime(rec.intervalLabel);
      const queue = toText(rec.queue);
      const channel = toText(rec.channel);
      if (!date && !label && !queue) continue; // blank line
      if (!date || !label || !queue) {
        skipped++;
        continue;
      }
      const id = `${date.getTime()}|${label}|${queue.toLowerCase()}|${channel.toLowerCase()}`;
      const roleSeen = seen.get(role) ?? new Set<string>();
      if (roleSeen.has(id)) duplicates++;
      roleSeen.add(id);
      seen.set(role, roleSeen);

      const target = merged.get(id) ?? { date, intervalLabel: label, queue, channel };
      for (const k of VALUE_KEYS) {
        if (rec[k] !== undefined) target[k] = rec[k];
      }
      merged.set(id, target);
    }
  }

  const present = new Set<TemplateKey>(["date", "intervalLabel", "queue", "channel"]);
  const rows = [...merged.values()];
  for (const r of rows) for (const k of VALUE_KEYS) if (r[k] !== undefined) present.add(k);
  const headers = [
    "date", "intervalLabel", "queue", "channel",
    ...VALUE_KEYS,
  ].filter((k): k is TemplateKey => present.has(k as TemplateKey)) as TemplateKey[];

  return { headers, rows, skipped, duplicates, sheetsUsed, unknownHeaders };
};
