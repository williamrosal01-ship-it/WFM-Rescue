// ============================================================================
// WFM Calculation Engine
// All formulas live here. They are:
//  - Documented (see KPI_DEFINITIONS)
//  - Deterministic
//  - Null-safe (missing fields -> null or sensible default)
//  - Explicit about assumptions
// ============================================================================
import type { IntervalRecord, KpiDefinition } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export const safe = <T>(fn: () => T, fallback: T | null = null): T | null => {
  try {
    const v = fn();
    return v === undefined || Number.isNaN(v) ? fallback : v;
  } catch {
    return fallback;
  }
};

export const pct = (numerator?: number, denominator?: number): number | null => {
  if (
    numerator == null ||
    denominator == null ||
    denominator === 0
  ) return null;
  return numerator / denominator;
};

export const avg = (values: Array<number | undefined | null>): number | null => {
  const clean = values.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (clean.length === 0) return null;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
};

export const sum = (values: Array<number | undefined | null>): number => {
  return values
    .filter((v): v is number => typeof v === "number" && !Number.isNaN(v))
    .reduce((a, b) => a + b, 0);
};

export const wtdAvg = (
  values: Array<number | undefined | null>,
  weights: Array<number | undefined | null>,
): number | null => {
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    const w = weights[i];
    if (typeof v === "number" && typeof w === "number" && w > 0) {
      numerator += v * w;
      denominator += w;
    }
  }
  if (denominator === 0) return null;
  return numerator / denominator;
};

// ---------------------------------------------------------------------------
// Service Level
// Typically = (calls answered within threshold) / (calls offered).
// We exclude abandoned calls that abandoned BEFORE threshold from denominator
// if the excludeShortAbandon assumption is set — this is a common source of
// debate between vendors. WFM Rescue exposes the assumption explicitly.
// ---------------------------------------------------------------------------
export interface SlOptions {
  /** Exclude calls that abandoned before the threshold seconds from the denominator. */
  excludeShortAbandons?: boolean;
  /** Abandonment threshold (seconds) if excluding short abandons. Defaults to the SL threshold. */
  shortAbandonThreshold?: number;
}

export const computeServiceLevel = (
  offered: number | undefined,
  answeredWithin: number | undefined,
  abandonedBeforeThreshold: number | undefined,
  thresholdSec: number,
  options: SlOptions = {},
): number | null => {
  if (offered == null || offered === 0 || answeredWithin == null) return null;
  const excludeShortAbandons = options.excludeShortAbandons ?? true;
  const denom = excludeShortAbandons
    ? offered - (abandonedBeforeThreshold ?? 0)
    : offered;
  if (denom <= 0) return null;
  return answeredWithin / denom;
  void thresholdSec; // documented in KPI
};

