"use client";
import { IntervalExport } from "@/components/interval-export";
import { useTx } from "@/lib/tx";
import { useWfmStore, selectFilteredIntervals } from "@/lib/store";
import { KpiCard, Card, SectionHeader, Chip, Button, Callout, EmptyState } from "@/components/ui";
import { FilterBar } from "@/components/filters";
import { useToast } from "@/components/toast";
import { aggregateIntervals, sum } from "@/lib/wfm";
import { fmtPct, fmtInt, fmtSec, fmtNum, fmtTime } from "@/lib/formatters";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Bar,
  ComposedChart,
  Cell,
} from "recharts";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Gauge,
  ListOrdered,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import clsx from "clsx";

export default function IntradayPage() {
  const tx = useTx();
  const { intervals, filters } = useWfmStore();
  const { showToast } = useToast();
  const rows = useMemo(() => selectFilteredIntervals(intervals, filters), [intervals, filters]);
  const kpis = useMemo(() => aggregateIntervals(rows), [rows]);
  const [showAllRows, setShowAllRows] = useState(false);

  // Compute per-interval totals
  const byInterval = useMemo(() => {
    const map = new Map<string, {
      label: string;
      start: Date;
      offered: number;
      answered: number;
      abandoned: number;
      sl: number[];
      asa: number[];
      aht: number[];
      ahtW: number[];
      required: number;
      scheduled: number;
      actual: number;
      queues: Set<string>;
    }>();
    for (const r of rows) {
      const key = r.intervalLabel;
      const cur = map.get(key) ?? {
        label: key,
        start: r.intervalStart,
        offered: 0,
        answered: 0,
        abandoned: 0,
        sl: [],
        asa: [],
        aht: [],
        ahtW: [],
        required: 0,
        scheduled: 0,
        actual: 0,
        queues: new Set<string>(),
      };
      cur.offered += r.offered ?? r.actualVolume ?? 0;
      cur.answered += r.answered ?? r.actualVolume ?? 0;
      cur.abandoned += r.abandoned ?? 0;
      cur.required += r.requiredStaff ?? 0;
      cur.scheduled += r.scheduledStaff ?? 0;
      cur.actual += r.actualStaff ?? 0;
      if (r.queue) cur.queues.add(r.queue);
      if (typeof r.serviceLevel === "number") cur.sl.push(r.serviceLevel);
      if (typeof r.asa === "number") cur.asa.push(r.asa);
      if (typeof r.actualAht === "number") {
        const w = r.actualVolume ?? r.offered ?? 1;
        cur.aht.push(r.actualAht);
        cur.ahtW.push(w);
      }
      map.set(key, cur);
    }
    const list = [...map.values()].map((v) => {
      const slAvg = v.sl.length > 0 ? v.sl.reduce((a, b) => a + b, 0) / v.sl.length : null;
      const asaAvg = v.asa.length > 0 ? v.asa.reduce((a, b) => a + b, 0) / v.asa.length : null;
      const ahtNum = v.ahtW.length > 0
        ? v.aht.reduce<number>((acc, val, i) => acc + val * v.ahtW[i]!, 0) / v.ahtW.reduce((a, b) => a + b, 0)
        : null;
      const gap = v.actual - v.required;
      const scheduleGap = v.scheduled - v.required;
      return {
        label: v.label,
        start: v.start,
        offered: v.offered,
        answered: v.answered,
        abandoned: v.abandoned,
        sl: slAvg,
        asa: asaAvg,
        aht: ahtNum,
        required: v.required,
        scheduled: v.scheduled,
        actual: v.actual,
        gap,
        scheduleGap,
        coverage: v.required > 0 ? v.actual / v.required : null,
        queueCount: v.queues.size,
      };
    });
    list.sort((a, b) => a.start.getTime() - b.start.getTime());
    return list;
  }, [rows]);

  // Find worst intervals to prioritize
  const priorities = useMemo(() => {
    return byInterval
      .filter((v) => v.offered > 0)
      .map((v) => {
        let score = 0;
        if (v.coverage != null) {
          if (v.coverage < 0.8) score += 30;
          else if (v.coverage < 0.9) score += 20;
          else if (v.coverage < 0.95) score += 10;
        }
        if (v.sl != null) {
          if (v.sl < 0.65) score += 30;
          else if (v.sl < 0.75) score += 20;
          else if (v.sl < 0.8) score += 10;
        }
        if (v.asa != null) {
          if (v.asa > 80) score += 15;
          else if (v.asa > 40) score += 8;
        }
        score += Math.min(15, v.offered / 50);
        return { ...v, priorityScore: score };
      })
      .filter((v) => v.priorityScore > 15)
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [byInterval]);

  const visibleRows = showAllRows ? byInterval : byInterval;

  return (
    <div>
      <SectionHeader
        title="Intraday"
        description={tx("Monitoreo intervalo a intervalo. Se priorizan los intervalos con mayor impacto operativo, no solo los que tienen peor SL.", "Interval-by-interval monitoring. Intervals with the greatest operational impact are prioritized, not just those with the worst SL.")}
        actions={<div className="flex flex-wrap items-center justify-end gap-2"><IntervalExport rows={rows} name="intraday" />{
          <>
            <Link href="/app/diagnostics">
              <Button variant="secondary" size="sm"><AlertOctagon className="h-3.5 w-3.5" /> {tx("Diagnósticos", "Diagnostics")}</Button>
            </Link>
            <Button variant="accent" size="sm" onClick={()=>showToast(tx("Repronóstico intradía ejecutado: pronóstico actualizado con volumen observado hasta las ", "Intraday reforecast run: forecast updated with observed volume up to ") + new Date().toLocaleTimeString() + tx(" (demo).", " (demo)."), "success")}><Zap className="h-3.5 w-3.5" /> {tx("Repronóstico", "Reforecast")}</Button>
          </>
        }</div>}
      />

      <FilterBar />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Activity className="h-5 w-5" />}
            title={tx("No hay datos para visualizar", "No data to display")}
            description={tx("Carga datos demo o importa un archivo CSV/XLSX para comenzar el monitoreo intradía.", "Load demo data or import a CSV/XLSX file to start intraday monitoring.")}
            action={<Link href="/app/import"><Button variant="accent">{tx("Importar datos", "Import data")}</Button></Link>}
          />
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            <KpiCard label={tx("SL actual", "Current SL")} value={fmtPct(kpis.serviceLevel)} sub={tx("Promedio del día", "Daily average")} tone={kpis.serviceLevel && kpis.serviceLevel < 0.75 ? "bad" : kpis.serviceLevel && kpis.serviceLevel < 0.85 ? "warn" : "good"} target="≥ 80%" icon={<Target className="h-4 w-4" />} />
            <KpiCard label="ASA" value={fmtSec(kpis.asa)} sub={tx("Velocidad de respuesta", "Speed of answer")} tone={kpis.asa && kpis.asa > 60 ? "bad" : kpis.asa && kpis.asa > 30 ? "warn" : "good"} icon={<Clock className="h-4 w-4" />} />
            <KpiCard label="Abandono" value={fmtPct(kpis.totalOffered > 0 ? kpis.totalAbandoned / kpis.totalOffered : null)} sub={`${fmtInt(kpis.totalAbandoned)} ${tx("abandonadas", "abandoned")}`} tone={kpis.totalAbandoned / kpis.totalOffered > 0.08 ? "bad" : "default"} icon={<ArrowUpRight className="h-4 w-4" />} />
            <KpiCard label={tx("Ocupación", "Occupancy")} value={fmtPct(kpis.occupancy)} tone={kpis.occupancy && kpis.occupancy > 0.92 ? "bad" : "good"} icon={<Gauge className="h-4 w-4" />} />
            <KpiCard
              label={tx("Brecha neta", "Net gap")}
              value={
                <span className={kpis.staffingGap < -5 ? "text-[var(--danger-solid)]" : kpis.staffingGap < 0 ? "text-[var(--warning-solid)]" : "text-[var(--success-solid)]"}>
                  {fmtInt(kpis.staffingGap)}
                </span>
              }
              sub={`${fmtInt(kpis.totalActual)} presentes / ${fmtInt(kpis.totalRequired)} req.`}
              icon={<Users className="h-4 w-4" />}
            />
            <KpiCard label={tx("Precisión del pronóstico", "Forecast accuracy")} value={fmtPct(kpis.forecastAccuracy)} sub={`WAPE ${fmtPct(kpis.absPercentError)}`} tone={kpis.forecastAccuracy && kpis.forecastAccuracy < 0.8 ? "warn" : "good"} icon={<Target className="h-4 w-4" />} />
          </div>

          {/* Priority actions */}
          {priorities.length > 0 && (
            <Card
              title={<span className="flex items-center gap-2"><ListOrdered className="h-4 w-4 text-[var(--danger-solid)]" /> {tx("Intervalos prioritarios", "Priority intervals")}</span>}
              subtitle={tx("Ordenados por impacto combinado de déficit, SL y volumen. El primero es el que más atención necesita.", "Sorted by combined impact of deficit, SL and volume. The first one needs the most attention.")}
              className="mb-4"
            >
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {priorities.slice(0, 6).map((p, i) => {
                  const sev = p.priorityScore >= 60 ? "danger" : p.priorityScore >= 40 ? "warning" : "info";
                  return (
                    <div key={p.label} className={clsx("rounded-lg border p-3 text-sm", sev === "danger" ? "border-[var(--danger-border)] bg-[var(--danger-bg)]" : sev === "warning" ? "border-[var(--warning-border)] bg-[var(--warning-bg)]" : "border-[var(--info-border)] bg-[var(--info-bg)]")}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={clsx("text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center", sev === "danger" ? "bg-[var(--danger-solid)] text-white" : sev === "warning" ? "bg-[var(--warning-solid)] text-white" : "bg-[var(--info-solid)] text-white")}>
                            {i + 1}
                          </span>
                          <span className="font-semibold text-[var(--text-primary)]">{p.label}</span>
                        </div>
                        <Chip variant={sev as never}>{tx("Puntaje", "Score")} {Math.round(p.priorityScore)}</Chip>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                        <div><div className="text-[var(--text-tertiary)]">SL</div><div className="font-semibold tabular-nums">{fmtPct(p.sl, 0)}</div></div>
                        <div><div className="text-[var(--text-tertiary)]">{tx("Cobertura", "Coverage")}</div><div className="font-semibold tabular-nums">{fmtPct(p.coverage, 0)}</div></div>
                        <div><div className="text-[var(--text-tertiary)]">ASA</div><div className="font-semibold tabular-nums">{fmtSec(p.asa)}</div></div>
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        <strong className="text-[var(--text-primary)]">{tx("Acción:", "Action:")}</strong>{" "}
                        {p.gap < -2
                          ? `${tx("Enviar", "Send")} ${Math.min(6, Math.ceil(Math.abs(p.gap)))} ${tx("agentes de refuerzo o activar cross-skill.", "agents as reinforcement or enable cross-skill.")}`
                          : p.sl != null && p.sl < 0.75
                            ? tx("Priorizar atención; revisar AUX y breaks en curso.", "Prioritize attention; review AUX and breaks in progress.")
                            : tx("Monitorear; desviación leve.", "Monitor; minor deviation.")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card title={tx("Volumen y cobertura por intervalo", "Volume and coverage by interval")} subtitle={tx("Barras = volumen; línea = cobertura (real/requerido)", "Bars = volume; line = coverage (actual/required)")}>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={byInterval} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" style={{ stroke: "var(--border-subtle)" }} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} style={{ stroke: "var(--border-default)" }} tickLine={false} interval="preserveStartEnd" />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} style={{ stroke: "var(--border-default)" }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} style={{ stroke: "var(--border-default)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, 1.4]} />
                    <Tooltip
                      contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 8, fontSize: 12, color: "var(--text-primary)" }}
                    />
                    <Bar yAxisId="left" dataKey="offered" name={tx("Ofrecidos", "Offered")} radius={[3, 3, 0, 0]}>
                      {byInterval.map((v, i) => (
                        <Cell key={i} fill={v.coverage != null && v.coverage < 0.9 ? "var(--c-bad-soft)" : "var(--c-actual)"} fillOpacity={v.coverage != null && v.coverage < 0.9 ? 0.9 : 0.4} />
                      ))}
                    </Bar>
                    <Line yAxisId="right" dataKey="coverage" style={{ stroke: "var(--c-forecast)" }} strokeWidth={2} dot={false} name="Cobertura" />
                    <ReferenceLine yAxisId="right" y={1} style={{ stroke: "var(--c-good)" }} strokeDasharray="4 4" />
                    <ReferenceLine yAxisId="right" y={0.9} style={{ stroke: "var(--c-warn)" }} strokeDasharray="3 3" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title={tx("Nivel de servicio y ASA", "Service level and ASA")} subtitle={tx("Línea = SL; barras = ASA en segundos", "Line = SL; bars = ASA in seconds")}>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={byInterval} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" style={{ stroke: "var(--border-subtle)" }} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} style={{ stroke: "var(--border-default)" }} tickLine={false} interval="preserveStartEnd" />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} style={{ stroke: "var(--border-default)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, 1]} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} style={{ stroke: "var(--border-default)" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 8, fontSize: 12 }} />
                    <Bar yAxisId="right" dataKey="asa" name="ASA (s)" style={{ fill: "var(--c-info)" }} opacity={0.5} radius={[3, 3, 0, 0]} />
                    <Line yAxisId="left" dataKey="sl" style={{ stroke: "var(--c-forecast)" }} strokeWidth={2.2} dot={false} name="Service Level" />
                    <ReferenceLine yAxisId="left" y={0.8} style={{ stroke: "var(--c-warn)" }} strokeDasharray="4 4" label={{ value: "80%", fill: "var(--text-tertiary)", fontSize: 10, position: "insideTopRight" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Interval table */}
          <Card
            title={tx("Tabla intradía (intervalo a intervalo)", "Intraday table (interval by interval)")}
            subtitle={tx("Celdas coloreadas por semáforo. Haz clic en ordenar.", "Cells colored by status. Click to sort.")}
            action={<Button variant="ghost" size="sm" onClick={() => setShowAllRows(!showAllRows)}>{showAllRows ? "Resumir" : tx("Ver todo", "View all")}</Button>}
          >
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                    <th className="text-left px-5 py-2 font-semibold">{tx("Intervalo", "Interval")}</th>
                    <th className="text-right px-3 py-2 font-semibold">{tx("Ofrecidos", "Offered")}</th>
                    <th className="text-right px-3 py-2 font-semibold">{tx("Atendidas", "Answered")}</th>
                    <th className="text-right px-3 py-2 font-semibold">{tx("Aband.", "Abandon.")}</th>
                    <th className="text-right px-3 py-2 font-semibold">SL</th>
                    <th className="text-right px-3 py-2 font-semibold">ASA</th>
                    <th className="text-right px-3 py-2 font-semibold">AHT</th>
                    <th className="text-right px-3 py-2 font-semibold">Req.</th>
                    <th className="text-right px-3 py-2 font-semibold">{tx("Prog.", "Sched.")}</th>
                    <th className="text-right px-3 py-2 font-semibold">{tx("Pres.", "Present")}</th>
                    <th className="text-right px-3 py-2 font-semibold">{tx("Cob.", "Cov.")}</th>
                    <th className="text-right px-5 py-2 font-semibold">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((v) => {
                    const slTone = v.sl == null ? null : v.sl >= 0.8 ? "good" : v.sl >= 0.7 ? "warn" : "bad";
                    const cobTone = v.coverage == null ? null : v.coverage >= 0.95 ? "good" : v.coverage >= 0.88 ? "warn" : "bad";
                    const gapNum = v.gap;
                    return (
                      <tr key={v.label} className="tbl-row tbl-row-stripe border-b border-[var(--border-subtle)] last:border-0">
                        <td className="px-5 py-1.5 font-medium tabular-nums text-[var(--text-primary)]">{v.label}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fmtInt(v.offered)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fmtInt(v.answered)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fmtInt(v.abandoned)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{v.sl != null ? <Chip variant={slTone as never}>{fmtPct(v.sl, 0)}</Chip> : "—"}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fmtSec(v.asa, 0)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fmtSec(v.aht, 0)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fmtInt(v.required)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fmtInt(v.scheduled)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-medium">{fmtInt(v.actual)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{v.coverage != null ? <Chip variant={cobTone as never}>{fmtPct(v.coverage, 0)}</Chip> : "—"}</td>
                        <td className={`px-5 py-1.5 text-right font-semibold tabular-nums ${gapNum < -2 ? "text-[var(--danger-solid)]" : gapNum < 0 ? "text-[var(--warning-solid)]" : "text-[var(--success-solid)]"}`}>
                          {gapNum > 0 ? "+" : ""}{fmtInt(gapNum)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 px-5 text-[11px] text-[var(--text-tertiary)]">
              <strong>{tx("Leyenda:", "Legend:")}</strong> {tx("Cobertura ≥ 95%", "Coverage ≥ 95%")} <Chip variant="success" className="!text-[10px] !py-0">OK</Chip> · 88–94% <Chip variant="warning" className="!text-[10px] !py-0">Vigilancia</Chip> · {"<"} 88% <Chip variant="danger" className="!text-[10px] !py-0">{tx("Acción", "Action")}</Chip>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
