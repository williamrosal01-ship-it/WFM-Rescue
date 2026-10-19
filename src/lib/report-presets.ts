// Per-report PDF content: KPI cards, the chart that fits each report, and a summary table.
// Built from the interval rows already filtered by the global filters, so PDF = screen.
import type { IntervalRecord } from "@/lib/types";
import { CHART } from "@/lib/chart-palette";
import { formatValue, type ChartSpec, type KpiCard, type Tone } from "@/lib/pdf-report";
import type { ExportRow } from "@/lib/export";

type Loc = "es" | "en";
type Agg = { s: Record<string, number>; c: Record<string, number> };
const L = (loc: Loc, es: string, en: string) => (loc === "es" ? es : en);

function emptyAgg(): Agg { return { s: {}, c: {} }; }
function add(a: Agg, k: string, v: number | null | undefined) {
  if (v === null || v === undefined || !Number.isFinite(v)) return;
  a.s[k] = (a.s[k] ?? 0) + v;
  a.c[k] = (a.c[k] ?? 0) + 1;
}
function addRecord(a: Agg, r: IntervalRecord) {
  add(a, "rows", 1);
  add(a, "offered", r.offered);
  add(a, "answered", r.answered);
  add(a, "abandoned", r.abandoned);
  add(a, "forecastVolume", r.forecastVolume);
  add(a, "requiredStaff", r.requiredStaff);
  add(a, "scheduledStaff", r.scheduledStaff);
  add(a, "actualStaff", r.actualStaff);
  add(a, "availableStaff", r.availableStaff);
  add(a, "slTarget", r.serviceLevelTarget);
  add(a, "occupancy", r.occupancy);
  // Weighted metrics: store numerator and denominator
  if (r.serviceLevel != null && r.offered != null) { add(a, "slNum", r.serviceLevel * r.offered); add(a, "slDen", r.offered); }
  if (r.actualAht != null && r.answered != null) { add(a, "ahtNum", r.actualAht * r.answered); add(a, "ahtDen", r.answered); }
  if (r.asa != null && r.answered != null) { add(a, "asaNum", r.asa * r.answered); add(a, "asaDen", r.answered); }
  if (r.actualVolume != null && r.forecastVolume != null) {
    add(a, "actPair", r.actualVolume);
    add(a, "fcstPair", r.forecastVolume);
    add(a, "absErr", Math.abs(r.actualVolume - r.forecastVolume));
    add(a, "actVol", r.actualVolume);
  }
  if (r.actualStaff != null && r.scheduledStaff != null) { add(a, "presentPair", r.actualStaff); add(a, "schedPair", r.scheduledStaff); }
  if (r.actualStaff != null && r.occupancy != null) { add(a, "prodH", r.actualStaff * r.occupancy * 0.25); }
  if (r.scheduledStaff != null) { add(a, "paidH", r.scheduledStaff * 0.25); }
}
const sum = (a: Agg, k: string) => a.s[k] ?? 0;
const avg = (a: Agg, k: string) => (a.c[k] ? a.s[k] / a.c[k] : null);
const ratio = (a: Agg, n: string, d: string) => (sum(a, d) > 0 ? sum(a, n) / sum(a, d) : null);
const derived = {
  sl: (a: Agg) => ratio(a, "slNum", "slDen"),
  aht: (a: Agg) => ratio(a, "ahtNum", "ahtDen"),
  asa: (a: Agg) => ratio(a, "asaNum", "asaDen"),
  wape: (a: Agg) => (sum(a, "actPair") > 0 ? sum(a, "absErr") / sum(a, "actPair") : null),
  bias: (a: Agg) => (sum(a, "fcstPair") > 0 ? sum(a, "actPair") / sum(a, "fcstPair") - 1 : null),
  attendance: (a: Agg) => ratio(a, "presentPair", "schedPair"),
  efficiency: (a: Agg) => ratio(a, "prodH", "paidH"),
};

function groupRows(rows: IntervalRecord[], by: "time" | "date" | "queue"): Map<string, Agg> {
  const m = new Map<string, Agg>();
  for (const r of rows) {
    const key = by === "time" ? r.intervalLabel : by === "date" ? r.date : (r.queue ?? "—");
    let a = m.get(key);
    if (!a) { a = emptyAgg(); m.set(key, a); }
    addRecord(a, r);
  }
  const keys = [...m.keys()];
  if (by === "queue") keys.sort((x, y) => sum(m.get(y)!, "offered") - sum(m.get(x)!, "offered"));
  else keys.sort();
  return new Map(keys.slice(0, 16).map((k) => [k, m.get(k)!]));
}

