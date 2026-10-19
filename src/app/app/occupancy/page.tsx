"use client";
import { IntervalExport } from "@/components/interval-export";
import { useTx } from "@/lib/tx";
import { useWfmStore, selectFilteredIntervals } from "@/lib/store";
import { KpiCard, Card, SectionHeader, Chip, EmptyState, Button } from "@/components/ui";
import { FilterBar } from "@/components/filters";
import { ChartGradients, GaugeChart, tooltipStyle, gridProps, tickStyle } from "@/components/charts";
import { aggregateIntervals } from "@/lib/wfm";
import { fmtInt, fmtPct } from "@/lib/formatters";
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend, Line } from "recharts";
import Link from "next/link";
import { Gauge, Flame, TrendingUp, Users } from "lucide-react";
import { useMemo } from "react";

export default function OccupancyPage() {
  const tx = useTx();
  const { intervals, filters } = useWfmStore();
  const rows = useMemo(()=> selectFilteredIntervals(intervals, filters), [intervals, filters]);
  const kpis = useMemo(()=> aggregateIntervals(rows), [rows]);

  const byInterval = useMemo(()=>{
    const map = new Map<string,{label:string, occ:number[],offered:number,start:Date}>();
    for(const r of rows){
      const k=r.intervalLabel;
      const cur = map.get(k) ?? {label:k, occ:[] as number[], offered:0,start:r.intervalStart};
      if(typeof r.occupancy==="number") cur.occ.push(r.occupancy);
      cur.offered += r.offered ?? r.actualVolume ?? 0;
      map.set(k,cur);
    }
    return [...map.values()].map(v=>({
      label:v.label,
      occupancy: v.occ.length>0 ? v.occ.reduce((a,b)=>a+b,0)/v.occ.length : null,
      offered:v.offered,
      start:v.start,
    })).sort((a:any,b:any)=>a.start-b.start);
  },[rows]);

  const byQueue = useMemo(()=>{
    const m = new Map<string,{queue:string, occ:number[], count:number}>();
    for(const r of rows){
      const k=r.queue ?? "—";
      const cur=m.get(k) ?? {queue:k, occ:[] as number[], count:0};
      if(typeof r.occupancy==="number") cur.occ.push(r.occupancy);
      cur.count+=1;
      m.set(k,cur);
    }
    return [...m.values()].map(v=>({queue:v.queue, occupancy: v.occ.length>0 ? v.occ.reduce((a,b)=>a+b,0)/v.occ.length : null, count:v.count})).sort((a,b)=>(b.occupancy??0)-(a.occupancy??0));
  },[rows]);

  const burnoutIntervals = byInterval.filter(v=> v.occupancy!=null && v.occupancy>0.92).length;
  const lowOcc = byInterval.filter(v=> v.occupancy!=null && v.occupancy<0.65).length;

  if(rows.length===0){
    return <div><SectionHeader title={tx("Ocupación", "Occupancy")} description="Utilización de agentes en tiempo productivo." /><FilterBar /><Card><EmptyState icon={<Gauge className="h-5 w-5"/>} title="No hay datos" description="Importa datos con occupancy." action={<Link href="/app/import"><Button variant="accent">Importar</Button></Link>} /></Card></div>;
  }

  return (
    <div>
      <SectionHeader title={tx("Ocupación", "Occupancy")} description={tx("Utilización de agentes en tiempo productivo. Equilibrio entre eficiencia y riesgo de agotamiento.", "Agent utilization in productive time. Balance between efficiency and burnout risk.")} actions={<div className="flex flex-wrap items-center justify-end gap-2"><IntervalExport rows={rows} name="occupancy" />{<Link href="/app/capacity"><Button variant="ghost" size="sm">{tx("Ver Capacidad →", "View Capacity →")}</Button></Link>}</div>} />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label={tx("Ocupación promedio", "Average occupancy")} value={fmtPct(kpis.occupancy)} sub={tx("Ponderada del día", "Daily weighted")} tone={kpis.occupancy!=null && kpis.occupancy>0.92 ? "bad" : kpis.occupancy!=null && kpis.occupancy>=0.75 ? "good":"warn"} icon={<Gauge className="h-4 w-4"/>} target="75% – 92%" />
        <KpiCard label={tx("Intervalos en riesgo", "Intervals at burnout risk")} value={fmtInt(burnoutIntervals)} sub={tx("Ocupación >92%", "Occupancy >92%")} tone={burnoutIntervals>5 ? "bad": burnoutIntervals>2 ? "warn":"good"} icon={<Flame className="h-4 w-4"/>} />
        <KpiCard label={tx("Baja ocupación", "Low occupancy")} value={fmtInt(lowOcc)} sub={tx("<65% (sobre-dotación)", "<65% (over-staffing)")} tone={lowOcc>5 ? "warn":"good"} icon={<Users className="h-4 w-4"/>} />
        <KpiCard label={tx("Rango saludable", "Healthy range")} value={fmtInt(byInterval.length - burnoutIntervals - lowOcc)} sub={`${tx("de", "of")} ${byInterval.length} ${tx("intervalos", "intervals")}`} icon={<TrendingUp className="h-4 w-4"/>} />
      </div>

      <div className="grid lg:grid-cols-4 gap-4 mb-4">
        <Card title={tx("Ocupación ahora", "Occupancy now")} subtitle={tx("Promedio ponderado del día", "Daily weighted average")} className="flex flex-col items-center justify-center">
          <GaugeChart value={kpis.occupancy} label={tx("Ocupación", "Occupancy")} sublabel={tx("Objetivo: 75%–92%", "Target: 75%–92%")} size={200} thresholds={{good:0.75, warn:0.65}} />
          <div className="mt-3 text-xs text-center max-w-[220px] text-[var(--text-tertiary)]">
            {kpis.occupancy!=null && kpis.occupancy>0.92 ? tx("🔥 Riesgo de burnout: ocupación sostenida muy alta. Programa descansos.", "🔥 Burnout risk: sustained very high occupancy. Schedule breaks.") : kpis.occupancy!=null && kpis.occupancy<0.65 ? tx("Eficiencia baja: considera consolidar colas o reasignar agentes.", "Low efficiency: consider consolidating queues or reassigning agents.") : tx("En rango saludable. Buen equilibrio eficiencia-bienestar.", "In healthy range. Good efficiency-wellbeing balance.")}
          </div>
        </Card>

        <Card title={tx("Ocupación por intervalo", "Occupancy by interval")} subtitle={tx("Línea con bandas de referencia", "Line with reference bands")} className="lg:col-span-3">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={byInterval} margin={{top:8,right:12,left:-8,bottom:0}}>
                <ChartGradients />
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v)=>`${Math.round(v*100)}%`} domain={[0,1]} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>fmtPct(Number(v))} />
                <ReferenceLine y={0.92} stroke="#f43f5e" strokeDasharray="4 4" label={{value:"92% burnout", fill:"#f43f5e", fontSize:10, position:"insideTopRight"}} />
                <ReferenceLine y={0.75} stroke="#10b981" strokeDasharray="4 4" label={{value:"75% min", fill:"#10b981", fontSize:10, position:"insideTopRight"}} />
                <Line type="monotone" dataKey="occupancy" name={tx("Ocupación", "Occupancy")} stroke="#818cf8" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title={tx("Ocupación por cola", "Occupancy by queue")}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={byQueue} layout="vertical" margin={{top:8,right:20,left:60,bottom:0}}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v)=>`${Math.round(v*100)}%`} domain={[0,1]} />
                <YAxis type="category" dataKey="queue" tick={{fontSize:11, fill:"var(--text-secondary)"}} tickLine={false} width={70} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>fmtPct(Number(v))} />
                <ReferenceLine x={0.92} stroke="#f43f5e" strokeDasharray="3 3" />
                <Bar dataKey="occupancy" name={tx("Ocupación", "Occupancy")} radius={[0,4,4,0]} fill="#818cf8" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={tx("Detalle por cola", "Detail by queue")}>
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                  <th className="text-left px-5 py-2">{tx("Cola", "Queue")}</th>
                  <th className="text-right px-3 py-2">{tx("Ocupación", "Occupancy")}</th>
                  <th className="text-right px-3 py-2">{tx("Intervalos", "Intervals")}</th>
                  <th className="text-right px-5 py-2">{tx("Estado", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {byQueue.map(q=>(
                  <tr key={q.queue} className="tbl-row tbl-row-stripe border-b border-[var(--border-subtle)] last:border-0">
                    <td className="px-5 py-2 font-medium">{q.queue}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtPct(q.occupancy)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtInt(q.count)}</td>
                    <td className="px-5 py-2 text-right"><Chip variant={q.occupancy!=null && q.occupancy>0.92 ? "danger": q.occupancy!=null && q.occupancy<0.65 ? "warning":"success"}>{q.occupancy!=null && q.occupancy>0.92 ? "Burnout": q.occupancy!=null && q.occupancy<0.65 ? "Baja":"OK"}</Chip></td>
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
