"use client";
import { IntervalExport } from "@/components/interval-export";
import { useTx } from "@/lib/tx";
import { useWfmStore, selectFilteredIntervals } from "@/lib/store";
import { KpiCard, Card, SectionHeader, Chip, EmptyState, Button } from "@/components/ui";
import { FilterBar } from "@/components/filters";
import { ChartGradients, tooltipStyle, gridProps, tickStyle } from "@/components/charts";
import { aggregateIntervals } from "@/lib/wfm";
import { fmtInt, fmtPct, fmtSec } from "@/lib/formatters";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend, Cell } from "recharts";
import Link from "next/link";
import { Phone, Target, TrendingDown, AlertTriangle } from "lucide-react";
import { useMemo } from "react";

export default function ServiceLevelPage() {
  const tx = useTx();
  const { intervals, filters } = useWfmStore();
  const rows = useMemo(()=> selectFilteredIntervals(intervals, filters), [intervals, filters]);
  const kpis = useMemo(()=> aggregateIntervals(rows), [rows]);

  const byInterval = useMemo(()=>{
    const map = new Map<string,{label:string, sl:number[], asa:number[], abandon: number, offered:number,start:Date}>();
    for(const r of rows){
      const k=r.intervalLabel;
      const cur = map.get(k) ?? {label:k, sl:[] as number[], asa:[] as number[], abandon:0, offered:0, start:r.intervalStart};
      if(typeof r.serviceLevel==="number") cur.sl.push(r.serviceLevel);
      if(typeof r.asa==="number") cur.asa.push(r.asa);
      cur.abandon += r.abandoned ?? 0;
      cur.offered += r.offered ?? r.actualVolume ?? 0;
      map.set(k,cur);
    }
    return [...map.values()].map(v=>({
      label:v.label,
      sl: v.sl.length>0 ? v.sl.reduce((a,b)=>a+b,0)/v.sl.length : null,
      asa: v.asa.length>0 ? v.asa.reduce((a,b)=>a+b,0)/v.asa.length : null,
      abandonRate: v.offered>0 ? v.abandon/v.offered : null,
      start:v.start,
    })).sort((a:any,b:any)=>a.start-b.start);
  },[rows]);

  const byQueue = useMemo(()=>{
    const m = new Map<string,{queue:string, sl:number[],asa:number[],offered:number,abandon:number}>();
    for(const r of rows){
      const k=r.queue ?? "—";
      const cur=m.get(k) ?? {queue:k, sl:[] as number[], asa:[] as number[], offered:0, abandon:0};
      if(typeof r.serviceLevel==="number") cur.sl.push(r.serviceLevel);
      if(typeof r.asa==="number") cur.asa.push(r.asa);
      cur.offered += r.offered ?? r.actualVolume ?? 0;
      cur.abandon += r.abandoned ?? 0;
      m.set(k,cur);
    }
    return [...m.values()].map(v=>({
      queue:v.queue,
      sl: v.sl.length>0 ? v.sl.reduce((a,b)=>a+b,0)/v.sl.length : null,
      asa: v.asa.length>0 ? v.asa.reduce((a,b)=>a+b,0)/v.asa.length : null,
      abandonRate: v.offered>0 ? v.abandon/v.offered : null,
      offered:v.offered,
    })).sort((a,b)=> (a.sl ?? 1) - (b.sl ?? 1));
  },[rows]);

  const breaches = byInterval.filter(v=> v.sl!=null && v.sl <0.8).length;
  const avgSl = kpis.serviceLevel;

  if(rows.length===0){
    return <div><SectionHeader title={tx("Nivel de servicio — análisis detallado", "Service Level — Deep Dive")} description={tx("Análisis profundo de nivel de servicio.", "In-depth service level analysis.")} /><FilterBar /><Card><EmptyState icon={<Phone className="h-5 w-5"/>} title={tx("No hay datos", "No data")} description={tx("Importa datos con SL y ASA.", "Import data with SL and ASA.")} action={<Link href="/app/import"><Button variant="accent">{tx("Importar", "Import")}</Button></Link>} /></Card></div>;
  }

  return (
    <div>
      <SectionHeader title={tx("Nivel de servicio — análisis detallado", "Service Level — Deep Dive")} description={tx("Análisis profundo de nivel de servicio por intervalo, cola y umbral. Identifica patrones de degradación.", "Deep analysis of service level by interval, queue and threshold. Identifies degradation patterns.")} actions={<div className="flex flex-wrap items-center justify-end gap-2"><IntervalExport rows={rows} name="service-level" />{<Link href="/app/diagnostics"><Button variant="accent" size="sm"><AlertTriangle className="h-3.5 w-3.5"/> {tx("Ver diagnósticos", "View diagnostics")}</Button></Link>}</div>} />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label={tx("Nivel de servicio promedio", "Average service level")} value={fmtPct(avgSl)} sub={`${breaches} ${tx("intervalos bajo 80%", "intervals below 80%")}`} tone={avgSl!=null && avgSl>=0.8 ? "good": avgSl!=null && avgSl>=0.7 ? "warn":"bad"} icon={<Target className="h-4 w-4"/>} target={tx("≥80% en 20s", "≥80% in 20s")} />
        <KpiCard label={tx("ASA promedio", "Average ASA")} value={fmtSec(kpis.asa)} sub={tx("Velocidad de respuesta", "Speed of answer")} tone={kpis.asa!=null && kpis.asa>60 ? "bad": kpis.asa!=null && kpis.asa>30 ? "warn":"good"} icon={<Phone className="h-4 w-4"/>} />
        <KpiCard label="Abandono" value={fmtPct(kpis.totalOffered>0 ? kpis.totalAbandoned/kpis.totalOffered : null)} sub={`${fmtInt(kpis.totalAbandoned)} ${tx("abandonadas", "abandoned")}`} tone={kpis.totalAbandoned/kpis.totalOffered>0.08 ? "bad":"good"} icon={<TrendingDown className="h-4 w-4"/>} />
        <KpiCard label={tx("Peor cola", "Worst queue")} value={byQueue[0]?.queue ?? "—"} sub={byQueue[0]?.sl!=null ? `SL ${fmtPct(byQueue[0].sl)}` : "—"} tone={byQueue[0]?.sl!=null && byQueue[0].sl <0.7 ? "bad":"warn"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title={tx("SL por intervalo", "SL by interval")} subtitle={tx("Línea con umbral 80% — rojo debajo", "Line with 80% threshold — red below")} className="lg:col-span-2">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={byInterval} margin={{top:8,right:12,left:-8,bottom:0}}>
                <ChartGradients />
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v)=>`${Math.round(v*100)}%`} domain={[0,1]} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>fmtPct(Number(v))} />
                <ReferenceLine y={0.8} stroke="#f59e0b" strokeDasharray="4 4" label={{value:"80% objetivo", fill:"#92400e", fontSize:10, position:"insideTopRight"}} />
                <ReferenceLine y={0.9} stroke="#10b981" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="sl" name="Service Level" stroke="#14b8a6" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={tx("ASA por intervalo", "ASA by interval")}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={byInterval} margin={{top:8,right:12,left:-8,bottom:0}}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>`${Math.round(Number(v))}s`} />
                <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="4 4" label={{value:"20s", fill:"#92400e", fontSize:10, position:"insideTopRight"}} />
                <Bar dataKey="asa" name="ASA (s)" radius={[4,4,0,0]} fill="#818cf8" fillOpacity={0.8} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card title={tx("SL por cola — ranking", "SL by queue — ranking")}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={byQueue} layout="vertical" margin={{top:8,right:20,left:40,bottom:0}}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v)=>`${Math.round(v*100)}%`} domain={[0,1]} />
                <YAxis type="category" dataKey="queue" tick={{fontSize:11, fill:"var(--text-secondary)"}} tickLine={false} width={70} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>fmtPct(Number(v))} />
                <ReferenceLine x={0.8} stroke="#f59e0b" strokeDasharray="4 4" />
                <Bar dataKey="sl" name="Service Level" radius={[0,4,4,0]} fill="#14b8a6">
                  {byQueue.map((v,i)=><Cell key={i} fill={v.sl!=null && v.sl>=0.8 ? "#10b981" : v.sl!=null && v.sl>=0.7 ? "#f59e0b" : "#f43f5e"} />)}
                </Bar>
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
                  <th className="text-right px-3 py-2">SL</th>
                  <th className="text-right px-3 py-2">ASA</th>
                  <th className="text-right px-3 py-2">{tx("Abandono", "Abandonment")}</th>
                  <th className="text-right px-5 py-2">{tx("Estado", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {byQueue.map(q=>(
                  <tr key={q.queue} className="tbl-row tbl-row-stripe border-b border-[var(--border-subtle)] last:border-0">
                    <td className="px-5 py-2 font-medium">{q.queue}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtPct(q.sl)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtSec(q.asa)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtPct(q.abandonRate)}</td>
                    <td className="px-5 py-2 text-right"><Chip variant={q.sl!=null && q.sl>=0.8 ? "success": q.sl!=null && q.sl>=0.7 ? "warning":"danger"}>{q.sl!=null && q.sl>=0.8 ? "OK": q.sl!=null && q.sl>=0.7 ? "Vigilar":"Crítico"}</Chip></td>
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
