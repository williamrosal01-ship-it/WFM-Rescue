"use client";
import { create } from "zustand";
import type {
  ColumnMapping,
  DataHealthReport,
  DataSourceType,
  DiagnosticFinding,
  GlobalFilters,
  IntervalRecord,
  AgentIntervalRecord,
  Theme,
} from "./types";
import { consolidateRows } from "./data-health";
import { buildDemoData } from "./demo-data";
import { saveDataset as saveLocalDataset, clearDataset as clearLocalDataset } from "./local-data";

export type DatasetStage = "idle" | "parsing" | "mapping" | "analyzing" | "ready" | "error";

export interface ImportSession {
  filename: string;
  sourceType?: DataSourceType;
  headers: string[];
  rawRows: Record<string, unknown>[];
  mappings: ColumnMapping[];
  profileId?: string;
  profileName?: string;
}

interface WfmState {
  // Session (simple cookie auth — MVP; replace with real auth later)
  orgId: string;
  orgName: string;
  userEmail: string;
  userName: string;
  userRole: "viewer" | "analyst" | "manager" | "admin";
  theme: Theme;
  sidebarOpen: boolean;
  // Data
  intervals: IntervalRecord[];
  agentIntervals: AgentIntervalRecord[];
  datasetName: string;
  datasetIsDemo: boolean;
  datasetStage: DatasetStage;
  dataHealth: DataHealthReport | null;
  diagnostics: DiagnosticFinding[];
  filters: GlobalFilters;
  import: ImportSession | null;
  // actions
  setTheme: (t: Theme) => void;
  toggleSidebar: () => void;
  setFilters: (f: Partial<GlobalFilters>) => void;
  loadDemoData: () => void;
  startImport: (filename: string, headers: string[], rawRows: Record<string, unknown>[], suggestedMappings: ColumnMapping[], detectedType?: DataSourceType) => void;
  setImportMapping: (fileColumn: string, canonicalField: string | null) => void;
  setImportSourceType: (t: DataSourceType) => void;
  applyImportMappings: (records: IntervalRecord[]) => void;
  cancelImport: () => void;
  clearDataset: () => void;
  setDiagnostics: (f: DiagnosticFinding[]) => void;
  setDataHealth: (r: DataHealthReport) => void;
}

const defaultFilters: GlobalFilters = {
  queues: [],
  skills: [],
  channels: [],
  sites: [],
  teams: [],
  intervalGranularity: 15,
};

export const useWfmStore = create<WfmState>((set, get) => ({
  orgId: "demo-org-0001",
  orgName: "WFM Rescue Demo",
  userEmail: "demo@wfmrescue.app",
  userName: "Alex Manager",
  userRole: "manager",
  theme: "light",
  sidebarOpen: true,
  intervals: [],
  agentIntervals: [],
  datasetName: "",
  datasetIsDemo: false,
  datasetStage: "idle",
  dataHealth: null,
  diagnostics: [],
  filters: defaultFilters,
  import: null,
  setTheme: (t) => set({ theme: t }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  loadDemoData: () => {
    void clearLocalDataset();
    const demo = buildDemoData();
    set({
      intervals: demo.intervals,
      agentIntervals: demo.agentIntervals,
      datasetName: "Demo Contact Center — 4 queues, 15-min, 2 sites",
      datasetIsDemo: true,
      datasetStage: "ready",
      dataHealth: null,
      diagnostics: [],
      filters: defaultFilters,
    });
  },
  startImport: (filename, headers, rawRows, suggestedMappings, detectedType) =>
    set({
      import: {
        filename,
        sourceType: detectedType,
        headers,
        rawRows,
        mappings: suggestedMappings,
      },
      datasetStage: "mapping",
    }),
  setImportMapping: (fileColumn, canonicalField) =>
    set((s) => {
      if (!s.import) return {};
      return {
        import: {
          ...s.import,
          mappings: s.import.mappings.map((m) =>
            m.fileColumn === fileColumn ? { ...m, canonicalField } : m,
          ),
        },
      };
    }),
  setImportSourceType: (t) =>
    set((s) => (s.import ? { import: { ...s.import, sourceType: t } } : {})),
  applyImportMappings: (records) => {
    // The caller already merged the new rows with the current data (see import page).
    const merged = records;
    const name = get().import?.filename ?? "Imported data";
    void saveLocalDataset(name, merged).catch(() => undefined);
    set({
      intervals: merged,
      datasetName: name,
      datasetIsDemo: false,
      datasetStage: "ready",
      import: null,
      dataHealth: null,
      diagnostics: [],
      filters: defaultFilters,
    });
  },
  cancelImport: () =>
    set((s) => ({
      import: null,
      datasetStage: s.intervals.length > 0 ? "ready" : "idle",
    })),
  clearDataset: () => {
    void clearLocalDataset();
    set({
      intervals: [],
      agentIntervals: [],
      datasetName: "",
      datasetIsDemo: false,
      datasetStage: "idle",
      dataHealth: null,
      diagnostics: [],
      filters: defaultFilters,
      import: null,
    });
  },
  setDiagnostics: (f) => set({ diagnostics: f }),
  setDataHealth: (r) => set({ dataHealth: r }),
}));

// Derived selectors
export const selectFilteredIntervals = (
  intervals: IntervalRecord[],
  filters: GlobalFilters,
): IntervalRecord[] => {
  return intervals.filter((r) => {
    if (filters.queues.length > 0 && r.queue && !filters.queues.includes(r.queue)) return false;
    if (filters.channels.length > 0 && r.channel && !filters.channels.includes(r.channel)) return false;
    if (filters.sites.length > 0 && r.site && !filters.sites.includes(r.site)) return false;
    if (filters.skills.length > 0 && r.skill && !filters.skills.includes(r.skill)) return false;
    return true;
  });
};

export const selectDistinctOptions = (intervals: IntervalRecord[]) => {
  const uniq = (key: keyof IntervalRecord) =>
    Array.from(
      new Set(
        intervals
          .map((r) => r[key])
          .filter((v): v is string => typeof v === "string" && v.length > 0),
      ),
    ).sort();
  return {
    queues: uniq("queue"),
    channels: uniq("channel"),
    sites: uniq("site"),
    skills: uniq("skill"),
  };
};
