// Import profiles: a saved column mapping, reused for the next file from the same source.
// Stored in the browser (localStorage). Only mappings are saved, never data rows.
import type { ColumnMapping, DataSourceType } from "@/lib/types";
import type { DataLanguage } from "@/lib/parsers";

export interface ImportProfile {
  id: string;
  name: string;
  sourceType: DataSourceType | null;
  dataLanguage: DataLanguage;
  mappings: Array<{ fileColumn: string; canonicalField: string | null }>;
  createdAt: string;
}

export const PROFILES_KEY = "wfm-import-profiles";

const isProfile = (x: unknown): x is ImportProfile => {
  if (!x || typeof x !== "object") return false;
  const p = x as ImportProfile;
  return typeof p.id === "string" && typeof p.name === "string" && Array.isArray(p.mappings);
};

export const loadProfiles = (): ImportProfile[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROFILES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isProfile) : [];
  } catch {
    return [];
  }
};

const writeProfiles = (list: ImportProfile[]) => {
  window.localStorage.setItem(PROFILES_KEY, JSON.stringify(list));
};

export const saveProfile = (input: {
  name: string;
  sourceType: DataSourceType | null;
  dataLanguage: DataLanguage;
  mappings: ColumnMapping[];
}): ImportProfile => {
  const profile: ImportProfile = {
    id: `prof-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim(),
    sourceType: input.sourceType,
    dataLanguage: input.dataLanguage,
    mappings: input.mappings.map((m) => ({ fileColumn: m.fileColumn, canonicalField: m.canonicalField })),
    createdAt: new Date().toISOString(),
  };
  writeProfiles([...loadProfiles(), profile]);
  return profile;
};

export const deleteProfile = (id: string) => {
  writeProfiles(loadProfiles().filter((p) => p.id !== id));
};

export const duplicateProfile = (id: string, copySuffix: string): ImportProfile | null => {
  const list = loadProfiles();
  const src = list.find((p) => p.id === id);
  if (!src) return null;
  const copy: ImportProfile = { ...src, id: `${src.id}-copy-${Date.now().toString(36)}`, name: `${src.name} (${copySuffix})`, createdAt: new Date().toISOString() };
  const i = list.indexOf(src);
  writeProfiles([...list.slice(0, i + 1), copy, ...list.slice(i + 1)]);
  return copy;
};

/** Mappings of a profile that still match the headers of the current file. */
export const mappingsForHeaders = (profile: ImportProfile, headers: string[]): ColumnMapping[] => {
  const set = new Set(headers);
  return profile.mappings.filter((m) => set.has(m.fileColumn));
};

/** Display names for the data source types (shared by import and settings). */
export const makeSourceLabels = (tx: (es: string, en: string) => string): Record<DataSourceType, string> => ({
  forecast: tx("Pronóstico", "Forecast"),
  actual: tx("Real (ACD en tiempo real)", "Actual (ACD real time)"),
  schedule: tx("Agenda", "Schedule"),
  adherence: tx("Adherencia", "Adherence"),
  agent: tx("Maestro de agentes", "Agent master"),
  aux: tx("AUX / Estados", "AUX / States"),
  shrinkage: "Shrinkage",
});
