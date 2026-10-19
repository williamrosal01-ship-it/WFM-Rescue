// Unit + round-trip tests for source templates (template-core / template-xlsx / parseXlsx).
// Run from the project root: ./node_modules/.bin/tsx --test qa/unit/template.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  TEMPLATE_COLUMNS,
  TEMPLATE_SOURCES,
  TEMPLATE_SHEET_NAMES,
  columnsForRole,
  mergeTemplateSheets,
  normalizeTemplateHeader,
  resolveTemplateHeader,
  toTemplateDate,
  toTemplateTime,
  type TemplateLang,
  type TemplateSource,
} from "../../src/lib/template-core";
import { buildTemplateWorkbook, readTemplateWorkbook, templateFileName } from "../../src/lib/template-xlsx";
import { applyMappings, matchCanonical, parseXlsx } from "../../src/lib/parsers";

const LANGS: TemplateLang[] = ["es", "en"];

// ---------- header resolution ----------

test("every template header (es and en) resolves to its own field", () => {
  for (const c of TEMPLATE_COLUMNS) {
    assert.equal(resolveTemplateHeader(c.header.es), c.key, `es ${c.header.es}`);
    assert.equal(resolveTemplateHeader(c.header.en), c.key, `en ${c.header.en}`);
  }
});

test("every alias resolves to its own field (no collisions)", () => {
  for (const c of TEMPLATE_COLUMNS) {
    for (const a of c.aliases) {
      assert.equal(resolveTemplateHeader(a), c.key, `alias "${a}" of ${c.key}`);
    }
  }
});

test("headers ignore accents, case and parenthesized units", () => {
  assert.equal(resolveTemplateHeader("ASA (sec)"), "asa");
  assert.equal(resolveTemplateHeader("  nivel de SERVICIO (%) "), "serviceLevel");
  assert.equal(resolveTemplateHeader("Ofrecídas"), "offered");
  assert.equal(normalizeTemplateHeader("Umbral SL (seg)"), "umbral sl");
  assert.equal(resolveTemplateHeader("Columna desconocida"), null);
});

test("every template key is recognized by the existing CSV/XLSX matcher", () => {
  for (const c of TEMPLATE_COLUMNS) {
    assert.equal(matchCanonical(c.key).canonicalField, c.key, c.key);
  }
});

test("each role has its join keys (date, interval, queue, channel)", () => {
  for (const role of ["intervals", "schedule", "attendance"] as const) {
    const keys = columnsForRole(role).map((c) => c.key);
    for (const k of ["date", "intervalLabel", "queue", "channel"] as const) assert.ok(keys.includes(k), `${role} lacks ${k}`);
  }
});

// ---------- value normalization ----------

test("dates: ISO, dd/mm/yyyy and Excel serials give local midnight", () => {
  const expect = new Date(2026, 9, 5);
  assert.equal(toTemplateDate("2026-10-05")?.getTime(), expect.getTime());
  assert.equal(toTemplateDate("05/10/2026")?.getTime(), expect.getTime());
  assert.equal(toTemplateDate("5/10/26")?.getTime(), expect.getTime());
  const serial = Date.UTC(2026, 9, 5) / 86400000 + 25569;
  assert.equal(toTemplateDate(serial)?.getTime(), expect.getTime());
  assert.equal(toTemplateDate(serial + 0.5)?.getTime(), expect.getTime(), "fraction is ignored for dates");
  assert.equal(toTemplateDate("31/02/2026"), null, "impossible date rejected");
  assert.equal(toTemplateDate("hola"), null);
});

test("times: Excel fraction, text HH:MM and datetime text", () => {
  assert.equal(toTemplateTime(0.34375), "08:15");
  assert.equal(toTemplateTime("8:15"), "08:15");
  assert.equal(toTemplateTime("2026-10-05 08:15:00"), "08:15");
  assert.equal(toTemplateTime("25:00"), null);
  assert.equal(toTemplateTime("12:60"), null);
  assert.equal(toTemplateTime(""), null);
});

// ---------- merge ----------