const slTone = (v: number | null, target: number): Tone => (v === null ? "neutral" : v >= target ? "good" : v >= target - 0.1 ? "warn" : "bad");
const pctTone = (v: number | null, good: number, warn: number): Tone => (v === null ? "neutral" : v >= good ? "good" : v >= warn ? "warn" : "bad");

export type PresetResult = { kpis: KpiCard[]; charts: ChartSpec[]; table: ExportRow[]; tableTitle: string };

export function buildPreset(name: string, rows: IntervalRecord[], loc: Loc): PresetResult | null {
  if (rows.length === 0) return null;
  const all = emptyAgg();
  rows.forEach((r) => addRecord(all, r));
  const f = (v: number | null, fmt: "int" | "pct" | "dec1") => formatValue(v, fmt, loc);
  const slAll = derived.sl(all);
  const slTgt = avg(all, "slTarget") ?? 0.8;
  const offeredTotal = sum(all, "offered");
  const answeredTotal = sum(all, "answered");
  const abandonRate = offeredTotal > 0 ? sum(all, "abandoned") / offeredTotal : null;
  const commonKpi = { sl: { label: L(loc, "Nivel de servicio", "Service level"), value: f(slAll, "pct"), note: L(loc, `Objetivo ${Math.round(slTgt * 100)}%`, `Target ${Math.round(slTgt * 100)}%`), tone: slTone(slAll, slTgt) } };

  switch (name) {
    case "dashboard": {
      const g = groupRows(rows, "time");
      const kpis: KpiCard[] = [
        commonKpi.sl,
        { label: L(loc, "Volumen ofrecido", "Offered volume"), value: f(offeredTotal, "int"), note: L(loc, `${f(answeredTotal, "int")} atendidas`, `${f(answeredTotal, "int")} answered`) },
        { label: L(loc, "AHT ponderado", "Weighted AHT"), value: derived.aht(all) === null ? "—" : `${Math.round(derived.aht(all)! / 60)} min`, note: L(loc, "Ponderado por atendidas", "Weighted by answered") },
        { label: L(loc, "Ocupación promedio", "Average occupancy"), value: f(avg(all, "occupancy"), "pct"), note: L(loc, "Objetivo 75%–92%", "Target 75%–92%"), tone: pctTone(avg(all, "occupancy"), 0.75, 0.65) },
        { label: L(loc, "Precisión del pronóstico", "Forecast accuracy"), value: derived.wape(all) === null ? "—" : f(1 - derived.wape(all)!, "pct"), note: L(loc, "1 − WAPE", "1 − WAPE"), tone: pctTone(derived.wape(all) === null ? null : 1 - derived.wape(all)!, 0.9, 0.8) },
        { label: L(loc, "Abandono", "Abandon rate"), value: f(abandonRate, "pct"), tone: abandonRate === null ? "neutral" : abandonRate <= 0.05 ? "good" : abandonRate <= 0.1 ? "warn" : "bad" },
      ];
      const cats = [...g.keys()];
      const charts: ChartSpec[] = [
        { title: L(loc, "Volumen por intervalo", "Volume by interval"), subtitle: L(loc, "Barras: ofrecidas (promedio por intervalo del día). Línea: pronóstico.", "Bars: offered (average per time slot). Line: forecast."), categories: cats, format: "int",
          series: [
            { name: L(loc, "Ofrecidas", "Offered"), color: CHART.actual, values: cats.map((k) => avg(g.get(k)!, "offered")) },
            { name: L(loc, "Pronóstico", "Forecast"), color: CHART.forecast, values: cats.map((k) => avg(g.get(k)!, "forecastVolume")), kind: "line" },
          ] },
        { title: L(loc, "Nivel de servicio por intervalo", "Service level by interval"), subtitle: L(loc, "Línea punteada: objetivo", "Dashed line: target"), categories: cats, format: "pct",
          target: { value: slTgt, label: L(loc, "Objetivo", "Target") },
          series: [{ name: L(loc, "Nivel de servicio", "Service level"), color: CHART.actual, values: cats.map((k) => derived.sl(g.get(k)!)), kind: "line" }] },
      ];
      return { kpis, charts, tableTitle: L(loc, "Resumen por intervalo", "Summary by interval"), table: cats.map((k) => { const a = g.get(k)!; return { [L(loc, "Intervalo", "Interval")]: k, [L(loc, "Ofrecidas (prom.)", "Offered (avg)")]: avg(a, "offered") ?? "", [L(loc, "Nivel de servicio", "Service level")]: derived.sl(a) === null ? "" : `${(derived.sl(a)! * 100).toFixed(1)}%`, [L(loc, "Ocupación", "Occupancy")]: avg(a, "occupancy") === null ? "" : `${(avg(a, "occupancy")! * 100).toFixed(1)}%` }; }) };
    }
    case "intraday": {
      const g = groupRows(rows, "time");
      const cats = [...g.keys()];
      return {
        kpis: [commonKpi.sl, { label: L(loc, "Volumen ofrecido", "Offered volume"), value: f(offeredTotal, "int") }, { label: L(loc, "Atendidas", "Answered"), value: f(answeredTotal, "int") }, { label: L(loc, "Abandono", "Abandon rate"), value: f(abandonRate, "pct") }],
        charts: [
          { title: L(loc, "Atendidas vs ofrecidas por intervalo", "Answered vs offered by interval"), subtitle: L(loc, "Promedio por franja horaria", "Average per time slot"), categories: cats, format: "int",
            series: [{ name: L(loc, "Ofrecidas", "Offered"), color: CHART.forecast, values: cats.map((k) => avg(g.get(k)!, "offered")) }, { name: L(loc, "Atendidas", "Answered"), color: CHART.actual, values: cats.map((k) => avg(g.get(k)!, "answered")) }] },
          { title: L(loc, "Nivel de servicio por intervalo", "Service level by interval"), categories: cats, format: "pct", target: { value: slTgt, label: L(loc, "Objetivo", "Target") },
            series: [{ name: L(loc, "Nivel de servicio", "Service level"), color: CHART.actual, values: cats.map((k) => derived.sl(g.get(k)!)), kind: "line" }] },
        ],
        tableTitle: L(loc, "Resumen por franja", "Summary by time slot"),
        table: cats.map((k) => ({ [L(loc, "Franja", "Slot")]: k, [L(loc, "Ofrecidas (prom.)", "Offered (avg)")]: avg(g.get(k)!, "offered") ?? "", [L(loc, "Atendidas (prom.)", "Answered (avg)")]: avg(g.get(k)!, "answered") ?? "" })),
      };
    }
    case "service-level":
    case "diagnostics":
    case "occupancy": {
      const g = groupRows(rows, "queue");
      const cats = [...g.keys()];
      if (name === "service-level") {
        return {
          kpis: [commonKpi.sl, { label: L(loc, "ASA ponderado", "Weighted ASA"), value: derived.asa(all) === null ? "—" : `${Math.round(derived.asa(all)!)} s` }, { label: L(loc, "Ofrecidas", "Offered"), value: f(offeredTotal, "int") }],
          charts: [
            { title: L(loc, "Nivel de servicio por cola", "Service level by queue"), subtitle: L(loc, "Verde: cumple objetivo · Ámbar: cerca · Rojo: fuera", "Green: meets target · Amber: close · Red: below"), categories: cats, format: "pct", target: { value: slTgt, label: L(loc, "Objetivo", "Target") },
              series: [{ name: L(loc, "Nivel de servicio", "Service level"), color: CHART.actual, values: cats.map((k) => derived.sl(g.get(k)!)) }],
              barColors: cats.map((k) => { const t = slTone(derived.sl(g.get(k)!), slTgt); return t === "good" ? CHART.good : t === "warn" ? CHART.warn : t === "bad" ? CHART.bad : CHART.neutral; }) },
            { title: L(loc, "ASA por cola (segundos)", "ASA by queue (seconds)"), categories: cats, format: "int",
              series: [{ name: "ASA", color: CHART.forecast, values: cats.map((k) => derived.asa(g.get(k)!)) }] },
          ],
          tableTitle: L(loc, "Resumen por cola", "Summary by queue"),
          table: cats.map((k) => { const a = g.get(k)!; return { [L(loc, "Cola", "Queue")]: k, [L(loc, "Ofrecidas", "Offered")]: sum(a, "offered"), [L(loc, "Nivel de servicio", "Service level")]: derived.sl(a) === null ? "" : `${(derived.sl(a)! * 100).toFixed(1)}%`, "ASA (s)": derived.asa(a) === null ? "" : Math.round(derived.asa(a)!) }; }),
        };
      }
      if (name === "occupancy") {
        const gt = groupRows(rows, "time");
        const tc = [...gt.keys()];
        return {
          kpis: [{ label: L(loc, "Ocupación promedio", "Average occupancy"), value: f(avg(all, "occupancy"), "pct"), tone: pctTone(avg(all, "occupancy"), 0.75, 0.65), note: L(loc, "Objetivo 75%–92%", "Target 75%–92%") }, { label: L(loc, "Colas", "Queues"), value: String(cats.length) }, { label: L(loc, "Intervalos", "Intervals"), value: f(rows.length, "int") }],
          charts: [
            { title: L(loc, "Ocupación por intervalo", "Occupancy by interval"), subtitle: L(loc, "Línea punteada: límite superior 92%", "Dashed line: 92% upper limit"), categories: tc, format: "pct", target: { value: 0.92, label: "92%" },
              series: [{ name: L(loc, "Ocupación", "Occupancy"), color: CHART.actual, values: tc.map((k) => avg(gt.get(k)!, "occupancy")), kind: "line" }] },
            { title: L(loc, "Ocupación por cola", "Occupancy by queue"), categories: cats, format: "pct",
              series: [{ name: L(loc, "Ocupación", "Occupancy"), color: CHART.actual, values: cats.map((k) => avg(g.get(k)!, "occupancy")) }],
              barColors: cats.map((k) => { const v = avg(g.get(k)!, "occupancy"); return v === null ? CHART.neutral : v > 0.92 ? CHART.bad : v < 0.65 ? CHART.warn : CHART.good; }) },
          ],
          tableTitle: L(loc, "Resumen por cola", "Summary by queue"),
          table: cats.map((k) => ({ [L(loc, "Cola", "Queue")]: k, [L(loc, "Ocupación", "Occupancy")]: avg(g.get(k)!, "occupancy") === null ? "" : `${(avg(g.get(k)!, "occupancy")! * 100).toFixed(1)}%` })),
        };
      }
      // diagnostics
      return {
        kpis: [{ label: L(loc, "Intervalos", "Intervals"), value: f(rows.length, "int") }, { label: L(loc, "Ofrecidas", "Offered"), value: f(offeredTotal, "int") }, commonKpi.sl],
        charts: [{ title: L(loc, "Volumen ofrecido por cola", "Offered volume by queue"), categories: cats, format: "int", series: [{ name: L(loc, "Ofrecidas", "Offered"), color: CHART.actual, values: cats.map((k) => sum(g.get(k)!, "offered")) }] }],
        tableTitle: L(loc, "Resumen por cola", "Summary by queue"),
        table: cats.map((k) => ({ [L(loc, "Cola", "Queue")]: k, [L(loc, "Intervalos", "Intervals")]: sum(g.get(k)!, "rows"), [L(loc, "Ofrecidas", "Offered")]: sum(g.get(k)!, "offered") })),
      };
    }
    case "staffing":
    case "capacity": {
      const g = groupRows(rows, "time");
      const cats = [...g.keys()];
      return {
        kpis: [
          { label: L(loc, "Requerido promedio", "Average required"), value: f(avg(all, "requiredStaff"), "dec1"), note: L(loc, "Agentes por intervalo", "Agents per interval") },
          { label: L(loc, "Programado promedio", "Average scheduled"), value: f(avg(all, "scheduledStaff"), "dec1") },
          { label: L(loc, "Presente promedio", "Average present"), value: f(avg(all, "actualStaff"), "dec1"), tone: avg(all, "actualStaff") !== null && avg(all, "requiredStaff") !== null && avg(all, "actualStaff")! >= avg(all, "requiredStaff")! ? "good" : "warn" },
        ],
        charts: [{ title: L(loc, "Requerido, programado y presente por intervalo", "Required, scheduled and present by interval"), subtitle: L(loc, "Promedio por franja horaria", "Average per time slot"), categories: cats, format: "dec1",
          series: [
            { name: L(loc, "Requerido", "Required"), color: CHART.target, values: cats.map((k) => avg(g.get(k)!, "requiredStaff")), kind: "line" },
            { name: L(loc, "Programado", "Scheduled"), color: CHART.forecast, values: cats.map((k) => avg(g.get(k)!, "scheduledStaff")), kind: "line" },
            { name: L(loc, "Presente", "Present"), color: CHART.actual, values: cats.map((k) => avg(g.get(k)!, "actualStaff")), kind: "line" },
          ] }],
        tableTitle: L(loc, "Resumen por franja", "Summary by time slot"),
        table: cats.map((k) => { const a = g.get(k)!; return { [L(loc, "Franja", "Slot")]: k, [L(loc, "Requerido", "Required")]: avg(a, "requiredStaff") ?? "", [L(loc, "Programado", "Scheduled")]: avg(a, "scheduledStaff") ?? "", [L(loc, "Presente", "Present")]: avg(a, "actualStaff") ?? "" }; }),
      };
    }
    case "adherence":
    case "attendance": {
      const g = groupRows(rows, "date");
      const cats = [...g.keys()];
      const isAtt = name === "attendance";
      const metric = (a: Agg) => (isAtt ? derived.attendance(a) : ratio(a, "presentPair", "schedPair"));
      const target = isAtt ? 0.97 : 0.95;
      return {
        kpis: [
          { label: isAtt ? L(loc, "Asistencia", "Attendance") : L(loc, "Adherencia", "Adherence"), value: f(metric(all), "pct"), tone: pctTone(metric(all), target, target - 0.05), note: L(loc, `Objetivo ${Math.round(target * 100)}%`, `Target ${Math.round(target * 100)}%`) },
          { label: L(loc, "Programados", "Scheduled"), value: f(sum(all, "schedPair"), "int") },
          { label: L(loc, "Presentes", "Present"), value: f(sum(all, "presentPair"), "int") },
        ],
        charts: [{ title: isAtt ? L(loc, "Asistencia por día", "Attendance by day") : L(loc, "Adherencia por día", "Adherence by day"), subtitle: L(loc, `Línea punteada: objetivo ${Math.round(target * 100)}%`, `Dashed line: ${Math.round(target * 100)}% target`), categories: cats, format: "pct", target: { value: target, label: L(loc, "Objetivo", "Target") },
          series: [{ name: isAtt ? L(loc, "Asistencia", "Attendance") : L(loc, "Adherencia", "Adherence"), color: CHART.actual, values: cats.map((k) => metric(g.get(k)!)) }],
          barColors: cats.map((k) => { const v = metric(g.get(k)!); return v === null ? CHART.neutral : v >= target ? CHART.good : v >= target - 0.05 ? CHART.warn : CHART.bad; }) }],
        tableTitle: L(loc, "Resumen por día", "Summary by day"),
        table: cats.map((k) => { const a = g.get(k)!; const m = metric(a); return { [L(loc, "Fecha", "Date")]: k, [L(loc, "Programados", "Scheduled")]: sum(a, "schedPair"), [L(loc, "Presentes", "Present")]: sum(a, "presentPair"), [isAtt ? L(loc, "Asistencia", "Attendance") : L(loc, "Adherencia", "Adherence")]: m === null ? "" : `${(m * 100).toFixed(1)}%` }; }),
      };
    }
    case "forecast": {
      const g = groupRows(rows, "time");
      const cats = [...g.keys()];
      const errOf = (a: Agg) => (sum(a, "fcstPair") > 0 ? (sum(a, "actPair") - sum(a, "fcstPair")) / sum(a, "fcstPair") : null);
      const acc = derived.wape(all) === null ? null : 1 - derived.wape(all)!;
      return {
        kpis: [
          { label: L(loc, "Precisión (1 − WAPE)", "Accuracy (1 − WAPE)"), value: f(acc, "pct"), tone: pctTone(acc, 0.9, 0.8), note: L(loc, "Objetivo ≥ 90%", "Target ≥ 90%") },
          { label: L(loc, "Sesgo", "Bias"), value: f(derived.bias(all), "pct"), note: L(loc, "Positivo: real por encima", "Positive: actual above"), tone: Math.abs(derived.bias(all) ?? 0) <= 0.05 ? "good" : "warn" },
          { label: L(loc, "Pronóstico", "Forecast"), value: f(sum(all, "fcstPair"), "int") },
          { label: L(loc, "Real", "Actual"), value: f(sum(all, "actPair"), "int") },
        ],
        charts: [
          { title: L(loc, "Pronóstico vs real por intervalo", "Forecast vs actual by interval"), subtitle: L(loc, "Índigo: pronóstico · Turquesa: real", "Indigo: forecast · Teal: actual"), categories: cats, format: "int",
            series: [
              { name: L(loc, "Pronóstico", "Forecast"), color: CHART.forecast, values: cats.map((k) => avg(g.get(k)!, "forecastVolume")), kind: "line" },
              { name: L(loc, "Real", "Actual"), color: CHART.actual, values: cats.map((k) => avg(g.get(k)!, "actPair")), kind: "line" },
            ] },
          { title: L(loc, "Error % por intervalo", "Error % by interval"), subtitle: L(loc, "Verde: dentro de ±10% · Morado: real por encima (+10%) · Ámbar: real por debajo (−10%)", "Green: within ±10% · Purple: actual above (+10%) · Amber: actual below (−10%)"), categories: cats, format: "pct",
            series: [{ name: "Error %", color: CHART.good, values: cats.map((k) => errOf(g.get(k)!)) }],
            barColors: cats.map((k) => { const e = errOf(g.get(k)!); return e === null ? CHART.neutral : e > 0.1 ? CHART.above : e < -0.1 ? CHART.warn : CHART.good; }) },
        ],
        tableTitle: L(loc, "Resumen por intervalo", "Summary by interval"),
        table: cats.map((k) => { const a = g.get(k)!; const e = errOf(a); return { [L(loc, "Intervalo", "Interval")]: k, [L(loc, "Pronóstico", "Forecast")]: sum(a, "fcstPair"), [L(loc, "Real", "Actual")]: sum(a, "actPair"), [L(loc, "Error %", "Error %")]: e === null ? "" : `${(e * 100).toFixed(1)}%` }; }),
      };
    }
    case "nlh": {
      const g = groupRows(rows, "date");
      const cats = [...g.keys()];
      const eff = derived.efficiency(all);
      return {
        kpis: [
          { label: L(loc, "Eficiencia NLH", "NLH efficiency"), value: f(eff, "pct"), tone: pctTone(eff, 0.75, 0.6), note: L(loc, "Productivas / pagadas", "Productive / paid") },
          { label: L(loc, "Horas productivas", "Productive hours"), value: f(sum(all, "prodH"), "int") },
          { label: L(loc, "Horas pagadas", "Paid hours"), value: f(sum(all, "paidH"), "int") },
        ],
        charts: [{ title: L(loc, "Horas productivas vs pagadas por día", "Productive vs paid hours by day"), subtitle: L(loc, "Barras apiladas: productivas + no productivas", "Stacked bars: productive + non-productive"), categories: cats, format: "int", stacked: true,
          series: [
            { name: L(loc, "Productivas", "Productive"), color: CHART.actual, values: cats.map((k) => sum(g.get(k)!, "prodH")) },
            { name: L(loc, "No productivas", "Non-productive"), color: CHART.neutral, values: cats.map((k) => Math.max(0, sum(g.get(k)!, "paidH") - sum(g.get(k)!, "prodH"))) },
          ] }],
        tableTitle: L(loc, "Resumen por día", "Summary by day"),
        table: cats.map((k) => { const a = g.get(k)!; const e = derived.efficiency(a); return { [L(loc, "Fecha", "Date")]: k, [L(loc, "Productivas (h)", "Productive (h)")]: Math.round(sum(a, "prodH")), [L(loc, "Pagadas (h)", "Paid (h)")]: Math.round(sum(a, "paidH")), [L(loc, "Eficiencia", "Efficiency")]: e === null ? "" : `${(e * 100).toFixed(1)}%` }; }),
      };
    }
    case "data-health": {
      const g = groupRows(rows, "date");
      const cats = [...g.keys()];
      return {
        kpis: [{ label: L(loc, "Intervalos", "Intervals"), value: f(rows.length, "int") }, { label: L(loc, "Días", "Days"), value: String(cats.length) }, { label: L(loc, "Colas", "Queues"), value: String(new Set(rows.map((r) => r.queue ?? "—")).size) }],
        charts: [{ title: L(loc, "Intervalos por día", "Intervals per day"), categories: cats, format: "int", series: [{ name: L(loc, "Intervalos", "Intervals"), color: CHART.actual, values: cats.map((k) => sum(g.get(k)!, "rows")) }] }],
        tableTitle: L(loc, "Resumen por día", "Summary by day"),
        table: cats.map((k) => ({ [L(loc, "Fecha", "Date")]: k, [L(loc, "Intervalos", "Intervals")]: sum(g.get(k)!, "rows") })),
      };
    }
    default:
      return null;
  }
}
