"use client";
import { IntervalExport } from "@/components/interval-export";
import { useTx } from "@/lib/tx";
import { useWfmStore, selectFilteredIntervals } from "@/lib/store";
import { KpiCard, Card, SectionHeader, Chip, EmptyState, Button, Callout } from "@/components/ui";
import { FilterBar } from "@/components/filters";
import { aggregateIntervals, sum, wtdAvg } from "@/lib/wfm";
import { fmtPct, fmtInt, fmtSec, fmtNum } from "@/lib/formatters";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Scatter,
  ReferenceLine,
  Cell,
} from "recharts";
import Link from "next/link";
import { TrendingUp, TrendingDown, AlertTriangle, Upload, Target, ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { ShareReportButton } from "@/components/share-report-button";
import { buildForecastContent } from "@/lib/report-snapshot";

export default function ForecastPage() {
  const tx = useTx();
  const { intervals, filters } = useWfmStore();
  const rows = useMemo(() => selectFilteredIntervals(intervals, filters), [intervals, filters]);
  const kpis = useMemo(() => aggregateIntervals(rows), [rows]);

  // By interval
  const byInterval = useMemo(() => {
    const map = new Map<string, { label: string; forecast: number; actual: number; fctAht: number; actAht: number }>();
    for (const r of rows) {
      const key = r.intervalLabel;
      const cur = map.get(key) ?? { label: key, forecast: 0, actual: 0, fctAht: [], fctW: [], actAht: [], actW: [] } as never;
      cur.forecast += r.forecastVolume ?? 0;
      cur.actual += r.actualVolume ?? r.offered ?? 0;
      if (typeof r.forecastAht === "number") {
        (cur as any).fctAht.push(r.forecastAht);
        (cur as any).fctW.push(r.forecastVolume ?? r.actualVolume ?? 1);
      }
      if (typeof r.actualAht === "number") {
        (cur as any).actAht.push(r.actualAht);
        (cur as any).actW.push(r.actualVolume ?? r.offered ?? 1);
      }
      map.set(key, cur);
    }
    return [...map.values()].map((v: any) => ({
      label: v.label,
      forecast: v.forecast,
      actual: v.actual,
      errorPct: v.forecast > 0 && v.actual > 0 ? (v.actual - v.forecast) / v.forecast : null,
      fctAht: v.fctW.length > 0 ? v.fctAht.reduce((a: number, b: number, i: number) => a + b * v.fctW[i], 0) / v.fctW.reduce((a: number, b: number) => a + b, 0) : null,
      actAht: v.actW.length > 0 ? v.actAht.reduce((a: number, b: number, i: number) => a + b * v.actW[i], 0) / v.actW.reduce((a: number, b: number) => a + b, 0) : null,
    }));
  }, [rows]);

  // By queue
  const byQueue = useMemo(() => {
    const map = new Map<string, { queue: string; forecast: number; actual: number; fctAht: number[]; actAht: number[]; wf: number[]; wa: number[] }>();
    for (const r of rows) {
      const key = r.queue ?? "—";
      const cur = map.get(key) ?? { queue: key, forecast: 0, actual: 0, fctAht: [], actAht: [], wf: [], wa: [] };
      cur.forecast += r.forecastVolume ?? 0;
      cur.actual += r.actualVolume ?? r.offered ?? 0;
      if (typeof r.forecastAht === "number") { cur.fctAht.push(r.forecastAht); cur.wf.push(r.forecastVolume ?? r.actualVolume ?? 1); }
      if (typeof r.actualAht === "number") { cur.actAht.push(r.actualAht); cur.wa.push(r.actualVolume ?? r.offered ?? 1); }
      map.set(key, cur);
    }
    return [...map.values()].map((v) => {
      const fctAht = v.wf.length > 0 ? v.fctAht.reduce((a, b, i) => a + b * v.wf[i]!, 0) / v.wf.reduce((a, b) => a + b, 0) : null;
      const actAht = v.wa.length > 0 ? v.actAht.reduce((a, b, i) => a + b * v.wa[i]!, 0) / v.wa.reduce((a, b) => a + b, 0) : null;
      const wape = v.forecast > 0 && v.actual > 0 ? Math.abs(v.actual - v.forecast) / v.actual : null;
      const bias = v.forecast > 0 && v.actual > 0 ? (v.actual - v.forecast) / v.forecast : null;
      return { queue: v.queue, forecast: v.forecast, actual: v.actual, wape, bias, fctAht, actAht, ahtError: fctAht != null && actAht != null ? (actAht - fctAht) / fctAht : null };
    });
  }, [rows]);

  const bias = kpis.totalForecastVolume > 0 && kpis.totalOffered > 0 ? (kpis.totalOffered - kpis.totalForecastVolume) / kpis.totalForecastVolume : null;
  const hasForecast = rows.some((r) => typeof r.forecastVolume === "number");

  return (
    <div>
      <SectionHeader
        title={tx("Pronóstico vs Real", "Forecast vs Actual")}
        description={tx("Precisión por WAPE (error porcentual absoluto ponderado) y sesgo direccional. Identifica si tu pronóstico sobreestima o subestima, y en qué intervalos.", "Accuracy by WAPE (Weighted Absolute Percentage Error) and directional bias. Shows whether your forecast over- or under-estimates, and where.")}
        actions={<div className="flex flex-wrap items-center justify-end gap-2"><ShareReportButton title={tx("Pronóstico vs Real", "Forecast vs Actual")} getContent={() => buildForecastContent(rows, tx("es", "en") as "es" | "en")} /><IntervalExport rows={rows} name="forecast" />{
          <Link href="/app/import">
            <Button variant="accent" size="sm"><Upload className="h-3.5 w-3.5" /> {tx("Importar pronóstico", "Import forecast")}</Button>
          </Link>
        }</div>}
      />
      <FilterBar />

      {!hasForecast ? (
        <Card>
          <EmptyState
            icon={<Target className="h-5 w-5" />}
            title={tx("No hay datos de pronóstico en el conjunto actual", "No forecast data in the current dataset")}
            description={tx("Importa un archivo con volumen pronosticado y/o AHT pronosticado para comparar. Los datos demo incluyen forecast con sesgo intencional para demostrar el análisis.", "Import a file with forecast volume and/or forecast AHT to compare. The demo data includes a forecast with an intentional bias to demonstrate the analysis.")}
            action={<Link href="/app/import"><Button variant="accent">{tx("Importar datos", "Import data")}</Button></Link>}
          />
        </Card>
      ) : (
        <>
          {bias != null && bias > 0.05 && (
            <Callout variant="warning" title={tx("Sesgo agregado: subestimación", "Aggregate bias: under-estimation")} className="mb-4">
              {tx("El volumen real es", "Actual volume is")} {fmtPct(bias)} {tx("mayor que lo pronosticado.", "higher than forecast.")} {tx("El plan se quedó corto. Considera un repronóstico intradía para los picos.", "The plan fell short. Consider an intraday reforecast for peaks.")}
            </Callout>
          )}
          {bias != null && bias < -0.05 && (
            <Callout variant="warning" title={tx("Sesgo agregado: sobreestimación", "Aggregate bias: overestimation")} className="mb-4">
              {tx("El volumen real es", "Actual volume is")} {fmtPct(Math.abs(bias))} {tx("menor que lo pronosticado.", "lower than forecast.")} Hay posible sobre-staffing.
            </Callout>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <KpiCard
              label={tx("Precisión del pronóstico (1 − WAPE)", "Forecast accuracy (1 − WAPE)")}
              value={fmtPct(kpis.forecastAccuracy)}
              sub={kpis.absPercentError != null ? `WAPE ${fmtPct(kpis.absPercentError)}` : tx("Sin datos", "No data")}
              tone={kpis.forecastAccuracy != null && kpis.forecastAccuracy >= 0.9 ? "good" : kpis.forecastAccuracy != null && kpis.forecastAccuracy >= 0.8 ? "warn" : "bad"}
              target="≥ 90%"
              icon={<Target className="h-4 w-4" />}
            />
            <KpiCard
              label={tx("Sesgo (bias)", "Bias")}
              value={bias == null ? "—" : fmtPct(bias, 1)}
              sub={bias == null ? "" : bias > 0 ? tx("Subestima (real > pronóstico)", "Underestimates (actual > forecast)") : bias < 0 ? tx("Sobreestima", "Overestimates") : tx("Neutro", "Neutral")}
              tone={bias == null ? "default" : bias > 0.08 ? "bad" : bias < -0.08 ? "bad" : "good"}
              icon={bias != null && bias > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            />
            <KpiCard
              label={tx("Volumen pronosticado", "Forecast volume")}
              value={fmtInt(kpis.totalForecastVolume)}
              sub={`${fmtInt(kpis.totalOffered)} ${tx("real", "actual")} · ${tx("dif.", "diff")} ${fmtPct(bias, 1)}`}
            />
            <KpiCard
              label={tx("AHT real vs pronóstico", "Actual vs forecast AHT")}
              value={
                <span>
                  {fmtSec(kpis.weightedAht)}
                  <span className="text-sm font-normal text-[var(--text-tertiary)]"> / {fmtSec(rows.length > 0 ? wtdAvg(rows.map(r => r.forecastAht), rows.map(r => r.forecastVolume ?? r.actualVolume ?? 1)) : null)}</span>
                </span>
              }
              sub={tx("Ponderado por volumen", "Volume-weighted")}
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card
              title={tx("Volumen por intervalo", "Volume by interval")}
              subtitle={tx("Índigo: pronóstico; Turquesa: real", "Indigo: forecast; Teal: actual")}
              className="lg:col-span-2"
            >
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={byInterval} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" style={{ stroke: "var(--border-subtle)" }} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} style={{ stroke: "var(--border-default)" }} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} style={{ stroke: "var(--border-default)" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
                    <Bar dataKey="actual" style={{ fill: "var(--c-actual)" }} fillOpacity={0.5} radius={[3, 3, 0, 0]} name={tx("Real", "Actual")} />
                    <Line dataKey="forecast" style={{ stroke: "var(--c-forecast)" }} strokeWidth={2.2} dot={false} name={tx("Pronóstico", "Forecast")} />
                    <ReferenceLine y={0} style={{ stroke: "var(--border-default)" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title={tx("Error % por intervalo", "Error % by interval")} subtitle={tx("Verde: dentro de ±10% · Morado: real por encima del pronóstico (+10%) · Ámbar: real por debajo (−10%)", "Green: within ±10% · Purple: actual above forecast (+10%) · Amber: actual below forecast (−10%)")}>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={byInterval} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" style={{ stroke: "var(--border-subtle)" }} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} style={{ stroke: "var(--border-default)" }} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} style={{ stroke: "var(--border-default)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                    <Tooltip
                      contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: unknown) => fmtPct(Number(v), 1)}
                    />
                    <ReferenceLine y={0} style={{ stroke: "var(--border-default)" }} />
                    <ReferenceLine y={0.1} style={{ stroke: "var(--c-warn)" }} strokeDasharray="3 3" />
                    <ReferenceLine y={-0.1} style={{ stroke: "var(--c-warn)" }} strokeDasharray="3 3" />
                    <Bar dataKey="errorPct" name="Error %" radius={[3, 3, 0, 0]}>
                      {byInterval.map((v, i) => (
                        <Cell key={i} fill={v.errorPct == null ? "#94a3b8" : v.errorPct > 0.1 ? "#a855f7" : v.errorPct < -0.1 ? "#f59e0b" : "#10b981"} />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card title={tx("Análisis por cola", "Analysis by queue")} subtitle={tx("Sesgo y WAPE por cola para identificar dónde el modelo necesita reentrenamiento", "Bias and WAPE by queue to identify where the model needs retraining")} className="mt-4">
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                    <th className="text-left px-5 py-2 font-semibold">{tx("Cola", "Queue")}</th>
                    <th className="text-right px-3 py-2 font-semibold">{tx("Pronóstico", "Forecast")}</th>
                    <th className="text-right px-3 py-2 font-semibold">{tx("Real", "Actual")}</th>
                    <th className="text-right px-3 py-2 font-semibold">WAPE</th>
                    <th className="text-right px-3 py-2 font-semibold">{tx("Sesgo", "Bias")}</th>
                    <th className="text-right px-3 py-2 font-semibold">{tx("AHT pronóstico", "AHT forecast")}</th>
                    <th className="text-right px-3 py-2 font-semibold">{tx("AHT real", "Actual AHT")}</th>
                    <th className="text-right px-5 py-2 font-semibold">{tx("Estado", "Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {byQueue.map((q) => {
                    const good = q.wape == null || q.wape < 0.1;
                    return (
                      <tr key={q.queue} className="tbl-row tbl-row-stripe border-b border-[var(--border-subtle)] last:border-0">
                        <td className="px-5 py-2 font-medium">{q.queue}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtInt(q.forecast)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtInt(q.actual)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtPct(q.wape)}</td>
                        <td className={`px-3 py-2 text-right tabular-nums font-medium ${q.bias != null && q.bias > 0.1 ? "text-[var(--danger-solid)]" : q.bias != null && q.bias < -0.1 ? "text-[var(--info-solid)]" : "text-[var(--success-solid)]"}`}>
                          {q.bias == null ? "—" : `${q.bias > 0 ? "+" : ""}${fmtPct(q.bias, 1)}`}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtSec(q.fctAht)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtSec(q.actAht)}</td>
                        <td className="px-5 py-2 text-right">
                          <Chip variant={good ? "success" : q.wape && q.wape < 0.2 ? "warning" : "danger"}>
                            {good ? tx("Aceptable", "Acceptable") : q.wape && q.wape < 0.2 ? tx("Revisar", "Review") : tx("Crítico", "Critical")}
                          </Chip>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 px-5 text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" /> {tx("WAPE mide error absoluto ponderado; es más robusto que MAPE porque no infla errores en intervalos de bajo volumen.", "WAPE measures weighted absolute error; it is more robust than MAPE because it does not inflate errors in low-volume intervals.")}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
