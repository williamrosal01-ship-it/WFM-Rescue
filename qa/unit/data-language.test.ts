// Data language (es/en) for numbers and dates. Run: ./node_modules/.bin/tsx --test qa/unit/data-language.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { applyMappings, coerceValue, parseDateText, parseLocaleNumber } from "../../src/lib/parsers";
import type { ColumnMapping, RawRow } from "../../src/lib/types";

test("numbers: es uses 1.234,5 and 12,5; en uses 1,234.5", () => {
  assert.equal(parseLocaleNumber("1.234,5", "es"), 1234.5);
  assert.equal(parseLocaleNumber("12,5", "es"), 12.5);
  assert.equal(parseLocaleNumber("1.234", "es"), 1234, "dot + 3 digits is thousands in es");
  assert.equal(parseLocaleNumber("12.5", "es"), 12.5, "single dot with other digit count stays decimal");
  assert.equal(parseLocaleNumber("1,234.5", "en"), 1234.5);
  assert.equal(parseLocaleNumber("1,234", "en"), 1234);
  assert.equal(parseLocaleNumber("12,5", "en"), 12.5, "unambiguous decimal comma is accepted in en");
  assert.equal(parseLocaleNumber("  $ 76,579 ", "en"), 76579);
  assert.equal(parseLocaleNumber("abc", "es"), null);
});

test("percent: es 82,5% is 0.825; en 82% is 0.82", () => {
  assert.equal(coerceValue("82,5%", "percent", "es"), 0.825);
  assert.equal(coerceValue("82%", "percent", "en"), 0.82);
  assert.equal(coerceValue(85, "percent", "es"), 0.85);
  assert.equal(coerceValue(0.8, "percent", "en"), 0.8);
});

test("dates: 05/10/2026 is 5 Oct for es and 10 May for en", () => {
  assert.deepEqual(parseDateText("05/10/2026", "es"), new Date(2026, 9, 5));
  assert.deepEqual(parseDateText("05/10/2026", "en"), new Date(2026, 4, 10));
});

test("dates: a part above 12 decides the order in either language", () => {
  assert.deepEqual(parseDateText("25/10/2026", "en"), new Date(2026, 9, 25));
  assert.deepEqual(parseDateText("10/25/2026", "es"), new Date(2026, 9, 25));
});

test("dates: time part, AM/PM and ISO", () => {
  assert.deepEqual(parseDateText("05/10/2026 08:15", "es"), new Date(2026, 9, 5, 8, 15));
  assert.deepEqual(parseDateText("05/10/2026 1:30 PM", "en"), new Date(2026, 4, 10, 13, 30));
  assert.deepEqual(parseDateText("2026-10-05 08:15", "es"), new Date(2026, 9, 5, 8, 15));
  assert.equal(parseDateText("31/02/2026", "es"), null, "impossible date");
});

test("applyMappings: the same Spanish file reads differently with the wrong language", () => {
  const rows: RawRow[] = [{ Fecha: "05/10/2026 08:15", Cola: "Ventas", Ofrecidas: "1.234,5", SL: "82,5%" }];
  const mappings: ColumnMapping[] = [
    { fileColumn: "Fecha", canonicalField: "intervalStart" },
    { fileColumn: "Cola", canonicalField: "queue" },
    { fileColumn: "Ofrecidas", canonicalField: "offered" },
    { fileColumn: "SL", canonicalField: "serviceLevel" },
  ];
  const es = applyMappings(rows, mappings, { dataLanguage: "es" })[0]!;
  assert.equal(es.offered, 1234.5);
  assert.equal(es.serviceLevel, 0.825);
  assert.equal(es.intervalStart.getMonth(), 9, "October with es");
  assert.equal(es.intervalStart.getHours(), 8);

  const en = applyMappings(rows, mappings, { dataLanguage: "en" })[0]!;
  assert.equal(en.intervalStart.getMonth(), 4, "read as May with en");
  assert.notEqual(en.offered, es.offered);
});

test("applyMappings without options keeps the previous en behaviour", () => {
  const rows: RawRow[] = [{ n: "1,234.5" }];
  const out = applyMappings(rows, [{ fileColumn: "n", canonicalField: "offered" }]);
  assert.equal(out[0]!.offered, 1234.5);
});