test("merge joins volumes and staffing and keeps unmatched rows (outer join)", () => {
  const d = "2026-10-05";
  const res = mergeTemplateSheets({
    intervals: [
      { Fecha: d, Intervalo: "08:00", Cola: "Ventas", Canal: "Voz", Ofrecidas: 120, Atendidas: 104, Abandonadas: 9, "Nivel de servicio (%)": 82, "ASA (seg)": 14, "TMO (seg)": 310 },
      { Fecha: d, Intervalo: "08:15", Cola: "Ventas", Canal: "Voz", Ofrecidas: 130 },
    ],
    schedule: [
      { Fecha: d, Intervalo: "08:00", Cola: "Ventas", Canal: "Voz", "Personal programado": 22, "Personal necesario": 20 },
      { Fecha: d, Intervalo: "08:30", Cola: "Ventas", Canal: "Voz", "Personal programado": 24 },
    ],
    attendance: [
      { Fecha: d, Intervalo: "08:00", Cola: "Ventas", Canal: "Voz", "Personal presente": 21 },
    ],
  });
  assert.equal(res.rows.length, 3);
  assert.equal(res.skipped, 0);
  assert.equal(res.duplicates, 0);
  const first = res.rows.find((r) => r.intervalLabel === "08:00")!;
  assert.equal(first.offered, 120);
  assert.equal(first.scheduledStaff, 22);
  assert.equal(first.requiredStaff, 20);
  assert.equal(first.actualStaff, 21);
  const lone = res.rows.find((r) => r.intervalLabel === "08:30")!;
  assert.equal(lone.scheduledStaff, 24);
  assert.equal(lone.offered, undefined);
  assert.ok(res.headers.includes("actualStaff") && res.headers.includes("serviceLevel"));
});

test("merge skips incomplete rows and counts duplicates within a sheet", () => {
  const res = mergeTemplateSheets({
    intervals: [
      { Fecha: "no es fecha", Intervalo: "08:00", Cola: "Ventas", Canal: "Voz", Ofrecidas: 1 },
      { Fecha: "2026-10-05", Intervalo: "08:00", Cola: "", Canal: "Voz", Ofrecidas: 1 },
      { Fecha: "2026-10-05", Intervalo: "08:00", Cola: "Ventas", Canal: "Voz", Ofrecidas: 5 },
      { Fecha: "2026-10-05", Intervalo: "08:00", Cola: "Ventas", Canal: "Voz", Ofrecidas: 7 },
      { Fecha: null, Intervalo: null, Cola: null, Canal: null, Ofrecidas: null },
    ],
  });
  assert.equal(res.skipped, 2);
  assert.equal(res.duplicates, 1);
  assert.equal(res.rows.length, 1);
  assert.equal(res.rows[0]!.offered, 7, "last value wins");
});

test("merge reports headers that match no template field", () => {
  const res = mergeTemplateSheets({
    intervals: [{ Fecha: "2026-10-05", Intervalo: "08:00", Cola: "V", Canal: "Voz", Otra: 1 }],
  });
  assert.deepEqual(res.unknownHeaders.intervals, ["Otra"]);
});

// ---------- workbook round trip ----------

const sampleRows = (source: TemplateSource, lang: TemplateLang): Array<[string, unknown[]]> => {
  void source;
  const serial = Date.UTC(2026, 9, 5) / 86400000 + 25569;
  return [
    ["intervals", [lang === "es" ? "2026-10-05" : "2026-10-05", "08:00", "Ventas", "Voz", 120, 104, 9, 82, 20, 14, 310]],
    ["intervals", [serial, 0.34375, "Ventas", "Voz", 130, 118, 6, 90, 18, 12, 300]],
    ["schedule", ["2026-10-05", "08:00", "Ventas", "Voz", 22, 20]],
    ["schedule", ["2026-10-05", "08:30", "Ventas", "Voz", 24, 21]],
    ["attendance", ["2026-10-05", "08:00", "Ventas", "Voz", 21]],
  ];
};

