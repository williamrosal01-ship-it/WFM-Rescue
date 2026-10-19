// Workspace backup ZIP. Run: ./node_modules/.bin/tsx --test qa/unit/backup-zip.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { crc32, makeZip, readZip, buildBackupZip, readBackupZip, reviveIntervals, BackupError } from "../../src/lib/backup-zip";
import type { IntervalRecord } from "../../src/lib/types";

const sample = (): IntervalRecord[] => [
  {
    id: "r1",
    intervalStart: new Date(2026, 9, 5, 8, 0),
    intervalEnd: new Date(2026, 9, 5, 8, 15),
    date: "2026-10-05",
    intervalLabel: "08:00",
    queue: "Ventas, Norte \"A\"",
    offered: 1234.5,
  } as unknown as IntervalRecord,
];

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("zip round-trip keeps every entry byte for byte", () => {
  const zip = makeZip([
    { name: "a.txt", data: new TextEncoder().encode("hola") },
    { name: "dir/b.json", data: new TextEncoder().encode("{\"x\":1}") },
  ]);
  const entries = readZip(zip);
  assert.deepEqual([...entries.keys()].sort(), ["a.txt", "dir/b.json"]);
  assert.equal(new TextDecoder().decode(entries.get("a.txt")!), "hola");
  assert.equal(new TextDecoder().decode(entries.get("dir/b.json")!), "{\"x\":1}");
});

test("backup round-trip restores intervals with Date objects, profiles and reports", () => {
  const bytes = buildBackupZip({
    datasetName: "ventas.xlsx",
    intervals: sample(),
    profiles: [{ id: "p1", name: "Five9", sourceType: "actual", dataLanguage: "es", mappings: [{ fileColumn: "Cola", canonicalField: "queue" }], createdAt: "2026-10-18T00:00:00.000Z" }],
    studioState: { state: { reports: [{ id: "rep1", name: "Mi informe" }] }, version: 0 },
    exportedAt: "2026-10-18T10:00:00.000Z",
  });
  const back = readBackupZip(bytes);
  assert.equal(back.datasetName, "ventas.xlsx");
  assert.equal(back.intervals.length, 1);
  assert.ok(back.intervals[0]!.intervalStart instanceof Date, "intervalStart is a Date again");
  assert.equal(back.intervals[0]!.intervalStart.getTime(), new Date(2026, 9, 5, 8, 0).getTime());
  assert.equal(back.intervals[0]!.queue, "Ventas, Norte \"A\"");
  assert.equal(back.intervals[0]!.offered, 1234.5);
  assert.equal(back.profiles[0]!.name, "Five9");
  assert.equal((back.studioState as { state: { reports: { name: string }[] } }).state.reports[0]!.name, "Mi informe");
});

test("rejects a ZIP that is not a WFM Rescue backup", () => {
  const other = makeZip([{ name: "manifest.json", data: new TextEncoder().encode("{\"product\":\"Otro\"}") }]);
  assert.throws(() => readBackupZip(other), (e: unknown) => e instanceof BackupError && e.code === "not_backup");
});

test("rejects a file cut inside an entry's data", () => {
  const bytes = makeZip([{ name: "data/intervals.json", data: new TextEncoder().encode("x".repeat(100)) }]);
  assert.throws(() => readZip(bytes.slice(0, 60)), (e: unknown) => e instanceof BackupError && e.code === "incomplete");
});

test("revive keeps non-date fields unchanged", () => {
  const [row] = reviveIntervals([{ intervalStart: "2026-10-05T08:00:00.000Z", intervalEnd: "2026-10-05T08:15:00.000Z", offered: 3 }]);
  assert.equal(row!.offered, 3);
  assert.ok(row!.intervalEnd instanceof Date);
});

test("a ZIP without manifest is reported as not a backup", () => {
  const other = makeZip([{ name: "xl/workbook.xml", data: new TextEncoder().encode("<x/>") }]);
  assert.throws(() => readBackupZip(other), (e: unknown) => e instanceof BackupError && e.code === "not_backup");
});
