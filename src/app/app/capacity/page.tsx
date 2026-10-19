"use client";
import { IntervalExport } from "@/components/interval-export";
import { useTx } from "@/lib/tx";
import { useWfmStore, selectFilteredIntervals } from "@/lib/store";
import { KpiCard, Card, SectionHeader, Chip, EmptyState, Button } from "@/components/ui";
import { FilterBar } from "@/components/filters";
import { ChartGradients, tooltipStyle, gridProps, tickStyle } from "@/components/charts";
import { aggregateIntervals, requiredAgents } from "@/lib/wfm";
import { fmtInt, fmtPct } from "@/lib/formatters";
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from "recharts";
import Link from "next/link";
import { Layers, TrendingUp, Users, Calculator } from "lucide-react";
import { useMemo, useState } from "react";

export default function CapacityPage() {
  const tx = useTx();
  const { intervals, filters } = useWfmStore();
  const rows = useMemo(() => selectFilteredIntervals(intervals, filters), [intervals, filters]);
  const kpis = useMemo(() => aggregateIntervals(rows), [rows]);
  const [shrinkage, setShrinkage] = useState(0.32);
  const [slTarget, setSlTarget] = useState(0.8);

  const byInterval = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of rows) {
      const k = r.intervalLabel;
      const cur = map.get(k) ?? { label: k, vol: 0, aht: [] as number[], w: [] as number[], required: 0, start: r.intervalStart };
      cur.vol += r.offered ?? r.actualVolume ?? 0;
      if (typeof r.actualAht === "number") { cur.aht.push(r.actualAht); cur.w.push(r.actualVolume ?? r.offered ?? 1); }
      cur.required += r.requiredStaff ?? 0;
      map.set(k, cur);
    }
    return [...map.values()].map((v) => {
      const avgAht = v.w.length>0 ? v.aht.reduce((a:number,b:number,i:number)=>a+b*v.w[i],0)/v.w.reduce((a:number,b:number)=>a+b,0) : 360;
      const erlangReq = requiredAgents(v.vol, avgAht, 15, slTarget, 20, shrinkage);
      return { label: v.label, vol: v.vol, aht: Math.round(avgAht), required: v.required, erlangReq, fte: Math.ceil(erlangReq / 1.0), start: v.start };
    }).sort((a,b)=>a.start-b.start);
  }, [rows, shrinkage, slTarget]);

  const totalFte = byInterval.reduce((a,b)=>a+b.fte,0);
  const maxFte = Math.max(...byInterval.map(b=>b.fte),0);
  const avgAht = kpis.weightedAht;

  if (rows.length===0) {
    return <div><SectionHeader title={tx("Capacidad", "Capacity")} description="Planificación de capacidad y FTE." /><FilterBar /><Card><EmptyState icon={<Layers className="h-5 w-5"/>} title="No hay datos" description="Importa volumen y AHT para calcular capacidad." action={<Link href="/app/import"><Button variant="accent">Importar</Button></Link>} /></Card></div>;
  }

  return (
    <div>
      <SectionHeader title={tx("Capacidad", "Capacity")} description={tx("Planificación de capacidad y FTE. Convierte volumen y AHT en requerimientos de personal con y sin shrinkage.", "Capacity and FTE planning. Converts volume and AHT into staffing requirements with and without shrinkage.")} actions={<div className="flex flex-wrap items-center justify-end gap-2"><IntervalExport rows={rows} name="capacity" />{<Link href="/app/nlh"><Button variant="ghost" size="sm">{tx("Ver NLH →", "View NLH →")}</Button></Link>}</div>} />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label={tx("FTE total requerido", "Total FTE required")} value={fmtInt(totalFte)} sub={`${byInterval.length} ${tx("intervalos · máx", "intervals · max")} ${maxFte} ${tx("simultáneos", "simultaneous")}`} icon={<Users className="h-4 w-4"/>} />
        <KpiCard label={tx("Volumen total", "Total volume")} value={fmtInt(kpis.totalOffered)} sub={`${tx("AHT promedio", "Average AHT")} ${avgAht ? Math.round(avgAht)+"s" : "—"}`} icon={<Calculator className="h-4 w-4"/>} />
        <KpiCard label="Shrinkage" value={fmtPct(shrinkage)} sub={tx("Planificado + no planificado", "Planned + unplanned")} icon={<Layers className="h-4 w-4"/>} />
        <KpiCard label={tx("SL objetivo", "Target SL")} value={fmtPct(slTarget)} sub={tx("20 s umbral", "20 s threshold")} />
      </div>

      <Card title={tx("Parámetros de capacidad", "Capacity parameters")} subtitle={tx("Ajusta shrinkage y SL objetivo para ver el impacto en FTE", "Adjust shrinkage and target SL to see the impact on FTE")} className="mb-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Shrinkage (%)</label>
            <input type="range" min={0} max={50} value={Math.round(shrinkage*100)} onChange={e=>setShrinkage(parseInt(e.target.value)/100)} className="w-full accent-[var(--accent)]" />
            <div className="text-xs text-[var(--text-tertiary)] mt-1">{Math.round(shrinkage*100)}% — {shrinkage<0.25 ? tx("bajo", "low") : shrinkage<0.35 ? tx("típico centro de contacto", "typical contact center") : tx("alto, revisar", "high, review")}</div>
          </div>
          <div>
            <label className="label">{tx("SL objetivo (%)", "SL target (%)")}</label>
            <input type="range" min={60} max={95} value={Math.round(slTarget*100)} onChange={e=>setSlTarget(parseInt(e.target.value)/100)} className="w-full accent-[var(--accent)]" />
            <div className="text-xs text-[var(--text-tertiary)] mt-1">{Math.round(slTarget*100)}{tx("% en 20s", "% in 20s")}</div>
          </div>
          <div className="flex items-end">
            <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-subtle)] rounded-lg px-3 py-2 w-full">
              <strong>{tx("Fórmula:", "Formula:")}</strong> {tx("Requeridos = Erlang-C(V, AHT, 15m, SL, 20s) / (1-shrinkage)", "Required = Erlang-C(V, AHT, 15m, SL, 20s) / (1-shrinkage)")}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title={tx("FTE requerido por intervalo (Erlang-C)", "Required FTE per interval (Erlang-C)")} subtitle={tx("Turquesa = calculado con tus parámetros · Índigo = reportado en el archivo", "Teal = calculated with your parameters · Indigo = reported in the file")} className="lg:col-span-2">
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={byInterval} margin={{top:8,right:12,left:-8,bottom:0}}>
                <ChartGradients />
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{fontSize:11}} iconSize={10}/>
                <Bar dataKey="required" name={tx("Reportado (archivo)", "Reported (file)")} fill="#818cf8" radius={[3,3,0,0]} fillOpacity={0.6} barSize={18} />
                <Bar dataKey="erlangReq" name={tx("Calculado Erlang-C", "Erlang-C calculated")} fill="#14b8a6" radius={[3,3,0,0]} barSize={18} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={tx("Carga de trabajo (horas)", "Workload (hours)")}>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={byInterval} margin={{top:8,right:12,left:-8,bottom:0}}>
                <ChartGradients />
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="vol" name="Volumen" fill="#14b8a6" radius={[3, 3, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title={tx("Detalle de capacidad por intervalo", "Capacity detail by interval")} className="mt-4">
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                <th className="text-left px-5 py-2">{tx("Intervalo", "Interval")}</th>
                <th className="text-right px-3 py-2">{tx("Volumen", "Volume")}</th>
                <th className="text-right px-3 py-2">AHT</th>
                <th className="text-right px-3 py-2">{tx("Req. reportado", "Reported req.")}</th>
                <th className="text-right px-3 py-2">{tx("Erlang-C calculado", "Calculated Erlang-C")}</th>
                <th className="text-right px-3 py-2">FTE</th>
                <th className="text-right px-5 py-2">Delta</th>
              </tr>
            </thead>
            <tbody>
              {byInterval.map(v=>(
                <tr key={v.label} className="tbl-row tbl-row-stripe border-b border-[var(--border-subtle)] last:border-0">
                  <td className="px-5 py-1.5 font-medium tabular-nums">{v.label}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{fmtInt(v.vol)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{v.aht}s</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{fmtInt(v.required)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{fmtInt(v.erlangReq)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{fmtInt(v.fte)}</td>
                  <td className={`px-5 py-1.5 text-right tabular-nums font-bold ${v.erlangReq>v.required ? "text-[#f59e0b]":"text-[#10b981]"}`}>{v.erlangReq>v.required ? `+${fmtInt(v.erlangReq-v.required)}` : v.erlangReq<v.required ? fmtInt(v.erlangReq-v.required) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
