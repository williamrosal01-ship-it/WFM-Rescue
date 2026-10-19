// Report Studio — pure logic (no React). Used by the studio pages and by unit tests.
import type { IntervalRecord } from "./types";

export type Locale = "es" | "en";
export type LocalizedText = string | { es: string; en: string };

export type ChartKind = "kpi" | "bar" | "stacked" | "line" | "area" | "donut" | "table";
export type Dimension = "interval" | "date" | "queue" | "channel" | "site" | "skill";
export type Agg = "sum" | "avg" | "min" | "max" | "count";
export type MetricId =
  | "offered"
  | "answered"
  | "abandoned"
  | "abandonRate"
  | "actualVolume"
  | "forecastVolume"
  | "volumeDiff"
  | "requiredStaff"
  | "scheduledStaff"
  | "actualStaff"
  | "staffGap"
  | "serviceLevel"
  | "asa"
  | "aht"
  | "occupancy";

export type ValueFormat = "int" | "pct" | "sec" | "num";

export interface MetricDef {
  id: MetricId;
  label: { es: string; en: string };
  format: ValueFormat;
  defaultAgg: Agg;
  /** Ratio metrics are computed from sums of their components, not per-row values. */
  ratio?: "abandon";
  value?: (r: IntervalRecord) => number | null;
  /** Aggregations allowed for this metric. */
  aggs: Agg[];
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

const STAFF_AGGS: Agg[] = ["avg", "min", "max", "sum"];
const RATE_AGGS: Agg[] = ["avg", "min", "max"];
const VOLUME_AGGS: Agg[] = ["sum", "avg", "max", "min"];

export const METRICS: MetricDef[] = [
  { id: "offered", label: { es: "Ofrecidas", en: "Offered" }, format: "int", defaultAgg: "sum", aggs: VOLUME_AGGS, value: (r) => num(r.offered) },
  { id: "answered", label: { es: "Atendidas", en: "Answered" }, format: "int", defaultAgg: "sum", aggs: VOLUME_AGGS, value: (r) => num(r.answered) },
  { id: "abandoned", label: { es: "Abandonadas", en: "Abandoned" }, format: "int", defaultAgg: "sum", aggs: VOLUME_AGGS, value: (r) => num(r.abandoned) },
  { id: "abandonRate", label: { es: "Tasa de abandono", en: "Abandon rate" }, format: "pct", defaultAgg: "avg", aggs: ["avg"], ratio: "abandon" },
  { id: "actualVolume", label: { es: "Volumen real", en: "Actual volume" }, format: "int", defaultAgg: "sum", aggs: VOLUME_AGGS, value: (r) => num(r.actualVolume) },
  { id: "forecastVolume", label: { es: "Volumen pronosticado", en: "Forecast volume" }, format: "int", defaultAgg: "sum", aggs: VOLUME_AGGS, value: (r) => num(r.forecastVolume) },
  {
    id: "volumeDiff",
    label: { es: "Real − pronóstico", en: "Actual − forecast" },
    format: "int",
    defaultAgg: "sum",
    aggs: VOLUME_AGGS,
    value: (r) => (num(r.actualVolume) !== null && num(r.forecastVolume) !== null ? (r.actualVolume as number) - (r.forecastVolume as number) : null),
  },
  { id: "requiredStaff", label: { es: "Requeridos", en: "Required" }, format: "num", defaultAgg: "avg", aggs: STAFF_AGGS, value: (r) => num(r.requiredStaff) },
  { id: "scheduledStaff", label: { es: "Programados", en: "Scheduled" }, format: "num", defaultAgg: "avg", aggs: STAFF_AGGS, value: (r) => num(r.scheduledStaff) },
  { id: "actualStaff", label: { es: "Presentes", en: "Present" }, format: "num", defaultAgg: "avg", aggs: STAFF_AGGS, value: (r) => num(r.actualStaff) },
  {
    id: "staffGap",
    label: { es: "Faltante (requeridos − presentes)", en: "Gap (required − present)" },
    format: "num",
    defaultAgg: "avg",
    aggs: STAFF_AGGS,
    value: (r) => (num(r.requiredStaff) !== null && num(r.actualStaff) !== null ? Math.max(0, (r.requiredStaff as number) - (r.actualStaff as number)) : null),
  },
  { id: "serviceLevel", label: { es: "Nivel de servicio", en: "Service level" }, format: "pct", defaultAgg: "avg", aggs: RATE_AGGS, value: (r) => num(r.serviceLevel) },
  { id: "asa", label: { es: "ASA (seg)", en: "ASA (sec)" }, format: "sec", defaultAgg: "avg", aggs: RATE_AGGS, value: (r) => num(r.asa ?? r.avgSpeedAnswer) },
  { id: "aht", label: { es: "AHT (seg)", en: "AHT (sec)" }, format: "sec", defaultAgg: "avg", aggs: RATE_AGGS, value: (r) => num(r.actualAht) },
  { id: "occupancy", label: { es: "Ocupación", en: "Occupancy" }, format: "pct", defaultAgg: "avg", aggs: RATE_AGGS, value: (r) => num(r.occupancy) },
];

export const METRIC_BY_ID: Record<MetricId, MetricDef> = Object.fromEntries(METRICS.map((m) => [m.id, m])) as Record<MetricId, MetricDef>;

export const DIMENSIONS: Array<{ id: Dimension; label: { es: string; en: string } }> = [
  { id: "interval", label: { es: "Intervalo", en: "Interval" } },
  { id: "date", label: { es: "Fecha", en: "Date" } },
  { id: "queue", label: { es: "Cola", en: "Queue" } },
  { id: "channel", label: { es: "Canal", en: "Channel" } },
  { id: "site", label: { es: "Sitio", en: "Site" } },
  { id: "skill", label: { es: "Skill", en: "Skill" } },
];

export const CHART_KINDS: Array<{ id: ChartKind; label: { es: string; en: string }; hint: { es: string; en: string } }> = [
  { id: "kpi", label: { es: "KPI", en: "KPI" }, hint: { es: "Cifra total o promedio", en: "Single total or average" } },
  { id: "bar", label: { es: "Barras", en: "Bars" }, hint: { es: "Comparar categorías", en: "Compare categories" } },
  { id: "stacked", label: { es: "Barras apiladas", en: "Stacked bars" }, hint: { es: "Partes de un total por categoría", en: "Parts of a total per category" } },
  { id: "line", label: { es: "Líneas", en: "Lines" }, hint: { es: "Tendencia en intervalos o días", en: "Trend over intervals or days" } },
  { id: "area", label: { es: "Área", en: "Area" }, hint: { es: "Volumen en el tiempo (una o dos series)", en: "Volume over time (one or two series)" } },
  { id: "donut", label: { es: "Dona", en: "Donut" }, hint: { es: "Participación de un total (1 métrica)", en: "Share of a total (1 metric)" } },
  { id: "table", label: { es: "Tabla", en: "Table" }, hint: { es: "Detalle con varias métricas", en: "Detail with several metrics" } },
];

export const DONUT_MAX_SLICES = 8;
export const BAR_MAX_GROUPS = 24;

export interface WidgetMetric {
  metric: MetricId;
  agg: Agg;
}

export interface Widget {
  id: string;
  title: LocalizedText;
  chart: ChartKind;
  dimension: Dimension;
  metrics: WidgetMetric[];
}

export interface StudioReport {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  templateId?: string;
  widgets: Widget[];
  createdAt: string;
  updatedAt: string;
}

export function resolveText(value: LocalizedText, locale: Locale): string {
  return typeof value === "string" ? value : value[locale];
}

// ---------- Dimensions ----------
export function dimensionKey(r: IntervalRecord, dim: Dimension): string | null {
  switch (dim) {
    case "interval":
      return r.intervalLabel || null;
    case "date":
      return r.date || null;
    case "queue":
      return r.queue || null;
    case "channel":
      return r.channel || null;
    case "site":
      return r.site || null;
    case "skill":
      return r.skill || null;
  }
}

export const NO_VALUE_KEY = "(sin valor)";
export const NO_VALUE_LABEL = { es: "(sin valor)", en: "(no value)" };

// ---------- Aggregation ----------
export function aggregate(values: Array<number | null>, agg: Agg): number | null {
  if (agg === "count") return values.filter((v) => v !== null).length;
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  switch (agg) {
    case "sum":
      return present.reduce((a, b) => a + b, 0);
    case "avg":
      return present.reduce((a, b) => a + b, 0) / present.length;
    case "min":
      return Math.min(...present);
    case "max":
      return Math.max(...present);
  }
}

export interface GroupResult {
  key: string;
  label: string;
  rows: number;
  values: Array<number | null>; // one per widget metric, same order
}

export interface WidgetResult {
  groups: GroupResult[];
  totals: Array<number | null>; // one per widget metric, over all rows
  rows: number;
}

function metricValue(def: MetricDef, rows: IntervalRecord[], agg: Agg): number | null {
  if (def.ratio === "abandon") {
    const off = aggregate(rows.map((r) => num(r.offered)), "sum");
    const ab = aggregate(rows.map((r) => num(r.abandoned)), "sum");
    if (off === null || ab === null || off === 0) return null;
    return ab / off;
  }
  if (!def.value) return null;
  const v = rows.map((r) => def.value!(r));
  return aggregate(v, agg);
}

/** Compute a widget over already-filtered rows. Pure and deterministic. */
export function computeWidget(rows: IntervalRecord[], widget: Widget, locale: Locale = "es"): WidgetResult {
  const metrics = widget.metrics.filter((m) => METRIC_BY_ID[m.metric]);
  const totals = metrics.map((m) => metricValue(METRIC_BY_ID[m.metric], rows, m.agg));
  if (widget.chart === "kpi") {
    return { groups: [], totals, rows: rows.length };
  }
  const buckets = new Map<string, IntervalRecord[]>();
  for (const r of rows) {
    const k = dimensionKey(r, widget.dimension) ?? NO_VALUE_KEY;
    const list = buckets.get(k);
    if (list) list.push(r);
    else buckets.set(k, [r]);
  }
  const groups: GroupResult[] = Array.from(buckets.entries()).map(([key, list]) => ({
    key,
    label: key === NO_VALUE_KEY ? NO_VALUE_LABEL[locale] : key,
    rows: list.length,
    values: metrics.map((m) => metricValue(METRIC_BY_ID[m.metric], list, m.agg)),
  }));
  if (widget.dimension === "interval" || widget.dimension === "date") {
    groups.sort((a, b) => a.key.localeCompare(b.key));
  } else {
    // Sort by first metric, descending; "no value" always last.
    groups.sort((a, b) => {
      if (a.key === NO_VALUE_KEY) return 1;
      if (b.key === NO_VALUE_KEY) return -1;
      return (b.values[0] ?? -Infinity) - (a.values[0] ?? -Infinity);
    });
  }
  return { groups, totals, rows: rows.length };
}

export const AGG_LABEL: Record<Agg, { es: string; en: string }> = {
  sum: { es: "Suma", en: "Sum" },
  avg: { es: "Promedio", en: "Average" },
  min: { es: "Mínimo", en: "Minimum" },
  max: { es: "Máximo", en: "Maximum" },
  count: { es: "Conteo", en: "Count" },
};

export function formatValue(v: number | null, format: ValueFormat, locale: Locale = "es"): string {
  if (v === null || !Number.isFinite(v)) return "—";
  const loc = locale === "en" ? "en-US" : "es-ES";
  switch (format) {
    case "pct":
      return `${(v * 100).toFixed(1)}%`;
    case "sec":
      return `${Math.round(v).toLocaleString(loc)} ${locale === "en" ? "sec" : "s"}`;
    case "int":
      return Math.round(v).toLocaleString(loc);
    case "num":
      return (Math.round(v * 10) / 10).toLocaleString(loc);
  }
}

/** Metric formats used by the widget. Mixing formats is allowed but charts should keep one unit. */
export function widgetHasMixedFormats(widget: Widget): boolean {
  const formats = new Set(widget.metrics.map((m) => METRIC_BY_ID[m.metric]?.format));
  formats.delete(undefined as unknown as ValueFormat);
  return formats.size > 1 && widget.chart !== "table" && widget.chart !== "kpi";
}

// ---------- CSV ----------
export function widgetToCsv(result: WidgetResult, widget: Widget, locale: Locale, dimLabel: string): string {
  const metricDefs = widget.metrics.map((m) => METRIC_BY_ID[m.metric]);
  const esc = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = [dimLabel, ...widget.metrics.map((m, i) => `${metricDefs[i].label[locale]} (${AGG_LABEL[m.agg][locale]})`)];
  const lines = [header.map(esc).join(",")];
  if (widget.chart === "kpi") {
    lines.push(["Total", ...result.totals.map((v) => (v === null ? "" : String(Number(v.toFixed(4)))))].map(esc).join(","));
  } else {
    for (const g of result.groups) {
      lines.push([g.label, ...g.values.map((v) => (v === null ? "" : String(Number(v.toFixed(4)))))].map(esc).join(","));
    }
  }
  return "\uFEFF" + lines.join("\n");
}

// ---------- Built-in templates ----------
export interface TemplateDef {
  id: string;
  name: { es: string; en: string };
  description: { es: string; en: string };
  widgets: Array<Omit<Widget, "id">>;
}

const w = (title: { es: string; en: string }, chart: ChartKind, dimension: Dimension, metrics: WidgetMetric[]) => ({
  title,
  chart,
  dimension,
  metrics,
});

export const TEMPLATES: TemplateDef[] = [
  {
    id: "full-operations",
    name: { es: "Informe operativo completo", en: "Full operations report" },
    description: {
      es: "Informe de demostración completo: indicadores, volumen, dotación, servicio, adherencia, canal y detalle por cola.",
      en: "Complete demo report: KPIs, volume, staffing, service, adherence, channel mix and queue detail.",
    },
    widgets: [
      w({ es: "Indicadores clave", en: "Key indicators" }, "kpi", "queue", [
        { metric: "offered", agg: "sum" },
        { metric: "serviceLevel", agg: "avg" },
        { metric: "asa", agg: "avg" },
        { metric: "aht", agg: "avg" },
        { metric: "occupancy", agg: "avg" },
        { metric: "abandonRate", agg: "avg" },
      ]),
      w({ es: "Volumen por intervalo: pronóstico vs real", en: "Volume by interval: forecast vs actual" }, "line", "interval", [
        { metric: "forecastVolume", agg: "sum" },
        { metric: "actualVolume", agg: "sum" },
      ]),
      w({ es: "Dotación por intervalo", en: "Staffing by interval" }, "line", "interval", [
        { metric: "requiredStaff", agg: "avg" },
        { metric: "scheduledStaff", agg: "avg" },
        { metric: "actualStaff", agg: "avg" },
      ]),
      w({ es: "Nivel de servicio por cola", en: "Service level by queue" }, "bar", "queue", [{ metric: "serviceLevel", agg: "avg" }]),
      w({ es: "Adherencia: programados vs presentes por cola", en: "Adherence: scheduled vs present by queue" }, "bar", "queue", [
        { metric: "scheduledStaff", agg: "avg" },
        { metric: "actualStaff", agg: "avg" },
      ]),
      w({ es: "Mix de canal (ofrecidas)", en: "Channel mix (offered)" }, "donut", "channel", [{ metric: "offered", agg: "sum" }]),
      w({ es: "Ocupación por cola", en: "Occupancy by queue" }, "bar", "queue", [{ metric: "occupancy", agg: "avg" }]),
      w({ es: "Detalle por cola", en: "Detail by queue" }, "table", "queue", [
        { metric: "offered", agg: "sum" },
        { metric: "abandonRate", agg: "avg" },
        { metric: "serviceLevel", agg: "avg" },
        { metric: "asa", agg: "avg" },
        { metric: "aht", agg: "avg" },
        { metric: "requiredStaff", agg: "avg" },
        { metric: "staffGap", agg: "sum" },
      ]),
    ],
  },
  {
    id: "adherence-staffing",
    name: { es: "Adherencia y dotación", en: "Adherence and staffing" },
    description: {
      es: "Programados contra presentes, brecha de dotación y ocupación a lo largo del día.",
      en: "Scheduled against present staff, staffing gap and occupancy across the day.",
    },
    widgets: [
      w({ es: "Programados vs presentes por cola", en: "Scheduled vs present by queue" }, "bar", "queue", [
        { metric: "scheduledStaff", agg: "avg" },
        { metric: "actualStaff", agg: "avg" },
      ]),
      w({ es: "Brecha de dotación por intervalo", en: "Staffing gap by interval" }, "line", "interval", [{ metric: "staffGap", agg: "sum" }]),
      w({ es: "Ocupación por intervalo", en: "Occupancy by interval" }, "line", "interval", [{ metric: "occupancy", agg: "avg" }]),
    ],
  },
  {
    id: "kpi-summary",
    name: { es: "Resumen de KPIs", en: "KPI summary" },
    description: { es: "Cifras clave del periodo filtrado: servicio, ASA, AHT, ocupación y abandono.", en: "Key figures for the filtered period: service, ASA, AHT, occupancy and abandon." },
    widgets: [
      w({ es: "Indicadores clave", en: "Key indicators" }, "kpi", "queue", [
        { metric: "offered", agg: "sum" },
        { metric: "serviceLevel", agg: "avg" },
        { metric: "asa", agg: "avg" },
        { metric: "aht", agg: "avg" },
        { metric: "occupancy", agg: "avg" },
        { metric: "abandonRate", agg: "avg" },
      ]),
    ],
  },
  {
    id: "staffing-by-interval",
    name: { es: "Dotación por intervalo", en: "Staffing by interval" },
    description: { es: "Requeridos, programados y presentes a lo largo del día. Línea: es una tendencia.", en: "Required, scheduled and present staff across the day. Lines show the trend." },
    widgets: [
      w({ es: "Dotación promedio por intervalo", en: "Average staffing by interval" }, "line", "interval", [
        { metric: "requiredStaff", agg: "avg" },
        { metric: "scheduledStaff", agg: "avg" },
        { metric: "actualStaff", agg: "avg" },
      ]),
    ],
  },
  {
    id: "volume-by-queue",
    name: { es: "Volumen por cola", en: "Volume by queue" },
    description: { es: "Ofrecidas, atendidas y abandonadas por cola, apiladas para ver la composición.", en: "Offered, answered and abandoned by queue, stacked to show composition." },
    widgets: [
      w({ es: "Composición del volumen por cola", en: "Volume composition by queue" }, "stacked", "queue", [
        { metric: "answered", agg: "sum" },
        { metric: "abandoned", agg: "sum" },
      ]),
    ],
  },
  {
    id: "service-by-queue",
    name: { es: "Nivel de servicio por cola", en: "Service level by queue" },
    description: { es: "Comparación de nivel de servicio entre colas. Barras: categorías.", en: "Service level compared across queues. Bars: categories." },
    widgets: [
      w({ es: "Nivel de servicio promedio por cola", en: "Average service level by queue" }, "bar", "queue", [{ metric: "serviceLevel", agg: "avg" }]),
    ],
  },
  {
    id: "forecast-vs-actual",
    name: { es: "Pronóstico vs real por día", en: "Forecast vs actual by day" },
    description: { es: "Volumen pronosticado contra real por día, con la diferencia.", en: "Forecast volume against actual by day, with the difference." },
    widgets: [
      w({ es: "Pronóstico vs real", en: "Forecast vs actual" }, "line", "date", [
        { metric: "forecastVolume", agg: "sum" },
        { metric: "actualVolume", agg: "sum" },
      ]),
      w({ es: "Diferencia diaria (real − pronóstico)", en: "Daily difference (actual − forecast)" }, "bar", "date", [{ metric: "volumeDiff", agg: "sum" }]),
    ],
  },
  {
    id: "gap-by-interval",
    name: { es: "Brecha de dotación por intervalo", en: "Staffing gap by interval" },
    description: { es: "Personal faltante frente a lo requerido en cada intervalo.", en: "Staff short of the requirement in each interval." },
    widgets: [
      w({ es: "Faltante promedio por intervalo", en: "Average gap by interval" }, "bar", "interval", [{ metric: "staffGap", agg: "avg" }]),
    ],
  },
  {
    id: "channel-mix",
    name: { es: "Mix de canales", en: "Channel mix" },
    description: { es: "Participación de cada canal en el volumen ofrecido.", en: "Share of each channel in offered volume." },
    widgets: [
      w({ es: "Participación por canal", en: "Share by channel" }, "donut", "channel", [{ metric: "offered", agg: "sum" }]),
    ],
  },
  {
    id: "occupancy-by-interval",
    name: { es: "Ocupación por intervalo", en: "Occupancy by interval" },
    description: { es: "Ocupación y nivel de servicio a lo largo del día.", en: "Occupancy and service level across the day." },
    widgets: [
      w({ es: "Ocupación y nivel de servicio por intervalo", en: "Occupancy and service level by interval" }, "line", "interval", [
        { metric: "occupancy", agg: "avg" },
        { metric: "serviceLevel", agg: "avg" },
      ]),
    ],
  },
  {
    id: "queue-detail-table",
    name: { es: "Detalle por cola (tabla)", en: "Queue detail (table)" },
    description: { es: "Tabla con las métricas operativas por cola, lista para exportar.", en: "Table with operating metrics by queue, ready to export." },
    widgets: [
      w({ es: "Detalle operativo por cola", en: "Operating detail by queue" }, "table", "queue", [
        { metric: "offered", agg: "sum" },
        { metric: "abandonRate", agg: "avg" },
        { metric: "serviceLevel", agg: "avg" },
        { metric: "asa", agg: "avg" },
        { metric: "aht", agg: "avg" },
        { metric: "occupancy", agg: "avg" },
      ]),
    ],
  },
];

export const TEMPLATE_BY_ID: Record<string, TemplateDef> = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));