const fillTemplate = (wb: XLSX.WorkBook, lang: TemplateLang, rows: Array<[string, unknown[]]>) => {
  for (const [role, values] of rows) {
    const name = TEMPLATE_SHEET_NAMES[lang][role as "intervals" | "schedule" | "attendance"];
    const headerCount = columnsForRole(role as "intervals").length;
    assert.equal(values.length, headerCount, `${role} row width`);
    XLSX.utils.sheet_add_aoa(wb.Sheets[name]!, [values], { origin: -1 });
  }
  return wb;
};

for (const source of TEMPLATE_SOURCES) {
  for (const lang of LANGS) {
    test(`round trip ${source}/${lang}: workbook -> file -> parseXlsx -> records`, async () => {
      const wb = fillTemplate(buildTemplateWorkbook(source, lang), lang, sampleRows(source, lang));
      // Sheet names and structure
      const names = wb.SheetNames;
      for (const n of Object.values(TEMPLATE_SHEET_NAMES[lang])) assert.ok(names.includes(n), `missing sheet ${n}`);
      assert.ok(names.includes(lang === "es" ? "Instrucciones" : "Instructions"));
      assert.ok(names.includes(lang === "es" ? "Diccionario" : "Dictionary"));

      // Write to bytes and read back, as the browser does with a real .xlsx
      const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
      const file = { name: templateFileName(source, lang), arrayBuffer: async () => bytes } as unknown as File;
      const parsed = await parseXlsx(file);

      assert.ok(parsed.templateInfo, "template sheets detected");
      assert.equal(parsed.templateInfo!.sheets.length, 3);
      assert.equal(parsed.templateInfo!.skipped, 0);
      assert.equal(parsed.templateInfo!.unknownHeaders.length, 0);
      assert.equal(parsed.totalRows, 3);
      assert.ok(parsed.suggestedMappings.every((m) => m.canonicalField), "every merged header is mapped");

      const recs = applyMappings(parsed.rows, parsed.suggestedMappings);
      const byLabel = (label: string) => recs.find((r) => r.intervalStart && r.intervalStart.getHours() === +label.slice(0, 2) && r.intervalStart.getMinutes() === +label.slice(3));
      const r0800 = byLabel("08:00")!;
      const r0815 = byLabel("08:15")!;
      const r0830 = byLabel("08:30")!;
      assert.ok(r0800 && r0815 && r0830);
      assert.equal(r0800.intervalStart!.getDate(), 5);
      assert.equal(r0800.offered, 120);
      assert.equal(r0800.serviceLevel, 0.82, "percent 82 becomes 0.82");
      assert.equal(r0800.scheduledStaff, 22);
      assert.equal(r0800.requiredStaff, 20);
      assert.equal(r0800.actualStaff, 21);
      assert.equal(r0815.offered, 130, "Excel serial date and fraction time");
      assert.equal(r0815.scheduledStaff ?? null, null);
      assert.equal(r0830.scheduledStaff, 24);
      assert.equal(r0830.offered ?? null, null);
    });
  }
}

test("workbook without the Intervals sheet is rejected with a clear code", () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Fecha", "Intervalo", "Cola", "Canal", "Personal programado"]]), "Horarios");
  assert.throws(() => readTemplateWorkbook(wb), /TEMPLATE_NO_INTERVALS/);
});

test("ordinary workbooks keep the first-sheet behaviour and accept a sheet name", async () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Date", "Interval", "Queue", "Calls offered"], ["2026-10-05", "08:00", "Q1", 50]]), "Data");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Date", "Interval", "Queue", "Calls offered"], ["2026-10-05", "09:00", "Q2", 70]]), "Other");
  const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  const file = { name: "x.xlsx", arrayBuffer: async () => bytes } as unknown as File;
  const first = await parseXlsx(file);
  assert.equal(first.templateInfo, undefined);
  assert.deepEqual(first.sheetNames, ["Data", "Other"]);
  assert.equal(first.totalRows, 1);
  const other = await parseXlsx(file, "Other");
  assert.equal(other.rows[0]!["Queue"], "Q2");
});
