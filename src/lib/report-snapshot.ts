// Informe compartido ("foto"): un resumen del informe que se guarda en Supabase y se abre con un enlace.
// Contiene solo KPIs, series agregadas y tablas pequeñas, en el idioma elegido al compartir.
// NUNCA incluye datos crudos de intervalos ni nombres de agentes (los agentes van como "Agente 1, 2…").
// Las funciones de este archivo son puras: no leen el store ni el DOM, así se prueban con tsx.
import type { AgentIntervalRecord, IntervalRecord } from "./types";
import { aggregateIntervals } from "./wfm";

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_MAX_BYTES = 240_000; // el servidor acepta 256 KB; dejamos margen
export const SHARE_DEFAULT_DAYS = 7;
export const SHARE_MAX_DAYS = 365;
const MAX_TABLE_ROWS = 300;
const MAX_SERIES_POINTS = 400;
const AUX_THRESHOLD_SEC = 900; // igual que la página AUX: más de 15 min por intervalo = excede

export type Lang = "es" | "en";
export type Tone = "good" | "warn" | "bad" | "neutral";
export type Fmt = "pct" | "int" | "sec" | "num" | "text";

export type SnapKpi = { label: string; value: number | null; format: Fmt; sub?: string; tone?: Tone };
export type SnapSeries = { key: string; label: string; color: string; kind: "bar" | "line"; dashed?: boolean };
export type SnapChart =
  | {
      type: "gauge";
      title: string;
      subtitle?: string;
      value: number | null;
      label: string;
      sublabel?: string;
      thresholds: { good: number; warn: number };
    }
  | {
      type: "series";
      title: string;
      subtitle?: string;
      percent?: boolean;
      refLine?: number;
      refLabel?: string;
      data: Array<Record<string, string | number | null>>;
      series: SnapSeries[];
    };
export type SnapTable = {
  title: string;
  columns: { key: string; label: string; format: Fmt }[];
  rows: Array<Record<string, string | number | null>>;
};

/** Contenido del informe (lo que calcula cada página). */
export type ReportContent = { kpis: SnapKpi[]; charts: SnapChart[]; tables: SnapTable[]; note?: string };

/** Lo que se guarda: contenido + datos de encabezado. */
export type ReportSnapshot = ReportContent & {
  v: number;
  lang: Lang;
  reportName: string;
  orgName: string;
  datasetName: string;
  datasetIsDemo: boolean;
  filtersText: string;
  generatedAt: string;
};

const COLOR = {
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  sky: "#0ea5e9",
  violet: "#8b5cf6",
  teal: "#14b8a6",
};

const pair = (lang: Lang) => (es: string, en: string) => (lang === "es" ? es : en);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const tone = (good: boolean, warn: boolean): Tone => (good ? "good" : warn ? "warn" : "bad");

function sortedByStart<T extends { intervalStart: Date }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.intervalStart.getTime() - b.intervalStart.getTime());
}

function capSeries<T>(points: T[]): T[] {
  return points.length > MAX_SERIES_POINTS ? points.slice(0, MAX_SERIES_POINTS) : points;
}

