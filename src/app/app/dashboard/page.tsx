"use client";
import { IntervalExport } from "@/components/interval-export";
import { useTx } from "@/lib/tx";
import { useWfmStore, selectFilteredIntervals } from "@/lib/store";
import { KpiCard, Card, SectionHeader, Chip, Callout, Button } from "@/components/ui";
import { FilterBar } from "@/components/filters";
import { ChartGradients, tooltipStyle, gridProps, tickStyle } from "@/components/charts";
import { aggregateIntervals } from "@/lib/wfm";
import { fmtPct, fmtInt, fmtSec, fmtCurrency } from "@/lib/formatters";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend, BarChart, Bar, ComposedChart } from "recharts";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  Gauge,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { ShareReportButton } from "@/components/share-report-button";
import { buildDashboardContent } from "@/lib/report-snapshot";

export default function DashboardPage() {
  const tx = useTx();
  const { intervals, filters, diagnostics, dataHealth } = useWfmStore();
  const rows = useMemo(() => selectFilteredIntervals(intervals, filters), [intervals, filters]);
  const kpis = useMemo(() => aggregateIntervals(rows), [rows]);

  // Group by interval for chart
  const byInterval = useMemo(() => {
    const map = new Map<string, { label: string; sl: number; asa: number; offered: number; required: number; scheduled: number; actual: number; aht: number }>();
    for (const r of rows) {
      const key = r.intervalLabel;
      const cur = map.get(key) ?? { label: key, sl: 0, asa: 0, offered: 0, required: 0, scheduled: 0, actual: 0, aht: 0, slCount: 0, asaCount: 0, ahtCount: 0, ahtW: 0 } as never;
      cur.offered += r.offered ?? r.actualVolume ?? 0;
      cur.required += r.requiredStaff ?? 0;
      cur.scheduled += r.scheduledStaff ?? 0;
      cur.actual += r.actualStaff ?? 0;
      if (typeof r.serviceLevel === "number") { cur.sl += r.serviceLevel; (cur as any).slCount += 1; }
      if (typeof r.asa === "number") { cur.asa += r.asa; (cur as any).asaCount += 1; }
      if (typeof r.actualAht === "number") {
        cur.aht += r.actualAht * (r.actualVolume ?? r.offered ?? 1);
        (cur as any).ahtW += (r.actualVolume ?? r.offered ?? 0);
      }
      map.set(key, cur);
    }
    return [...map.values()].map((v) => ({
      ...v,
      sl: (v as any).slCount > 0 ? v.sl / (v as any).slCount : null,
      asa: (v as any).asaCount > 0 ? v.asa / (v as any).asaCount : null,
      aht: (v as any).ahtW > 0 ? v.aht / (v as any).ahtW : null,
      gap: v.actual - v.required,
    }));
  }, [rows]);

  // Group by queue
  const byQueue = useMemo(() => {
    const map = new Map<string, { queue: string; offered: number; answered: number; abandoned: number; slTotal: number; slN: number; ahtW: number; ahtN: number; required: number; actual: number }>();
    for (const r of rows) {
      const key = r.queue ?? "—";
      const cur = map.get(key) ?? { queue: key, offered: 0, answered: 0, abandoned: 0, slTotal: 0, slN: 0, ahtW: 0, ahtN: 0, required: 0, actual: 0 };
      cur.offered += r.offered ?? r.actualVolume ?? 0;
      cur.answered += r.answered ?? r.actualVolume ?? 0;
      cur.abandoned += r.abandoned ?? 0;
      cur.required += r.requiredStaff ?? 0;
      cur.actual += r.actualStaff ?? 0;
      if (typeof r.serviceLevel === "number") { cur.slTotal += r.serviceLevel; cur.slN += 1; }
      if (typeof r.actualAht === "number") {
        const w = r.actualVolume ?? r.offered ?? 1;
        cur.ahtW += r.actualAht * w;
        cur.ahtN += w;
      }
      map.set(key, cur);
    }
    return [...map.values()].map((v) => ({
      ...v,
      sl: v.slN > 0 ? v.slTotal / v.slN : null,
      aht: v.ahtN > 0 ? v.ahtW / v.ahtN : null,
      abandonRate: v.offered > 0 ? v.abandoned / v.offered : null,
      gap: v.actual - v.required,
    })).sort((a, b) => b.offered - a.offered);
  }, [rows]);

  const criticalDiags = diagnostics.filter((d) => d.severity === "critical" || d.severity === "high");

  const slTone = kpis.serviceLevel == null ? "default" : kpis.serviceLevel >= 0.8 ? "good" : kpis.serviceLevel >= 0.7 ? "warn" : "bad";
  const occTone = kpis.occupancy == null ? "default" : kpis.occupancy < 0.92 && kpis.occupancy > 0.75 ? "good" : kpis.occupancy >= 0.95 ? "bad" : "warn";
  const staffGapTone = kpis.staffingGap >= 0 ? "good" : kpis.staffingGap > -3 ? "warn" : "bad";
  const forecastTone = kpis.forecastAccuracy == null ? "default" : kpis.forecastAccuracy >= 0.9 ? "good" : kpis.forecastAccuracy >= 0.8 ? "warn" : "bad";

  return (
    <div>
      <SectionHeader
        title={tx("Dashboard operativo", "Operations dashboard")}
        description={tx("Vista consolidada del día. Todos los KPIs se calculan con las fórmulas documentadas y responden a los filtros.", "Consolidated daily view. All KPIs are calculated with the documented formulas and respond to the filters.")}
        actions={<div className="flex flex-wrap items-center justify-end gap-2"><ShareReportButton title={tx("Dashboard operativo", "Operations dashboard")} getContent={() => buildDashboardContent(rows, tx("es", "en") as "es" | "en")} /><IntervalExport rows={rows} name="dashboard" />{
          <>
            <Link href="/app/intraday">
              <Button variant="accent" size="sm">
                <Activity className="h-3.5 w-3.5" /> {tx("Vista intradía", "Intraday view")}
              </Button>
            </Link>
            <Link href="/app/diagnostics">
              <Button variant="secondary" size="sm">
                <AlertTriangle className="h-3.5 w-3.5" /> {tx("Ver diagnósticos", "View diagnostics")}
              </Button>
            </Link>
          </>
        }</div>}
      />

      <FilterBar />

      {dataHealth && dataHealth.score < 70 && (
        <Callout variant="warning" title="Calidad de datos por debajo del umbral" className="mb-4">
          {tx("El puntaje de calidad del conjunto de datos activo es", "The active dataset quality score is")} <strong>{dataHealth.score}/100</strong>. {tx("Algunas métricas pueden no ser confiables.", "Some metrics may not be reliable.")}{" "}
          <Link href="/app/data-health" className="underline font-medium">{tx("Revisar detalles →", "Review details →")}</Link>
        </Callout>
      )}

      {criticalDiags.length > 0 && (
        <Callout variant="danger" title={`${criticalDiags.length} hallazgo${criticalDiags.length > 1 ? "s" : ""} de alto impacto`} className="mb-4">
          {criticalDiags.slice(0, 2).map((d) => d.title).join(" · ")}{" "}
          <Link href="/app/diagnostics" className="underline font-medium">{tx("Ir a diagnósticos →", "Go to diagnostics →")}</Link>
        </Callout>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <KpiCard
          label={tx("Nivel de servicio", "Service Level")}
          value={fmtPct(kpis.serviceLevel)}
          sub={kpis.asa != null ? `ASA ${fmtSec(kpis.asa)}` : tx("Sin datos de SL", "No SL data")}
          tone={slTone}
          target={tx("≥ 80% en 20s", "≥ 80% in 20s")}
          icon={<Gauge className="h-4 w-4" />}
        />
        <KpiCard
          label={tx("Volumen (ofrecido)", "Volume (offered)")}
          value={fmtInt(kpis.totalOffered)}
          sub={`${fmtInt(kpis.totalAnswered)} ${tx("atendidas", "answered")} · ${fmtPct(kpis.totalOffered > 0 ? kpis.totalAbandoned / kpis.totalOffered : null)} ${tx("abandono", "abandonment")}`}
          icon={<Activity className="h-4 w-4" />}
        />
        <KpiCard
          label={tx("AHT ponderado", "Weighted AHT")}
          value={fmtSec(kpis.weightedAht)}
          sub={tx("Ponderado por volumen", "Volume-weighted")}
          icon={<Clock className="h-4 w-4" />}
        />
        <KpiCard
          label={tx("Ocupación", "Occupancy")}
          value={fmtPct(kpis.occupancy)}
          sub={kpis.occupancy != null && kpis.occupancy > 0.92 ? tx("Riesgo de burnout", "Burnout risk") : tx("En rango", "In range")}
          tone={occTone}
          target="75% – 92%"
          icon={<Users className="h-4 w-4" />}
        />
        <KpiCard
          label={tx("Brecha de staffing (suma)", "Staffing gap (sum)")}
          value={
            <span className={kpis.staffingGap < 0 ? "text-[var(--danger-solid)]" : "text-[var(--success-solid)]"}>
              {rows.length === 0 ? "—" : `${kpis.staffingGap > 0 ? "+" : ""}${fmtInt(kpis.staffingGap)}`}
            </span>
          }
          sub={kpis.staffingGap < 0 ? tx("Suma neta de sub-dotación", "Net sum of under-staffing") : kpis.staffingGap > 0 ? tx("Suma neta de sobre-dotación", "Net sum of over-staffing") : tx("Equilibrado", "Balanced")}
          tone={staffGapTone}
          icon={<Users className="h-4 w-4" />}
        />
        <KpiCard
          label={tx("Precisión del pronóstico", "Forecast accuracy")}
          value={fmtPct(kpis.forecastAccuracy)}
          sub={kpis.absPercentError != null ? `WAPE ${fmtPct(kpis.absPercentError)}` : tx("Sin forecast", "No forecast")}
          tone={forecastTone}
          target="≥ 90%"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card
          title={tx("Volumen y dotación por intervalo", "Volume and staffing by interval")}
          subtitle={tx("Agregado en 15-min. Barras = volumen ofrecido; líneas = agentes.", "Aggregated in 15-min. Bars = offered volume; lines = agents.")}
          className="lg:col-span-2"
          action={<Chip variant="neutral">{rows.length} {tx("intervalos", "intervals")}</Chip>}
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={byInterval} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <ChartGradients />
                <CartesianGrid {...gridProps} />
                <XAxis
                  dataKey="label"
                  tick={tickStyle}
                  style={{ stroke: "var(--border-default)" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis yAxisId="left" tick={tickStyle} style={{ stroke: "var(--border-default)" }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={tickStyle} style={{ stroke: "var(--border-default)" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "var(--text-primary)", fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
                <Bar yAxisId="left" dataKey="offered" style={{ fill: "var(--c-actual)" }} radius={[3, 3, 0, 0]} name={tx("Ofrecidos", "Offered")} fillOpacity={0.3} />
                <Line yAxisId="right" dataKey="required" style={{ stroke: "var(--c-required)" }} strokeWidth={1.8} dot={false} name={tx("Requeridos", "Required")} strokeDasharray="4 3" />
                <Line yAxisId="right" dataKey="scheduled" style={{ stroke: "var(--c-scheduled)" }} strokeWidth={1.8} dot={false} name={tx("Programados", "Scheduled")} />
                <Line yAxisId="right" dataKey="actual" style={{ stroke: "var(--c-good)" }} strokeWidth={2} dot={false} name={tx("Presentes", "Present")} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={tx("Service Level por intervalo", "Service level by interval")} subtitle={tx("Línea punteada = objetivo 80%", "Dotted line = 80% target")}>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byInterval} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="slFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--c-forecast)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--c-forecast)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <ChartGradients />
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" tick={tickStyle} style={{ stroke: "var(--border-default)" }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={tickStyle} style={{ stroke: "var(--border-default)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, 1]} />
                <ReferenceLine y={0.8} style={{ stroke: "var(--c-warn)" }} strokeDasharray="4 4" label={{ value: "80%", position: "insideTopRight", fill: "var(--text-tertiary)", fontSize: 10 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: unknown) => `${Math.round(Number(v) * 100)}%`}
                />
                <Line type="monotone" dataKey="sl" style={{ stroke: "var(--c-forecast)" }} strokeWidth={2} dot={false} name="Service Level" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* By queue table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card
          title={tx("Desempeño por cola", "Performance by queue")}
          subtitle={tx("Agregado por cola para todos los filtros activos", "Aggregated by queue for all active filters")}
          className="lg:col-span-2"
          action={
            <Link href="/app/reports">
              <Button variant="ghost" size="sm">
                {tx("Informe completo", "Full report")} <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          }
        >
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                  <th className="text-left px-5 py-2 font-semibold">{tx("Cola", "Queue")}</th>
                  <th className="text-right px-3 py-2 font-semibold">{tx("Ofrecidos", "Offered")}</th>
                  <th className="text-right px-3 py-2 font-semibold">SL</th>
                  <th className="text-right px-3 py-2 font-semibold">{tx("Abandono", "Abandonment")}</th>
                  <th className="text-right px-3 py-2 font-semibold">AHT</th>
                  <th className="text-right px-3 py-2 font-semibold">{tx("Req / Pres", "Req / Present")}</th>
                  <th className="text-right px-5 py-2 font-semibold">Gap</th>
                </tr>
              </thead>
              <tbody>
                {byQueue.map((q) => {
                  const slTone = q.sl == null ? "neutral" : q.sl >= 0.8 ? "success" : q.sl >= 0.7 ? "warning" : "danger";
                  const gapTone = q.gap >= 0 ? "success" : q.gap > -50 ? "warning" : "danger";
                  return (
                    <tr key={q.queue} className="tbl-row tbl-row-stripe border-b border-[var(--border-subtle)] last:border-0">
                      <td className="px-5 py-2 font-medium text-[var(--text-primary)]">{q.queue}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtInt(q.offered)}</td>
                      <td className="px-3 py-2 text-right tabular-nums"><Chip variant={slTone as never}>{fmtPct(q.sl)}</Chip></td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtPct(q.abandonRate)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtSec(q.aht)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtInt(q.required)} / {fmtInt(q.actual)}</td>
                      <td className={`px-5 py-2 text-right tabular-nums font-semibold ${q.gap < 0 ? "text-[var(--danger-solid)]" : "text-[var(--success-solid)]"}`}>
                        <Chip variant={gapTone as never}>{q.gap >= 0 ? "+" : ""}{fmtInt(q.gap)}</Chip>
                      </td>
                    </tr>
                  );
                })}
                {byQueue.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-[var(--text-tertiary)]">{tx("No hay datos para los filtros seleccionados.", "No data for the selected filters.")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={tx("Resumen del día", "Daily summary")} subtitle={tx("Indicadores de salud operativa", "Operational health indicators")}>
          <div className="space-y-3">
            <SummaryRow
              icon={<Database className="h-4 w-4 text-[var(--accent)]" />}
              label={tx("Intervalos", "Intervals")}
              value={`${rows.length} · ${kpis.intervalCount} ${tx("con datos", "with data")}`}
              good={kpis.dataCompleteness > 0.95}
              warning={kpis.dataCompleteness > 0.7}
            />
            <SummaryRow
              icon={<CheckCircle2 className="h-4 w-4 text-[var(--success-solid)]" />}
              label={tx("Contestadas", "Answered")}
              value={`${fmtInt(kpis.totalAnswered)} / ${fmtInt(kpis.totalOffered)}`}
            />
            <SummaryRow
              icon={kpis.staffingGap < 0 ? <TrendingDown className="h-4 w-4 text-[var(--danger-solid)]" /> : <TrendingUp className="h-4 w-4 text-[var(--success-solid)]" />}
              label={tx("Dotación neta", "Net staffing")}
              value={
                kpis.staffingGap < 0
                  ? `${tx("Faltan", "Short by")} ${fmtInt(Math.abs(kpis.staffingGap))} ${tx("agentes en total (suma de intervalos)", "agents in total (sum of intervals)")}`
                  : `${tx("Excedente de", "Surplus of")} ${fmtInt(kpis.staffingGap)} ${tx("agentes agregados", "agents in aggregate")}`
              }
              bad={kpis.staffingGap < -10}
              good={kpis.staffingGap >= 0}
            />
            <SummaryRow
              icon={<Gauge className="h-4 w-4" />}
              label={tx("Precisión del pronóstico", "Forecast accuracy")}
              value={fmtPct(kpis.forecastAccuracy)}
              good={kpis.forecastAccuracy != null && kpis.forecastAccuracy >= 0.9}
              warning={kpis.forecastAccuracy != null && kpis.forecastAccuracy >= 0.8}
              bad={kpis.forecastAccuracy != null && kpis.forecastAccuracy < 0.8}
            />
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-2">{tx("Estimación económica", "Financial estimate")}</div>
              <div className="text-sm text-[var(--text-secondary)]">
                {kpis.staffingGap < 0
                  ? `${tx("Déficit agregado de ~", "Aggregate deficit of ~")}${fmtInt(Math.abs(kpis.staffingGap) * 0.25)}${tx(" horas-agente. Impacto en SL y abandono.", " agent-hours. Impact on SL and abandonment.")}`
                  : kpis.staffingGap > 20
                    ? `${tx("Excedente agregado de ~", "Aggregate surplus of ~")}${fmtInt(kpis.staffingGap * 0.25)}${tx(" horas-agente. Oportunidad de ajuste de breaks/VTO.", " agent-hours. Opportunity to adjust breaks/VTO.")}`
                    : "Sin desviaciones materiales detectadas."}
              </div>
              <Link href="/app/diagnostics" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-strong)] mt-2 hover:underline">
                {tx("Ver diagnóstico completo", "View full diagnostics")} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  good,
  bad,
  warning,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  good?: boolean;
  bad?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">{label}</div>
        <div className={`text-sm font-medium ${bad ? "text-[var(--danger-text)]" : good ? "text-[var(--success-text)]" : warning ? "text-[var(--warning-text)]" : "text-[var(--text-primary)]"}`}>{value}</div>
      </div>
    </div>
  );
}
