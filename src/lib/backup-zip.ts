// Portable backup of the workspace kept in this browser.
// A ZIP written without compression (STORE) and read back here. No dependencies.
// Contents: manifest.json, README.txt, data/intervals.json, data/profiles.json, data/studio-reports.json.
import type { IntervalRecord } from "@/lib/types";
import type { ImportProfile } from "@/lib/import-profiles";
import { APP_VERSION } from "@/lib/config";

export const BACKUP_FORMAT = "wfm-rescue-workspace-backup";
export const BACKUP_FORMAT_VERSION = 1;

export interface WorkspaceBackup {
  datasetName: string;
  intervals: IntervalRecord[];
  profiles: ImportProfile[];
  studioState: unknown | null;
  exportedAt: string;
}

export type BackupErrorCode = "incomplete" | "compressed" | "not_backup" | "version" | "missing" | "invalid_json" | "invalid_data";

/** Errors carry a code; the interface maps each code to its own language. */
export class BackupError extends Error {
  constructor(public readonly code: BackupErrorCode) {
    super(code);
    this.name = "BackupError";
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export const crc32 = (bytes: Uint8Array): number => {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const u16 = (n: number) => new Uint8Array([n & 255, (n >>> 8) & 255]);
const u32 = (n: number) => new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
};

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

export const makeZip = (entries: ZipEntry[]): Uint8Array => {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;
    const local = concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(size), u32(size), u16(name.length), u16(0), name, entry.data,
    ]);
    centrals.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(size), u32(size), u16(name.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(offset), name,
    ]));
    locals.push(local);
    offset += local.length;
  }
  const central = concat(centrals);
  const end = concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(central.length), u32(offset), u16(0),
  ]);
  return concat([...locals, central, end]);
};

/** Reads STORE entries written by makeZip (and any other uncompressed ZIP). */
export const readZip = (bytes: Uint8Array): Map<string, Uint8Array> => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = new Map<string, Uint8Array>();
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const method = view.getUint16(offset + 8, true);
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + size;
    if (dataEnd > bytes.length) throw new BackupError("incomplete");
    if (method !== 0) throw new BackupError("compressed");
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    entries.set(name, bytes.slice(dataStart, dataEnd));
    offset = dataEnd;
  }
  return entries;
};

const README = [
  "WFM Rescue — respaldo del espacio de trabajo / workspace backup",
  "",
  "ES: Este ZIP se generó en tu navegador. No se sube a ningún servidor ni tiene contraseña.",
  "    Guárdalo en un lugar seguro. Para restaurarlo, usa Ajustes > Respaldo.",
  "EN: This ZIP was generated in your browser. It is not uploaded anywhere and is not password-protected.",
  "    Store it securely. To restore it, use Settings > Backup.",
  "",
  "data/intervals.json        Intervalos cargados (fechas en ISO 8601).",
  "data/profiles.json         Perfiles de importación (solo mapeos).",
  "data/studio-reports.json   Reportes de Report Studio.",
].join("\n");

const jsonBytes = (value: unknown) => encoder.encode(JSON.stringify(value, null, 2));

export const buildBackupZip = (backup: WorkspaceBackup): Uint8Array =>
  makeZip([
    {
      name: "manifest.json",
      data: jsonBytes({
        format: BACKUP_FORMAT,
        formatVersion: BACKUP_FORMAT_VERSION,
        product: "WFM Rescue",
        appVersion: APP_VERSION,
        exportedAt: backup.exportedAt,
        datasetName: backup.datasetName,
        counts: {
          intervals: backup.intervals.length,
          profiles: backup.profiles.length,
          studioReports: Array.isArray((backup.studioState as { state?: { reports?: unknown[] } } | null)?.state?.reports)
            ? ((backup.studioState as { state: { reports: unknown[] } }).state.reports.length)
            : 0,
        },
      }),
    },
    { name: "README.txt", data: encoder.encode(README) },
    { name: "data/intervals.json", data: jsonBytes(backup.intervals) },
    { name: "data/profiles.json", data: jsonBytes(backup.profiles) },
    { name: "data/studio-reports.json", data: jsonBytes(backup.studioState) },
  ]);

const DATE_FIELDS = ["intervalStart", "intervalEnd"] as const;

/** JSON turns Dates into strings; put them back on the interval fields. */
export const reviveIntervals = (rows: unknown[]): IntervalRecord[] =>
  rows.map((raw) => {
    const row = { ...(raw as Record<string, unknown>) };
    for (const f of DATE_FIELDS) {
      if (typeof row[f] === "string") row[f] = new Date(row[f] as string);
    }
    return row as unknown as IntervalRecord;
  });

const readJson = (entries: Map<string, Uint8Array>, name: string): unknown => {
  const raw = entries.get(name);
  if (!raw) throw new BackupError("missing");
  try {
    return JSON.parse(decoder.decode(raw));
  } catch {
    throw new BackupError("invalid_json");
  }
};

export const readBackupZip = (bytes: Uint8Array): WorkspaceBackup => {
  const entries = readZip(bytes);
  if (!entries.has("manifest.json")) throw new BackupError("not_backup");
  const manifest = readJson(entries, "manifest.json") as {
    format?: string; formatVersion?: number; datasetName?: string; exportedAt?: string;
  };
  if (manifest.format !== BACKUP_FORMAT) throw new BackupError("not_backup");
  if (manifest.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new BackupError("version");
  }
  const intervals = readJson(entries, "data/intervals.json");
  const profiles = readJson(entries, "data/profiles.json");
  if (!Array.isArray(intervals) || !Array.isArray(profiles)) throw new BackupError("invalid_data");
  return {
    datasetName: manifest.datasetName ?? "",
    intervals: reviveIntervals(intervals),
    profiles: profiles as ImportProfile[],
    studioState: readJson(entries, "data/studio-reports.json"),
    exportedAt: manifest.exportedAt ?? "",
  };
};