// ---------------------------------------------------------------------------
// Erlang-C — used for required staff calculation.
// NOTE: Erlang-C assumes:
//  - Poisson arrivals, exponential service times
//  - Unlimited queue, no abandonment, all calls answered
//  - Steady-state (interval is homogeneous)
// For abandonment-aware staffing, Erlang-A or simulation is more accurate.
// We use Erlang-C as an industry-standard baseline and flag its limitations.
// ---------------------------------------------------------------------------
function erlangCBlocking(traffic: number, agents: number): number {
  let sum = 1;
  let a = 1;
  for (let k = 0; k < agents; k += 1) {
    a *= traffic / (k + 1);
    sum += a;
  }
  const last = a * traffic / agents;
  const numerator = last;
  const denominator = last + (1 - traffic / agents) * sum;
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

export function probWait(traffic: number, agents: number): number {
  if (agents <= 0 || traffic <= 0) return 1;
  if (traffic >= agents) return 1;
  return erlangCBlocking(traffic, agents);
}

/**
 * Required agents using Erlang-C to hit a given SL target.
 * Searches incrementally from agents = ceil(traffic) up.
 * Returns the minimum agents required.
 */
export function requiredAgents(
  callsPerInterval: number,
  ahtSeconds: number,
  intervalMinutes: number,
  slTarget: number, // 0..1
  slThresholdSeconds: number,
  shrinkage = 0, // 0..1
): number {
  const intervalSeconds = intervalMinutes * 60;
  const traffic = (callsPerInterval * ahtSeconds) / intervalSeconds;
  if (traffic <= 0) return 0;
  const pw = probWait(traffic, Math.ceil(traffic));
  // we'll find the minimal N where SL >= target
  const base = Math.max(1, Math.ceil(traffic));
  for (let n = base; n < base + 500; n += 1) {
    const pwN = probWait(traffic, n);
    const ahtInInterval = ahtSeconds / intervalSeconds;
    const sl = 1 - pwN * Math.exp(-(n - traffic) * (slThresholdSeconds / ahtSeconds));
    if (sl >= slTarget) {
      return Math.ceil(n / (1 - shrinkage));
    }
  }
  return Math.ceil(base * 2 / (1 - shrinkage));
}

// ---------------------------------------------------------------------------
// Aggregations over interval records
// ---------------------------------------------------------------------------
export interface IntervalKpis {
  totalOffered: number;
  totalAnswered: number;
  totalAbandoned: number;
  weightedAht: number | null;
  serviceLevel: number | null;
  asa: number | null;
  occupancy: number | null;
  totalForecastVolume: number;
  totalScheduled: number;
  totalActual: number;
  totalRequired: number;
  forecastAccuracy: number | null; // 1 - WAPE
  absPercentError: number | null;
  staffingGap: number; // actual - required (negative = understaffed)
  scheduleGap: number; // scheduled - required
  netStaffVsSchedule: number; // actual - scheduled (negative = short)
  dataCompleteness: number; // 0..1 fraction of intervals with real data
  intervalCount: number;
}

export function aggregateIntervals(rows: IntervalRecord[]): IntervalKpis {
  const offered = sum(rows.map((r) => r.offered ?? r.actualVolume));
  const answered = sum(rows.map((r) => r.answered ?? r.actualVolume));
  const abandoned = sum(rows.map((r) => r.abandoned));
  const fctVol = sum(rows.map((r) => r.forecastVolume));

  // Weighted AHT by actual volume
  const weightedAht = wtdAvg(
    rows.map((r) => r.actualAht ?? r.forecastAht),
    rows.map((r) => r.actualVolume ?? r.forecastVolume),
  );

  // SL aggregated = answered within / offered (if we have per-interval SL,
  // we can't perfectly aggregate without answered-within; fall back to avg).
  const sls = rows.map((r) => r.serviceLevel);
  const serviceLevel = sls.some((s) => typeof s === "number") ? avg(sls) : null;

  const asa = avg(rows.map((r) => r.asa ?? r.avgSpeedAnswer));
  const occ = avg(rows.map((r) => r.occupancy));

  const scheduled = sum(rows.map((r) => r.scheduledStaff));
  const actual = sum(rows.map((r) => r.actualStaff));
  const required = sum(rows.map((r) => r.requiredStaff));

  // Forecast accuracy = 1 - WAPE (weighted absolute percent error)
  const pairs = rows.filter(
    (r) =>
      typeof r.forecastVolume === "number" &&
      typeof r.actualVolume === "number" &&
      (r.actualVolume ?? 0) > 0,
  );
  let wape: number | null = null;
  if (pairs.length > 0) {
    const err = sum(pairs.map((r) => Math.abs((r.actualVolume ?? 0) - (r.forecastVolume ?? 0))));
    const tot = sum(pairs.map((r) => r.actualVolume ?? 0));
    wape = tot > 0 ? err / tot : null;
  }
  const forecastAccuracy = wape == null ? null : Math.max(0, 1 - wape);

  const completeness =
    rows.length === 0
      ? 0
      : rows.filter((r) => r.actualVolume != null || r.offered != null).length / rows.length;

  return {
    totalOffered: offered,
    totalAnswered: answered,
    totalAbandoned: abandoned,
    weightedAht,
    serviceLevel,
    asa,
    occupancy: occ,
    totalForecastVolume: fctVol,
    totalScheduled: scheduled,
    totalActual: actual,
    totalRequired: required,
    forecastAccuracy,
    absPercentError: wape,
    staffingGap: actual - required,
    scheduleGap: scheduled - required,
    netStaffVsSchedule: actual - scheduled,
    dataCompleteness: completeness,
    intervalCount: rows.length,
  };
}

// ---------------------------------------------------------------------------
// KPI Catalog — rendered in /docs and used for metric-side panels.
// ---------------------------------------------------------------------------
export const KPI_DEFINITIONS: KpiDefinition[] = [
  {
    id: "service_level",
    name: "Service Level",
    category: "service",
    unit: "percent",
    description:
      "Porcentaje de contactos atendidos dentro del umbral de tiempo acordado (p. ej. 80% en 20 segundos).",
    formula: "SL = AtendidosDentroUmbral / (Ofrecidos − AbandonadosAntesDeUmbral)",
    denominator: "Ofrecidos menos abandonos cortos (configurable).",
    sourceFields: ["offered", "answered_within", "abandoned_before_threshold", "service_level"],
    assumptions: [
      "Los abandonos antes del umbral se excluyen del denominador por defecto (práctica común en la industria).",
      "La agregación diaria no es un promedio simple; se recalcula con totales cuando están disponibles.",
    ],
    limitations: [
      "Distintos proveedores calculan SL diferente ( Genesys, Avaya, NICE, etc.). Verifica la convención de tu ACD.",
      "Erlang-C asume cero abandonos; el SL real puede diferir del SL modelado.",
    ],
    benchmark: { good: 0.85, warn: 0.75, bad: 0.65, direction: "max" },
  },
  {
    id: "asa",
    name: "Average Speed of Answer (ASA)",
    category: "service",
    unit: "seconds",
    description: "Tiempo promedio que un contacto espera en cola antes de ser atendido.",
    formula: "ASA = Σ TiempoEspera / Atendidos",
    sourceFields: ["asa", "avg_speed_answer"],
    benchmark: { good: 20, warn: 40, bad: 80, direction: "min" },
  },
  {
    id: "aht",
    name: "Average Handle Time (AHT)",
    category: "volume",
    unit: "seconds",
    description:
      "Tiempo promedio total por contacto: conversación + espera + trabajo posterior (ACW). Se usa para calcular carga (workload) y requerimiento.",
    formula: "AHT = (Talk + Hold + ACW) / Atendidos",
    sourceFields: ["actualAht", "forecastAht", "talk_time", "hold_time", "acw_time"],
    benchmark: { good: 300, warn: 420, bad: 540, direction: "min" },
  },
  {
    id: "occupancy",
    name: "Occupancy",
    category: "occupancy",
    unit: "percent",
    description:
      "Porcentaje del tiempo registrado (loggeado) que un agente está realmente ocupado atendiendo o en trabajo posterior.",
    formula: "Occupancy = (Handle Time Total) / Logged-in productive time",
    sourceFields: ["occupancy"],
    assumptions: [
      "No incluye tiempo en AUX no productivo si tu ACD lo reporta separado.",
    ],
    benchmark: { good: 0.88, warn: 0.92, bad: 0.95, direction: "max" },
    limitations: [
      "Ocupación > 92% sostenida es predictor de agotamiento y rotación.",
    ],
  },
  {
    id: "abandonment",
    name: "Abandonment Rate",
    category: "service",
    unit: "percent",
    formula: "Abandoned / Offered",
    description: "Porcentaje de contactos que cuelgan o abandonan antes de ser atendidos.",
    sourceFields: ["abandoned", "offered"],
    benchmark: { good: 0.05, warn: 0.08, bad: 0.12, direction: "min" },
  },
  {
    id: "required_staff",
    name: "Required Staff (FTE)",
    category: "staffing",
    unit: "integer",
    description:
      "Dotación necesaria para alcanzar el objetivo de SL. Calculado con Erlang-C + shrinkage configurado.",
    formula: "Required = Erlang-C(Volumen, AHT, Intervalo, SL, Umbral, Shrinkage)",
    sourceFields: ["forecastVolume", "forecastAht", "requiredStaff"],
    assumptions: [
      "Erlang-C asume arribos Poisson, tiempos exponenciales, cola ilimitada, cero abandonos.",
      "Se añade shrinkage para convertir 'personas en sus puestos' en agentes requeridos en el horario.",
    ],
    limitations: [
      "Bajo-dimensiona cuando hay abandono significativo o arribos no-Poisson (chat con backlog).",
    ],
  },
  {
    id: "staffing_gap",
    name: "Staffing Gap",
    category: "staffing",
    unit: "integer",
    formula: "Actual − Required",
    description:
      "Diferencia entre agentes presentes y agentes requeridos. Negativo = déficit; positivo = excedente.",
    sourceFields: ["actualStaff", "requiredStaff"],
    benchmark: { good: 0, warn: -2, bad: -4, direction: "max" },
  },
  {
    id: "forecast_accuracy",
    name: "Forecast Accuracy (1 − WAPE)",
    category: "volume",
    unit: "percent",
    formula: "1 − Σ|Actual − Forecast| / ΣActual",
    description:
      "Precisión del pronóstico por volumen usando WAPE (error porcentual absoluto ponderado). Mejor que MAPE porque no infla errores de intervalos pequeños.",
    sourceFields: ["forecastVolume", "actualVolume"],
    benchmark: { good: 0.9, warn: 0.8, bad: 0.7, direction: "max" },
  },
  {
    id: "adherence",
    name: "Schedule Adherence",
    category: "adherence",
    unit: "percent",
    formula: "Adherente = TiempoEnActividadProgramada / TiempoTotalProgramado",
    description:
      "Porcentaje del tiempo que el agente está en la actividad correcta según su horario. Distinguir de 'conformidad' (total trabajado vs total programado).",
    sourceFields: ["isAdherent", "scheduledActivity", "actualActivity"],
    assumptions: [
      "Adherencia mide 'en la actividad correcta en el momento correcto'; Conformidad mide el total al final del día.",
    ],
    benchmark: { good: 0.94, warn: 0.9, bad: 0.85, direction: "max" },
  },
  {
    id: "conformance",
    name: "Conformance",
    category: "adherence",
    unit: "percent",
    formula: "TiempoProductivoTotal / TiempoProgramadoTotal",
    description:
      "Total de tiempo trabajado versus programado; no penaliza desviaciones temporales si se recupera el tiempo.",
    sourceFields: [],
    benchmark: { good: 0.97, warn: 0.94, bad: 0.9, direction: "max" },
  },
  {
    id: "attendance",
    name: "Attendance Rate",
    category: "attendance",
    unit: "percent",
    formula: "(AgentesProgramados − Ausencias) / AgentesProgramados",
    description: "Porcentaje de agentes programados que efectivamente se presentaron.",
    sourceFields: [],
    benchmark: { good: 0.97, warn: 0.95, bad: 0.92, direction: "max" },
  },
  {
    id: "shrinkage",
    name: "Shrinkage",
    category: "shrinkage",
    unit: "percent",
    formula: "(TiempoNoProductivo) / TiempoPagado",
    description:
      "Porcentaje del tiempo pagado que los agentes NO están atendiendo contactos (pausas, capacitación, reuniones, coaching, ausencias, AUX no productivos, etc.).",
    sourceFields: ["shrinkage"],
    assumptions: [
      "Se separa en shrinkage planificado (vacaciones, capacitación, reuniones) vs no-planificado (ausencias, AUX excesivo).",
    ],
    benchmark: { good: 0.3, warn: 0.38, bad: 0.45, direction: "min" },
  },
  {
    id: "aux_ratio",
    name: "AUX Non-Productive Ratio",
    category: "shrinkage",
    unit: "percent",
    formula: "TiempoAUXNoProductivo / TiempoLogueado",
    description: "Proporción del tiempo logueado en códigos AUX no productivos.",
    sourceFields: ["auxDurationSec"],
    benchmark: { good: 0.08, warn: 0.14, bad: 0.2, direction: "min" },
  },
];