let seq = 0;
export function newId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function widgetFromTemplate(w: Omit<Widget, "id">): Widget {
  return { ...w, id: newId("w"), metrics: w.metrics.map((m) => ({ ...m })) };
}

export function reportFromTemplate(templateId: string, now = new Date().toISOString()): StudioReport {
  const t = TEMPLATE_BY_ID[templateId];
  if (!t) throw new Error(`Unknown template ${templateId}`);
  return {
    id: newId("r"),
    name: { es: t.name.es, en: t.name.en },
    description: { es: t.description.es, en: t.description.en },
    templateId,
    widgets: t.widgets.map(widgetFromTemplate),
    createdAt: now,
    updatedAt: now,
  };
}

export function blankReport(now = new Date().toISOString()): StudioReport {
  return {
    id: newId("r"),
    name: { es: "Informe sin título", en: "Untitled report" },
    description: "",
    widgets: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function emptyWidget(chart: ChartKind = "bar"): Widget {
  return {
    id: newId("w"),
    title: { es: "Nuevo gráfico", en: "New chart" },
    chart,
    dimension: "queue",
    metrics: [{ metric: "offered", agg: "sum" }],
  };
}

/** Make a widget compatible with its chart kind after the user changes the chart type. */
export function normalizeWidget(widget: Widget): Widget {
  let metrics = widget.metrics.filter((m) => METRIC_BY_ID[m.metric]);
  if (metrics.length === 0) metrics = [{ metric: "offered", agg: "sum" }];
  metrics = metrics.map((m) => {
    const def = METRIC_BY_ID[m.metric];
    return def.aggs.includes(m.agg) ? m : { ...m, agg: def.defaultAgg };
  });
  if (widget.chart === "donut") metrics = metrics.slice(0, 1);
  return { ...widget, metrics };
}

export function validateReport(report: StudioReport): string[] {
  const issues: string[] = [];
  if (report.widgets.length === 0) issues.push("empty");
  for (const wd of report.widgets) {
    if (wd.metrics.length === 0) issues.push(`widget ${wd.id}: no metrics`);
    if (wd.chart === "donut" && wd.metrics.length !== 1) issues.push(`widget ${wd.id}: donut needs one metric`);
  }
  return issues;
}
