// Unit tests for src/lib/explorer.ts. Run from project root: ./node_modules/.bin/tsx --test qa/unit/explorer.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  EXPLORER_COLUMNS,
  explorerCsv,
  explorerFileBase,
  filterExplorerColumns,
  filterExplorerRows,
  formatExplorerCell,
  materializeIntervalRows,
} from "../../src/lib/explorer";
import type { IntervalRecord } from "../../src/lib/types";

const rec = (o: Partial<IntervalRecord>): IntervalRecord => ({
  id: "r", intervalStart: new Date(0), intervalEnd: new Date(0), date: "2026-10-05", intervalLabel: "08:00",
  sourceType: "actual", ...o,
});

test("cell formatting: percent 0..1 shown as %, numbers rounded, empties blank", () => {
  assert.equal(formatExplorerCell(0.825, "percent"), "82.5%");
  assert.equal(formatExplorerCell(10, "number"), "10");
  assert.equal(formatExplorerCell(1.2345, "number"), "1.23");
  assert.equal(formatExplorerCell(null, "number"), "");
  assert.equal(formatExplorerCell(undefined, "text"), "");
  assert.equal(formatExplorerCell(NaN, "number"), "");
  assert.equal(formatExplorerCell(new Date(Date.UTC(2026, 9, 5)), "date"), "2026-10-05");
});

test("materialize: one row per record, every column present, missing values blank", () => {
  const rows = materializeIntervalRows([
    rec({ queue: "Ventas", offered: 120, serviceLevel: 0.82 }),
    rec({ intervalLabel: "08:15", queue: "Soporte" }),
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]!.queue, "Ventas");
  assert.equal(rows[0]!.offered, "120");
  assert.equal(rows[0]!.serviceLevel, "82.0%");
  assert.equal(rows[1]!.offered, "");
  for (const c of EXPLORER_COLUMNS) assert.ok(c.id in rows[0]!, c.id);
});

test("search: case-insensitive over all values, limit applied, empty query returns first N", () => {
  const rows = materializeIntervalRows([
    rec({ queue: "Ventas" }), rec({ queue: "Soporte" }), rec({ queue: "ventas premium" }), rec({ queue: "Cobranzas" }),
  ]);
  assert.equal(filterExplorerRows(rows, "VENTAS", 100).length, 2);
  assert.equal(filterExplorerRows(rows, "", 2).length, 2);
  assert.equal(filterExplorerRows(rows, "zzz", 100).length, 0);
  assert.equal(filterExplorerRows(rows, "ventas", 1).length, 1);
  assert.equal(filterExplorerRows(rows, "ventas", 0).length, 0);
});

test("search can be limited to the displayed columns", () => {
  const rows = materializeIntervalRows([rec({ queue: "Ventas", channel: "Chat" })]);
  assert.equal(filterExplorerRows(rows, "chat", 10, ["queue"]).length, 0);
  assert.equal(filterExplorerRows(rows, "chat", 10, ["queue", "channel"]).length, 1);
});

test("column filter matches the label in the active language and the id", () => {
  const es = filterExplorerColumns(EXPLORER_COLUMNS, "tmo", "es").map((c) => c.id);
  const en = filterExplorerColumns(EXPLORER_COLUMNS, "aht", "en").map((c) => c.id);
  assert.deepEqual(es, ["actualAht"]);
  assert.deepEqual(en, ["actualAht"]);
  assert.equal(filterExplorerColumns(EXPLORER_COLUMNS, "personal", "es").length, 3);
  assert.equal(filterExplorerColumns(EXPLORER_COLUMNS, "", "en").length, EXPLORER_COLUMNS.length);
});

test("CSV: BOM, CRLF, localized header, quoting of commas, quotes and newlines", () => {
  const cols = EXPLORER_COLUMNS.filter((c) => ["queue", "offered"].includes(c.id));
  const rows = [{ queue: 'Ventas, "VIP"', offered: "12" }, { queue: "Línea\nnueva", offered: "" }];
  const csv = explorerCsv(cols, rows, "es");
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.equal(csv.slice(1), 'Cola,Ofrecidas\r\n"Ventas, ""VIP""",12\r\n"Línea\nnueva",');
  assert.ok(explorerCsv(cols, [], "en").startsWith("\uFEFFQueue,Calls offered"));
});

test("file base name is safe for downloads", () => {
  assert.equal(explorerFileBase("Demo Contact Center — 4 queues.xlsx"), "Demo-Contact-Center-4-queues-xlsx");
  assert.equal(explorerFileBase("///"), "dataset");
});