// ---------------------------------------------------------------------------
// Asistencia (Attendance)
// ---------------------------------------------------------------------------
export function buildAttendanceContent(rows: IntervalRecord[], lang: Lang): ReportContent {
  const t = pair(lang);
  const k = aggregateIntervals(rows);
  const rate = k.totalScheduled > 0 ? Math.min(1, k.totalActual / k.totalScheduled) : null;
  const absenteeism = rate == null ? null : 1 - rate;
  const absent = Math.max(0, k.totalScheduled - k.totalActual);

  const byInterval = new Map<string, { label: string; start: Date; scheduled: number; actual: number }>();
  for (const r of rows) {
    const cur = byInterval.get(r.intervalLabel) ?? { label: r.intervalLabel, start: r.intervalStart, scheduled: 0, actual: 0 };
    cur.scheduled += num(r.scheduledStaff);
    cur.actual += num(r.actualStaff);
    byInterval.set(r.intervalLabel, cur);
  }
  const series = sortedByStart([...byInterval.values()].map((v) => ({ ...v, intervalStart: v.start })));

  return {
    kpis: [
      {
        label: t("Asistencia", "Attendance"),
        value: rate,
        format: "pct",
        sub: `${Math.round(k.totalActual)} / ${Math.round(k.totalScheduled)} ${t("presentes", "present")}`,
        tone: rate == null ? "neutral" : tone(rate >= 0.97, rate >= 0.93),
      },
      {
        label: t("Ausentismo", "Absenteeism"),
        value: absenteeism,
        format: "pct",
        sub: `${Math.round(absent)} ${t("ausencias", "absences")}`,
        tone: absenteeism == null ? "neutral" : absenteeism > 0.07 ? "bad" : "good",
      },
      {
        label: t("Impacto en capacidad", "Capacity impact"),
        value: absent,
        format: "int",
        sub: t("Agentes faltantes (suma de intervalos)", "Missing agents (sum of intervals)"),
        tone: "neutral",
      },
    ],
    charts: [
      {
        type: "gauge",
        title: t("Asistencia global", "Overall attendance"),
        subtitle: t("Presentes / programados", "Present / scheduled"),
        value: rate,
        label: t("Asistencia", "Attendance"),
        sublabel: `${Math.round(k.totalActual)} ${t("de", "of")} ${Math.round(k.totalScheduled)}`,
        thresholds: { good: 0.97, warn: 0.93 },
      },
      {
        type: "series",
        title: t("Ausentismo por intervalo", "Absenteeism by interval"),
        subtitle: t("Barras = ausencias (programado - real)", "Bars = absences (scheduled - actual)"),
        data: capSeries(series.map((v) => ({ label: v.label, absent: Math.max(0, v.scheduled - v.actual) }))),
        series: [{ key: "absent", label: t("Ausentes", "Absent"), color: COLOR.amber, kind: "bar" }],
      },
      {
        type: "series",
        title: t("Asistencia por intervalo", "Attendance by interval"),
        percent: true,
        refLine: 0.97,
        refLabel: t("Objetivo 97%", "Target 97%"),
        data: capSeries(
          series.map((v) => ({
            label: v.label,
            attendance: v.scheduled > 0 ? Math.min(1, v.actual / v.scheduled) : null,
          })),
        ),
        series: [{ key: "attendance", label: t("Asistencia", "Attendance"), color: COLOR.emerald, kind: "bar" }],
      },
    ],
    tables: [],
    note: t(
      "La tardanza no se incluye: en la app es una estimación aproximada, no una medición.",
      "Tardiness is not included: in the app it is a rough estimate, not a measurement.",
    ),
  };
}

