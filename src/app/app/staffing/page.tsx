"use client";
import { IntervalExport } from "@/components/interval-export";
import { useTx } from "@/lib/tx";
import { useWfmStore, selectFilteredIntervals } from "@/lib/store";
import { KpiCard, Card, SectionHeader, Chip, EmptyState, Button, Callout } from "@/components/ui";
import { FilterBar } from "@/components/filters";
import { ChartGradients, GaugeChart, tooltipStyle, gridProps, tickStyle } from "@/components/charts";
import { aggregateIntervals } from "@/lib/wfm";
import { fmtPct, fmtInt, fmtSec } from "@/lib/formatters";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend, BarChart, Cell } from "recharts";
import Link from "next/link";
import { Users, UserX, TrendingDown, TrendingUp, AlertTriangle, Download } from "lucide-react";
import { useMemo } from "react";

export default function StaffingPage() {
  const tx = useTx();
  const { intervals, filters } = useWfmStore();
  const rows = useMemo(() => selectFilteredIntervals(intervals, filters), [intervals, filters]);
  const kpis = useMemo(() => aggregateIntervals(rows), [rows]);

  const byInterval = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of rows) {
      const k = r.intervalLabel;
      const cur = map.get(k) ?? { label: k, required: 0, scheduled: 0, actual: 0, offered: 0, start: r.intervalStart };
      cur.required += r.requiredStaff ?? 0;
      cur.scheduled += r.scheduledStaff ?? 0;
      cur.actual += r.actualStaff ?? 0;
      cur.offered += r.offered ?? r.actualVolume ?? 0;
      map.set(k, cur);
    }
    return [...map.values()]
      .map((v) => ({
        ...v,
        gap: v.actual - v.required,
        schedGap: v.scheduled - v.required,
        coverage: v.required > 0 ? v.actual / v.required : null,
        shortfall: Math.max(0, v.required - v.actual),
        surplus: Math.max(0, v.actual - v.required),
      }))
      .sort((a, b) => a.start - b.start);
  }, [rows]);

  const byQueue = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of rows) {
      const k = r.queue ?? "—";
      const cur = map.get(k) ?? { queue: k, required: 0, scheduled: 0, actual: 0, offered: 0 };
      cur.required += r.requiredStaff ?? 0;
      cur.scheduled += r.scheduledStaff ?? 0;
      cur.actual += r.actualStaff ?? 0;
      cur.offered += r.offered ?? r.actualVolume ?? 0;
      map.set(k, cur);
    }
    return [...map.values()]
      .map((v) => ({ ...v, gap: v.actual - v.required, coverage: v.required > 0 ? v.actual / v.required : null }))
      .sort((a, b) => b.offered - a.offered);
  }, [rows]);

  const totalShortfall = byInterval.reduce((a, b) => a + b.shortfall, 0) * 0.25; // agent-hours
  const totalSurplus = byInterval.reduce((a, b) => a + b.surplus, 0) * 0.25;
  const avgCoverage = kpis.totalRequired > 0 ? kpis.totalActual / kpis.totalRequired : null;

  if (rows.length === 0) {
    return (
      <div>
        <SectionHeader title="Staffing" description={tx("Análisis de dotación: requerido vs programado vs presente.", "Staffing analysis: required vs scheduled vs present.")} />
        <FilterBar />
        <Card>
          <EmptyState icon={<Users className="h-5 w-5" />} title="No hay datos de staffing" description="Importa archivos con columnas de Required, Scheduled y Actual staff." action={<Link href="/app/import"><Button variant="accent">{tx("Importar datos", "Import data")}</Button></Link>} />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Staffing"
        description={tx("Análisis de dotación: requerido vs programado vs presente. Identifica brechas por intervalo y cola con impacto económico.", "Staffing analysis: required vs scheduled vs present. Identifies gaps by interval and queue with financial impact.")}
        actions={<div className="flex flex-wrap items-center justify-end gap-2"><IntervalExport rows={rows} name="staffing" />{
          <>
            <Button variant="secondary" size="sm" onClick={() => {
              const header = "interval,required,scheduled,actual,gap,coverage\n";
              const body = byInterval.map(r => `${r.label},${r.required},${r.scheduled},${r.actual},${r.gap},${r.coverage ?? ""}`).join("\n");
              const blob = new Blob([header+body], {type:"text/csv"});
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href=url; a.download="staffing.csv"; a.click(); URL.revokeObjectURL(url);
            }}><Download className="h-3.5 w-3.5" /> {tx("Exportar CSV", "Export CSV")}</Button>
            <Link href="/app/capacity"><Button variant="ghost" size="sm">{tx("Ver Capacidad →", "View Capacity →")}</Button></Link>
          </>
        }</div>}
      />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label={tx("Requeridos (total intervalos)", "Required (total intervals)")} value={fmtInt(kpis.totalRequired)} sub={tx("Suma de todos los intervalos", "Sum of all intervals")} icon={<Users className="h-4 w-4" />} />
        <KpiCard label={tx("Programados", "Scheduled")} value={fmtInt(kpis.totalScheduled)} sub={`${tx("Brecha vs req", "Gap vs req")}: ${kpis.scheduleGap >=0 ? "+" : ""}${fmtInt(kpis.scheduleGap)}`} tone={kpis.scheduleGap <0 ? "bad":"good"} />
        <KpiCard label={tx("Presentes", "Present")} value={fmtInt(kpis.totalActual)} sub={`${tx("Cobertura", "Coverage")}: ${fmtPct(avgCoverage)}`} tone={avgCoverage!=null && avgCoverage>=0.95 ? "good": avgCoverage!=null && avgCoverage>=0.85 ? "warn":"bad"} icon={<UserX className="h-4 w-4" />} />
        <KpiCard label={tx("Horas de déficit", "Deficit hours")} value={`${totalShortfall.toFixed(1)}h`} sub={`Excedente: ${totalSurplus.toFixed(1)}h`} tone={totalShortfall>10 ? "bad": totalShortfall>4?"warn":"good"} icon={totalShortfall>4? <TrendingDown className="h-4 w-4"/> : <TrendingUp className="h-4 w-4"/>} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card title={tx("Dotación por intervalo", "Staffing by interval")} subtitle={tx("Área: Requerido/Programado · Línea: Presente · Rojo = déficit", "Area: Required/Scheduled · Line: Present · Red = deficit")} className="lg:col-span-2">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={byInterval} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <ChartGradients />
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
                <Line type="monotone" dataKey="required" name={tx("Requerido", "Required")} stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="scheduled" name={tx("Programado", "Scheduled")} stroke="#818cf8" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="actual" name={tx("Presente", "Present")} stroke="#14b8a6" strokeWidth={2.5} dot={false} activeDot={{ r: 3 }} />
                <ReferenceLine y={0} style={{ stroke: "var(--border-default)" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={tx("Cobertura por intervalo", "Coverage by interval")} subtitle={tx("Presente / Requerido", "Present / Required")}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={byInterval} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <ChartGradients />
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v)=>`${Math.round(v*100)}%`} domain={[0,1.4]} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>`${Math.round(Number(v)*100)}%`} />
                <ReferenceLine y={1} stroke="#10b981" strokeDasharray="4 4" label={{ value:"100%", fill:"var(--c-good)", fontSize:10, position:"insideTopRight"}} />
                <ReferenceLine y={0.9} stroke="#f59e0b" strokeDasharray="3 3" />
                <Bar dataKey="coverage" name="Cobertura" radius={[4,4,0,0]}>
                  {byInterval.map((v,i)=>(
                    <Cell key={i} fill={v.coverage==null ? "#94a3b8" : v.coverage>=0.95 ? "#10b981" : v.coverage>=0.85 ? "#f59e0b" : "#f43f5e"} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title={tx("Gap por cola", "Gap by queue")} subtitle={tx("Barras hacia izquierda = déficit, derecha = excedente", "Bars to the left = deficit, right = surplus")}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byQueue} layout="vertical" margin={{ top: 8, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" tick={tickStyle} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="queue" tick={tickStyle} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine x={0} style={{ stroke: "var(--border-strong)" }} />
                <Bar dataKey="gap" name="Gap (presente - requerido)" radius={[0,4,4,0]}>
                  {byQueue.map((v,i)=>(
                    <Cell key={i} fill={v.gap>=0 ? "#10b981" : "#f43f5e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={tx("Detalle por cola", "Detail by queue")}>
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                  <th className="text-left px-5 py-2">{tx("Cola", "Queue")}</th>
                  <th className="text-right px-3 py-2">{tx("Requerido", "Required")}</th>
                  <th className="text-right px-3 py-2">{tx("Programado", "Scheduled")}</th>
                  <th className="text-right px-3 py-2">{tx("Presente", "Present")}</th>
                  <th className="text-right px-3 py-2">Gap</th>
                  <th className="text-right px-5 py-2">{tx("Cobertura", "Coverage")}</th>
                </tr>
              </thead>
              <tbody>
                {byQueue.map((q)=>(
                  <tr key={q.queue} className="tbl-row tbl-row-stripe border-b border-[var(--border-subtle)] last:border-0">
                    <td className="px-5 py-2 font-medium">{q.queue}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtInt(q.required)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtInt(q.scheduled)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtInt(q.actual)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-bold ${q.gap<0 ? "text-[#ef4444]" : "text-[#10b981]"}`}>{q.gap>0?"+":""}{fmtInt(q.gap)}</td>
                    <td className="px-5 py-2 text-right"><Chip variant={q.coverage!=null && q.coverage>=0.95 ? "success" : q.coverage!=null && q.coverage>=0.85 ? "warning":"danger"}>{fmtPct(q.coverage,0)}</Chip></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
