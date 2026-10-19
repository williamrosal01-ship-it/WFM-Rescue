// ============================================================================
// WFM Rescue — Canonical Types
// Every metric and dimension is explicitly defined. Calculations are
// centralized here so UI, reports, exports and diagnostics all agree.
// ============================================================================

/** Canonical interval length in minutes. */
export type IntervalMinutes = 5 | 10 | 15 | 30 | 60;

/** Canonical data source types. */
export type DataSourceType =
  | "forecast" // Predicted volumes, AHT, staff requirements
  | "actual" // Observed interval data from ACD/CCaaS
  | "schedule" // Scheduled agent activities
  | "adherence" // Adherence/conformance events per agent
  | "agent" // Roster: agent, skill, team, site, hire date
  | "aux" // AUX / state detail
  | "shrinkage" // Shrinkage assumptions;

/** Generic row after parsing and normalizing a file. */
export type RawRow = Record<string, string | number | boolean | null | undefined>;

/** Canonical interval record — one row per interval per queue/skill. */
export interface IntervalRecord {
  id: string;
  intervalStart: Date;
  intervalEnd: Date;
  date: string; // YYYY-MM-DD (local to source)
  intervalLabel: string; // "08:00", "08:15", etc.
  queue?: string;
  skill?: string;
  channel?: string; // voice, chat, email, backoffice
  site?: string;
  // Forecast
  forecastVolume?: number;
  forecastAht?: number; // seconds
  requiredStaff?: number;
  serviceLevelTarget?: number; // e.g. 0.80 for 80/20
  serviceLevelThreshold?: number; // seconds, e.g. 20
  // Actuals
  actualVolume?: number;
  actualAht?: number; // weighted average seconds
  answered?: number;
  abandoned?: number;
  offered?: number;
  serviceLevel?: number; // 0..1 actual
  asa?: number; // seconds
  avgSpeedAnswer?: number; // alias
  handleTime?: number; // seconds total
  talkTime?: number;
  holdTime?: number;
  acwTime?: number;
  occupancy?: number; // 0..1
  // Staffing
  scheduledStaff?: number;
  actualStaff?: number;
  availableStaff?: number;
  productiveAgents?: number;
  nonProductiveAgents?: number;
  // Source provenance
  sourceType: DataSourceType;
  sourceId?: string;
}

/** Agent schedule/state record per interval. */
export interface AgentIntervalRecord {
  id: string;
  agentId: string;
  agentName: string;
  team?: string;
  site?: string;
  skills?: string[];
  intervalStart: Date;
  intervalEnd: Date;
  scheduledActivity?: string; // e.g. "Production", "Break", "Lunch", "Training", "Meeting", "Off-phone", "PTO"
  actualActivity?: string;
  isScheduledProduction?: boolean;
  isActualProduction?: boolean;
  isAdherent?: boolean;
  exceptionType?: "late" | "early_leave" | "aux_out" | "missing_punch" | null;
  auxCode?: string;
  auxDurationSec?: number;
  isPaid?: boolean;
}

/** KPI definition — used for the glossary, tooltips and formula explanations. */
export interface KpiDefinition {
  id: string;
  name: string;
  category: "volume" | "service" | "staffing" | "occupancy" | "adherence" | "attendance" | "shrinkage" | "quality";
  unit: "integer" | "seconds" | "percent" | "currency" | "ratio" | "minutes" | "hours";
  description: string;
  formula: string;
  denominator?: string;
  sourceFields: string[];
  assumptions?: string[];
  limitations?: string[];
  benchmark?: { good: number; warn: number; bad: number; direction: "min" | "max" };
}

/** Data health finding. */
export interface Bilingual {
  es: string;
  en: string;
}

export interface DataHealthIssue {
  severity: "error" | "warning" | "info";
  code: string;
  field?: string;
  message: Bilingual;
  suggestion: Bilingual;
  rowCount?: number;
  sampleRows?: number[];
}

export interface DataHealthReport {
  score: number; // 0..100
  totalRows: number;
  validRows: number;
  issues: DataHealthIssue[];
  fieldsPresent: string[];
  fieldsMissing: string[];
  dateRange: { start: Date; end: Date } | null;
  intervalCount: number;
}

/** Column mapping during import. */
export interface ColumnMapping {
  fileColumn: string;
  canonicalField: string | null;
  exampleValue?: string | number | null;
}

/** Import profile — persisted mapping per source. */
export interface ImportProfileConfig {
  id?: string;
  name: string;
  sourceSystem?: string;
  sourceType: DataSourceType;
  delimiter: string;
  mappings: ColumnMapping[];
}

/** Diagnostic finding — a specific, prioritized WFM problem. */
export interface DiagnosticFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category:
    | "staffing_gap"
    | "service_level"
    | "forecast_accuracy"
    | "adherence"
    | "occupancy"
    | "attendance"
    | "shrinkage"
    | "data_quality";
  title: string;
  description: string;
  impact: string;
  evidence: string[];
  recommendedActions: Array<{
    label: string;
    priority: "immediate" | "today" | "this_week";
    owner?: string;
  }>;
  affectedIntervals?: number;
  financialImpact?: { label: string; value?: number; note?: string };
}

/** Filters applied across the app. */
export interface GlobalFilters {
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
  queues: string[];
  skills: string[];
  channels: string[];
  sites: string[];
  teams: string[];
  intervalGranularity: IntervalMinutes;
}

export type Theme = "light" | "dark";