// ---------------------------------------------------------------------------
// Dashboard operativo
// ---------------------------------------------------------------------------
export function buildDashboardContent(rows: IntervalRecord[], lang: Lang): ReportContent {
  const t = pair(lang);
  const k = aggregateIntervals(rows);

  const byInterval = new Map<string, { label: string; start: Date; offered: number; required: number; scheduled: number; actual: number; slSum: number; slN: number }>();
  for (const r of rows) {
    const cur = byInterval.get(r.intervalLabel) ?? { label: r.intervalLabel, start: r.intervalStart, offered: 0, required: 0, scheduled: 0, actual: 0, slSum: 0, slN: 0 };
    cur.offered += num(r.offered ?? r.actualVolume);
    cur.required += num(r.requiredStaff);
    cur.scheduled += num(r.scheduledStaff);
    cur.actual += num(r.actualStaff);
    if (typeof r.serviceLevel === "number") {
      cur.slSum += r.serviceLevel;
      cur.slN += 1;
    }
    byInterval.set(r.intervalLabel, cur);
  }
  const series = sortedByStart([...byInterval.values()].map((v) => ({ ...v, intervalStart: v.start })));

  const byQueue = new Map<string, { queue: string; offered: number; abandoned: number; slSum: number; slN: number; ahtW: number; ahtN: number; required: number; actual: number }>();
  for (const r of rows) {
    const key = r.queue ?? "—";
    const cur = byQueue.get(key) ?? { queue: key, offered: 0, abandoned: 0, slSum: 0, slN: 0, ahtW: 0, ahtN: 0, required: 0, actual: 0 };
    cur.offered += num(r.offered ?? r.actualVolume);
    cur.abandoned += num(r.abandoned);
    cur.required += num(r.requiredStaff);
    cur.actual += num(r.actualStaff);
    if (typeof r.serviceLevel === "number") {
      cur.slSum += r.serviceLevel;
      cur.slN += 1;
    }
    if (typeof r.actualAht === "number") {
      const w = num(r.actualVolume ?? r.offered) || 1;
      cur.ahtW += r.actualAht * w;
      cur.ahtN += w;
    }
    byQueue.set(key, cur);
  }
  const queues = [...byQueue.values()].sort((a, b) => b.offered - a.offered).slice(0, MAX_TABLE_ROWS);

  const sl = k.serviceLevel;
  const occ = k.occupancy;
  const abandonRate = k.totalOffered > 0 ? k.totalAbandoned / k.totalOffered : null;

  return {
    kpis: [
      {
        label: t("Nivel de servicio", "Service level"),
        value: sl,
        format: "pct",
        sub: t("Objetivo 80%", "Target 80%"),
        tone: sl == null ? "neutral" : tone(sl >= 0.8, sl >= 0.7),
      },
      {
        label: t("Ocupación", "Occupancy"),
        value: occ,
        format: "pct",
        sub: t("Rango sano 75–92%", "Healthy range 75–92%"),
        tone: occ == null ? "neutral" : occ > 0.75 && occ < 0.92 ? "good" : occ >= 0.95 ? "bad" : "warn",
      },
      {
        label: t("Brecha de personal", "Staffing gap"),
        value: k.staffingGap,
        format: "int",
        sub: t("Presentes - requeridos", "Present - required"),
        tone: tone(k.staffingGap >= 0, k.staffingGap > -3),
      },
      {
        label: t("Precisión del pronóstico", "Forecast accuracy"),
        value: k.forecastAccuracy,
        format: "pct",
        sub: t("1 - WAPE", "1 - WAPE"),
        tone: k.forecastAccuracy == null ? "neutral" : tone(k.forecastAccuracy >= 0.9, k.forecastAccuracy >= 0.8),
      },
      {
        label: t("Abandono", "Abandon rate"),
        value: abandonRate,
        format: "pct",
        sub: `${Math.round(k.totalAbandoned)} ${t("abandonadas", "abandoned")}`,
        tone: "neutral",
      },
      {
        label: t("Ofrecidas", "Offered"),
        value: k.totalOffered,
        format: "int",
        sub: `${Math.round(k.totalAnswered)} ${t("atendidas", "answered")}`,
        tone: "neutral",
      },
    ],
    charts: [
      {
        type: "series",
        title: t("Personal por intervalo", "Staff by interval"),
        subtitle: t("Línea punteada = requerido", "Dashed line = required"),
        data: capSeries(series.map((v) => ({ label: v.label, required: v.required, scheduled: v.scheduled, actual: v.actual }))),
        series: [
          { key: "required", label: t("Requeridos", "Required"), color: COLOR.violet, kind: "line", dashed: true },
          { key: "scheduled", label: t("Programados", "Scheduled"), color: COLOR.sky, kind: "line" },
          { key: "actual", label: t("Presentes", "Present"), color: COLOR.emerald, kind: "line" },
        ],
      },
      {
        type: "series",
        title: t("Volumen ofrecido por intervalo", "Offered volume by interval"),
        data: capSeries(series.map((v) => ({ label: v.label, offered: v.offered }))),
        series: [{ key: "offered", label: t("Ofrecidas", "Offered"), color: COLOR.teal, kind: "bar" }],
      },
      {
        type: "series",
        title: t("Nivel de servicio por intervalo", "Service level by interval"),
        subtitle: t("Línea punteada = objetivo 80%", "Dotted line = 80% target"),
        percent: true,
        refLine: 0.8,
        refLabel: t("Objetivo 80%", "Target 80%"),
        data: capSeries(series.map((v) => ({ label: v.label, sl: v.slN > 0 ? v.slSum / v.slN : null }))),
        series: [{ key: "sl", label: t("Nivel de servicio", "Service level"), color: COLOR.emerald, kind: "line" }],
      },
    ],
    tables: [
      {
        title: t("Resumen por cola", "Summary by queue"),
        columns: [
          { key: "queue", label: t("Cola", "Queue"), format: "text" },
          { key: "offered", label: t("Ofrecidas", "Offered"), format: "int" },
          { key: "sl", label: t("Nivel de servicio", "Service level"), format: "pct" },
          { key: "aht", label: t("AHT (seg)", "AHT (sec)"), format: "num" },
          { key: "abandon", label: t("Abandono", "Abandon"), format: "pct" },
          { key: "gap", label: t("Brecha", "Gap"), format: "int" },
        ],
        rows: queues.map((q) => ({
          queue: q.queue,
          offered: q.offered,
          sl: q.slN > 0 ? q.slSum / q.slN : null,
          aht: q.ahtN > 0 ? q.ahtW / q.ahtN : null,
          abandon: q.offered > 0 ? q.abandoned / q.offered : null,
          gap: q.actual - q.required,
        })),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Pronóstico vs real (Forecast)
// ---------------------------------------------------------------------------
export function buildForecastContent(rows: IntervalRecord[], lang: Lang): ReportContent {
  const t = pair(lang);
  const k = aggregateIntervals(rows);
  const bias = k.totalForecastVolume > 0 ? (k.totalOffered - k.totalForecastVolume) / k.totalForecastVolume : null;

  const byInterval = new Map<string, { label: string; start: Date; forecast: number; actual: number }>();
  for (const r of rows) {
    const cur = byInterval.get(r.intervalLabel) ?? { label: r.intervalLabel, start: r.intervalStart, forecast: 0, actual: 0 };
    cur.forecast += num(r.forecastVolume);
    cur.actual += num(r.actualVolume ?? r.offered);
    byInterval.set(r.intervalLabel, cur);
  }
  const series = sortedByStart([...byInterval.values()].map((v) => ({ ...v, intervalStart: v.start })));

  const queueNames = [...new Set(rows.map((r) => r.queue ?? "—"))];
  const queueRows = queueNames
    .map((q) => {
      const sub = rows.filter((r) => (r.queue ?? "—") === q);
      const kq = aggregateIntervals(sub);
      const b = kq.totalForecastVolume > 0 ? (kq.totalOffered - kq.totalForecastVolume) / kq.totalForecastVolume : null;
      return {
        queue: q,
        forecast: kq.totalForecastVolume,
        actual: kq.totalOffered,
        bias: b,
        wape: kq.forecastAccuracy == null ? null : 1 - kq.forecastAccuracy,
      };
    })
    .sort((a, b) => b.actual - a.actual)
    .slice(0, MAX_TABLE_ROWS);

  const acc = k.forecastAccuracy;
  return {
    kpis: [
      {
        label: t("Precisión (1 - WAPE)", "Accuracy (1 - WAPE)"),
        value: acc,
        format: "pct",
        sub: t("Más alto es mejor", "Higher is better"),
        tone: acc == null ? "neutral" : tone(acc >= 0.9, acc >= 0.8),
      },
      {
        label: "WAPE",
        value: k.absPercentError ?? (acc == null ? null : 1 - acc),
        format: "pct",
        sub: t("Error absoluto ponderado", "Weighted absolute error"),
        tone: "neutral",
      },
      {
        label: t("Sesgo", "Bias"),
        value: bias,
        format: "pct",
        sub: bias == null ? "" : bias > 0 ? t("Subestimas la demanda", "Demand is underestimated") : t("Sobreestimas la demanda", "Demand is overestimated"),
        tone: bias == null ? "neutral" : Math.abs(bias) <= 0.05 ? "good" : Math.abs(bias) <= 0.15 ? "warn" : "bad",
      },
      {
        label: t("Pronóstico total", "Total forecast"),
        value: k.totalForecastVolume,
        format: "int",
        sub: `${Math.round(k.totalOffered)} ${t("reales", "actual")}`,
        tone: "neutral",
      },
    ],
    charts: [
      {
        type: "series",
        title: t("Pronóstico vs real por intervalo", "Forecast vs actual by interval"),
        subtitle: t("Barras = real · línea = pronóstico", "Bars = actual · line = forecast"),
        data: capSeries(series.map((v) => ({ label: v.label, actual: v.actual, forecast: v.forecast }))),
        series: [
          { key: "actual", label: t("Real", "Actual"), color: COLOR.teal, kind: "bar" },
          { key: "forecast", label: t("Pronóstico", "Forecast"), color: COLOR.violet, kind: "line" },
        ],
      },
      {
        type: "series",
        title: t("Error % por intervalo", "Error % by interval"),
        subtitle: t("Positivo = real por encima del pronóstico", "Positive = actual above forecast"),
        percent: true,
        refLine: 0,
        refLabel: "0%",
        data: capSeries(
          series.map((v) => ({
            label: v.label,
            errorPct: v.forecast > 0 && v.actual > 0 ? (v.actual - v.forecast) / v.forecast : null,
          })),
        ),
        series: [{ key: "errorPct", label: "Error %", color: COLOR.violet, kind: "bar" }],
      },
    ],
    tables: [
      {
        title: t("Análisis por cola", "Analysis by queue"),
        columns: [
          { key: "queue", label: t("Cola", "Queue"), format: "text" },
          { key: "forecast", label: t("Pronóstico", "Forecast"), format: "int" },
          { key: "actual", label: t("Real", "Actual"), format: "int" },
          { key: "bias", label: t("Sesgo", "Bias"), format: "pct" },
          { key: "wape", label: "WAPE", format: "pct" },
        ],
        rows: queueRows.map((q) => ({ queue: q.queue, forecast: q.forecast, actual: q.actual, bias: q.bias, wape: q.wape })),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// AUX (tiempo no productivo)
// ---------------------------------------------------------------------------
export function buildAuxContent(agentRows: AgentIntervalRecord[], lang: Lang): ReportContent {
  const t = pair(lang);
  const aux = agentRows.filter((a) => a.auxCode || !a.isAdherent);

  const byCode = new Map<string, { code: string; count: number; totalSec: number }>();
  for (const a of aux) {
    const code = a.auxCode ?? (a.isAdherent ? "—" : t("Desvío sin código", "Deviation without code"));
    const cur = byCode.get(code) ?? { code, count: 0, totalSec: 0 };
    cur.count += 1;
    cur.totalSec += num(a.auxDurationSec);
    byCode.set(code, cur);
  }
  const codes = [...byCode.values()].sort((a, b) => b.totalSec - a.totalSec);
  const totalSec = codes.reduce((s, c) => s + c.totalSec, 0);

  // Agentes anonimizados: "Agente 1", "Agente 2"… en orden de aparición. Nunca se muestra el nombre real.
  const agentLabel = new Map<string, string>();
  const labelFor = (id: string) => {
    if (!agentLabel.has(id)) agentLabel.set(id, `${t("Agente", "Agent")} ${agentLabel.size + 1}`);
    return agentLabel.get(id) as string;
  };
  const exceeds = aux
    .filter((a) => num(a.auxDurationSec) > AUX_THRESHOLD_SEC)
    .sort((a, b) => num(b.auxDurationSec) - num(a.auxDurationSec))
    .slice(0, 20)
    .map((a) => ({
      agent: labelFor(a.agentId),
      code: a.auxCode ?? "—",
      sec: num(a.auxDurationSec),
      minOver: Math.round((num(a.auxDurationSec) - AUX_THRESHOLD_SEC) / 60),
    }));
  const exceedsTotal = aux.filter((a) => num(a.auxDurationSec) > AUX_THRESHOLD_SEC).length;

  const byTeam = new Map<string, { team: string; site: string; sec: number; intervals: number }>();
  for (const a of aux) {
    const key = `${a.team ?? "—"}|${a.site ?? ""}`;
    const cur = byTeam.get(key) ?? { team: a.team ?? "—", site: a.site ?? "", sec: 0, intervals: 0 };
    cur.sec += num(a.auxDurationSec);
    cur.intervals += 1;
    byTeam.set(key, cur);
  }
  const teams = [...byTeam.values()].sort((a, b) => b.sec - a.sec).slice(0, MAX_TABLE_ROWS);

  return {
    kpis: [
      { label: t("Tiempo total AUX", "Total AUX time"), value: totalSec, format: "sec", sub: `${codes.length} ${t("códigos distintos", "distinct codes")}`, tone: "neutral" },
      { label: t("Intervalos AUX", "AUX intervals"), value: aux.length, format: "int", sub: aux.length > 0 ? `${t("Promedio", "Average")} ${Math.round(totalSec / aux.length)} s` : "", tone: "neutral" },
      {
        label: t("Excede (>15 min)", "Exceeds (>15 min)"),
        value: exceedsTotal,
        format: "int",
        sub: t("Intervalos sobre el umbral", "Intervals over threshold"),
        tone: exceedsTotal > 5 ? "bad" : exceedsTotal > 2 ? "warn" : "good",
      },
      { label: t("Equipos afectados", "Affected teams"), value: byTeam.size, format: "int", sub: t("Equipos con AUX registrado", "Teams with recorded AUX"), tone: "neutral" },
    ],
    charts: [
      {
        type: "series",
        title: t("Tiempo AUX por código (horas)", "AUX time by code (hours)"),
        data: capSeries(codes.map((c) => ({ label: c.code, hours: Math.round((c.totalSec / 3600) * 100) / 100 }))),
        series: [{ key: "hours", label: t("Horas", "Hours"), color: COLOR.violet, kind: "bar" }],
      },
    ],
    tables: [
      {
        title: t("Detalle por código AUX", "Detail by AUX code"),
        columns: [
          { key: "code", label: t("Código", "Code"), format: "text" },
          { key: "count", label: t("Intervalos", "Intervals"), format: "int" },
          { key: "sec", label: t("Tiempo total", "Total time"), format: "sec" },
          { key: "avg", label: t("Promedio (seg)", "Average (sec)"), format: "num" },
        ],
        rows: codes.map((c) => ({ code: c.code, count: c.count, sec: c.totalSec, avg: c.count > 0 ? c.totalSec / c.count : 0 })),
      },
      {
        title: t("Excede 15 min — ranking", "Over 15 min — ranking"),
        columns: [
          { key: "agent", label: t("Agente", "Agent"), format: "text" },
          { key: "code", label: t("Código", "Code"), format: "text" },
          { key: "sec", label: t("Tiempo (seg)", "Time (sec)"), format: "int" },
          { key: "minOver", label: t("Exceso (min)", "Over (min)"), format: "int" },
        ],
        rows: exceeds.map((e) => ({ agent: e.agent, code: e.code, sec: e.sec, minOver: e.minOver })),
      },
      {
        title: t("AUX por equipo / sitio", "AUX by team / site"),
        columns: [
          { key: "team", label: t("Equipo", "Team"), format: "text" },
          { key: "site", label: t("Sitio", "Site"), format: "text" },
          { key: "sec", label: t("Tiempo total", "Total time"), format: "sec" },
          { key: "avgMin", label: t("Promedio por intervalo (min)", "Average per interval (min)"), format: "num" },
        ],
        rows: teams.map((x) => ({ team: x.team, site: x.site, sec: x.sec, avgMin: x.intervals > 0 ? Math.round((x.sec / x.intervals / 60) * 10) / 10 : 0 })),
      },
    ],
    note: t("Los nombres de agentes no se comparten: aparecen como Agente 1, 2…", "Agent names are not shared: they appear as Agent 1, 2…"),
  };
}

// ---------------------------------------------------------------------------
// Utilidades de encabezado
// ---------------------------------------------------------------------------
export type FilterSnapshot = { queues: string[]; channels: string[]; sites: string[]; skills: string[] };

/** Texto de filtros activos en el idioma del informe. Sin filtros: "Sin filtros" / "No filters". */
export function filtersSummary(f: FilterSnapshot, lang: Lang): string {
  const t = pair(lang);
  const parts: string[] = [];
  const add = (label: string, values: string[]) => {
    if (values.length) parts.push(`${label}: ${values.join(", ")}`);
  };
  add(t("Colas", "Queues"), f.queues);
  add(t("Canales", "Channels"), f.channels);
  add(t("Sitios", "Sites"), f.sites);
  add(t("Skills", "Skills"), f.skills);
  return parts.length ? parts.join(" · ") : t("Sin filtros", "No filters");
}

/** Fecha de caducidad a partir de días (1..365). */
export function expiryFromDays(days: number, now = new Date()): Date {
  const d = Math.min(SHARE_MAX_DAYS, Math.max(1, Math.round(days)));
  return new Date(now.getTime() + d * 24 * 3600 * 1000);
}

/** Arma el informe completo. Lanza error si pasa del tamaño máximo. */
export function makeSnapshot(
  content: ReportContent,
  meta: Omit<ReportSnapshot, keyof ReportContent | "v"> & { lang: Lang },
): ReportSnapshot {
  const snap: ReportSnapshot = { v: SNAPSHOT_VERSION, ...meta, ...content };
  const bytes = new TextEncoder().encode(JSON.stringify(snap)).length;
  if (bytes > SNAPSHOT_MAX_BYTES) {
    throw new Error("snapshot_too_large");
  }
  return snap;
}
