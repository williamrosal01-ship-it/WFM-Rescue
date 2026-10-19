// ============================================================================
// XLSX side of the source templates: builds the downloadable workbook and
// reads an uploaded multi-sheet workbook back into canonical rows.
// Uses SheetJS; the column logic lives in template-core.ts.
// ============================================================================
import * as XLSX from "xlsx";
import {
  TEMPLATE_COLUMNS,
  TEMPLATE_ROLES,
  TEMPLATE_SHEET_ALIASES,
  TEMPLATE_SHEET_NAMES,
  TEMPLATE_SOURCE_LABEL,
  TEMPLATE_SOURCE_NOTES,
  TEMPLATE_STEPS,
  TEMPLATE_TYPE_LABEL,
  columnsForRole,
  mergeTemplateSheets,
  type TemplateLang,
  type TemplateMergeResult,
  type TemplateRole,
  type TemplateSheetRows,
  type TemplateSource,
} from "./template-core";

const T = (lang: TemplateLang, es: string, en: string) => (lang === "es" ? es : en);

/** Role of a sheet by its name (either language), or null. */
export const detectTemplateRole = (sheetName: string): TemplateRole | null => {
  const n = sheetName.trim().toLowerCase();
  for (const role of TEMPLATE_ROLES) {
    if (TEMPLATE_SHEET_ALIASES[role].includes(n)) return role;
  }
  return null;
};

export const templateFileName = (source: TemplateSource, lang: TemplateLang): string =>
  `wfm-rescue-plantilla-${source}-${lang}.xlsx`;

/** Build the template workbook for one source and one language. */
export const buildTemplateWorkbook = (source: TemplateSource, lang: TemplateLang): XLSX.WorkBook => {
  const wb = XLSX.utils.book_new();
  const names = TEMPLATE_SHEET_NAMES[lang];
  const sourceLabel = TEMPLATE_SOURCE_LABEL[source][lang];

  const instructions: string[][] = [
    [T(lang, "Plantilla de datos de WFM Rescue", "WFM Rescue data template")],
    [T(lang, `Origen: ${sourceLabel}`, `Source: ${sourceLabel}`)],
    [],
    [TEMPLATE_SOURCE_NOTES[source][lang]],
    [],
    [T(lang, "Pasos", "Steps")],
    ...TEMPLATE_STEPS[lang].map((s) => [s]),
    [],
    [T(lang, "Hojas", "Sheets")],
    [names.intervals, T(lang, "Volúmenes, nivel de servicio, ASA y TMO por intervalo.", "Volumes, service level, ASA and AHT per interval.")],
    [names.schedule, T(lang, "Personal programado y necesario por intervalo.", "Scheduled and required staff per interval.")],
    [names.attendance, T(lang, "Personal presente por intervalo (asistencia real).", "Actual staff per interval (real attendance).")],
    [T(lang, "Diccionario", "Dictionary"), T(lang, "Descripción de cada columna, tipo, unidad y origen en la fuente.", "Description of each column, type, unit and source field.")],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instructions), T(lang, "Instrucciones", "Instructions"));

  for (const role of TEMPLATE_ROLES) {
    const cols = columnsForRole(role);
    const ws = XLSX.utils.aoa_to_sheet([cols.map((c) => c.header[lang])]);
    ws["!cols"] = cols.map((c) => ({ wch: Math.max(12, c.header[lang].length + 4) }));
    XLSX.utils.book_append_sheet(wb, ws, names[role]);
  }

  const dictHeader: string[] =
    lang === "es"
      ? ["Hoja", "Columna", "Obligatoria", "Tipo", "Unidad", "Descripción", "Ejemplo", "Origen en la fuente"]
      : ["Sheet", "Column", "Required", "Type", "Unit", "Description", "Example", "Origin in source"];
  const dict: string[][] = [dictHeader];
  for (const role of TEMPLATE_ROLES) {
    for (const c of columnsForRole(role)) {
      dict.push([
        names[role],
        c.header[lang],
        c.required ? T(lang, "Sí", "Yes") : T(lang, "No", "No"),
        TEMPLATE_TYPE_LABEL[lang][c.type],
        c.unit[lang] || "—",
        c.description[lang],
        c.example[lang],
        c.origin[source] ?? "—",
      ]);
    }
  }
  const dws = XLSX.utils.aoa_to_sheet(dict);
  dws["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 70 }, { wch: 12 }, { wch: 34 }];
  XLSX.utils.book_append_sheet(wb, dws, T(lang, "Diccionario", "Dictionary"));
  return wb;
};

/** Bytes of the template workbook, ready for a Blob download. */
export const templateWorkbookBytes = (source: TemplateSource, lang: TemplateLang): ArrayBuffer => {
  const out = XLSX.write(buildTemplateWorkbook(source, lang), { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return out;
};

export interface TemplateWorkbookRead extends TemplateMergeResult {
  sheetNames: Partial<Record<TemplateRole, string>>;
}

/**
 * Read a workbook that uses the template sheet names.
 * Returns null when no template sheet is present (the caller falls back to the first sheet).
 * Throws "TEMPLATE_NO_INTERVALS" when template sheets exist but the Intervals sheet does not.
 */
export const readTemplateWorkbook = (wb: XLSX.WorkBook): TemplateWorkbookRead | null => {
  const found: Partial<Record<TemplateRole, string>> = {};
  for (const name of wb.SheetNames) {
    const role = detectTemplateRole(name);
    if (role && !found[role]) found[role] = name;
  }
  if (Object.keys(found).length === 0) return null;
  if (!found.intervals) throw new Error("TEMPLATE_NO_INTERVALS");

  const sheets: TemplateSheetRows = {};
  for (const role of TEMPLATE_ROLES) {
    const name = found[role];
    if (!name) continue;
    // raw: true keeps Excel dates and times as numbers, which avoids locale-dependent text.
    sheets[role] = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[name]!, { defval: null, raw: true });
  }
  return { ...mergeTemplateSheets(sheets), sheetNames: found };
};

/** Number of template columns, for tests and the UI summary. */
export const TEMPLATE_COLUMN_COUNT = TEMPLATE_COLUMNS.length;
