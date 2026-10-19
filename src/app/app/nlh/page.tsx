"use client";
import { IntervalExport } from "@/components/interval-export";
import { useTx } from "@/lib/tx";
import { useWfmStore, selectFilteredIntervals } from "@/lib/store";
import { KpiCard, Card, SectionHeader, Chip, EmptyState, Button } from "@/components/ui";
import { FilterBar } from "@/components/filters";
import { ChartGradients, GaugeChart, tooltipStyle, gridProps, tickStyle } from "@/components/charts";
import { aggregateIntervals } from "@/lib/wfm";
import { fmtInt, fmtPct, fmtSec } from "@/lib/formatters";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart } from "recharts";
import Link from "next/link";
import { Timer, Clock, TrendingUp } from "lucide-react";
import { useMemo } from "react";

export default function NLHPage() {
  const tx = useTx();
  const { intervals, filters } = useWfmStore();
  const rows = useMemo(() => selectFilteredIntervals(intervals, filters), [intervals, filters]);
  const kpis = useMemo(() => aggregateIntervals(rows), [rows]);

  const byInterval = useMemo(()=>{
    const map = new Map<string, any>();
    for(const r of rows){
      const k=r.intervalLabel;
      const cur = map.get(k) ?? { label:k, paidHours:0, prodHours:0, start:r.intervalStart };
      // Paid hours = scheduled * 0.25h ; Productive = actual on phone * occupancy? Approx: actualStaff * occupancy *0.25
      // For demo: paid = scheduledStaff*0.25, productive = actualStaff * (occupancy??0.85) *0.25  OR offered * AHT /3600
      const paid = (r.scheduledStaff ?? r.requiredStaff ?? 0) * 0.25;
      const prod = ((r.offered ?? r.actualVolume ?? 0) * (r.actualAht ?? 360) / 3600);
      cur.paidHours += paid;
      cur.prodHours += prod;
      map.set(k,cur);
    }
    return [...map.values()].map(v=>({...v, efficiency: v.paidHours>0 ? v.prodHours/v.paidHours : null, gap: v.paidHours - v.prodHours})).sort((a,b)=>a.start-b.start);
  },[rows]);

  const totalPaid = byInterval.reduce((a,b)=>a+b.paidHours,0);
  const totalProd = byInterval.reduce((a,b)=>a+b.prodHours,0);
  const efficiency = totalPaid>0 ? totalProd/totalPaid : null;
  const shrinkage = totalPaid>0 ? 1 - (efficiency ?? 0) : null;

  if(rows.length===0){
    return <div><SectionHeader title={tx("NLH — Horas netas de trabajo", "NLH — Net Labor Hours")} description={tx("Horas netas productivas vs pagadas.", "Net productive hours vs paid.")} /><FilterBar /><Card><EmptyState icon={<Timer className="h-5 w-5"/>} title="No hay datos" description="Importa datos de staffing y volumen." action={<Link href="/app/import"><Button variant="accent">Importar</Button></Link>} /></Card></div>;
  }

  return (
    <div>
      <SectionHeader title={tx("NLH — Horas netas de trabajo", "NLH — Net Labor Hours")} description={tx("Horas netas productivas vs pagadas. Mide eficiencia real de tu operación por intervalo, cola y sitio.", "Net productive hours vs paid. Measures the real efficiency of your operation by interval, queue and site.")} actions={<div className="flex flex-wrap items-center justify-end gap-2"><IntervalExport rows={rows} name="nlh" />{<Link href="/app/staffing"><Button variant="ghost" size="sm">{tx("Ver Staffing →", "View Staffing →")}</Button></Link>}</div>} />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Horas pagadas (total)" value={`${totalPaid.toFixed(1)}h`} sub={tx("Programado × intervalo", "Scheduled × interval")} icon={<Clock className="h-4 w-4"/>} />
        <KpiCard label="Horas productivas" value={`${totalProd.toFixed(1)}h`} sub={tx("Volumen × AHT / 3600", "Volume × AHT / 3600")} icon={<Timer className="h-4 w-4"/>} />
        <KpiCard label={tx("Eficiencia NLH", "NLH efficiency")} value={fmtPct(efficiency)} sub={tx("Productivas / Pagadas", "Productive / Paid")} tone={efficiency!=null && efficiency>=0.75 ? "good": efficiency!=null && efficiency>=0.6 ? "warn":"bad"} icon={<TrendingUp className="h-4 w-4"/>} />
        <KpiCard label={tx("Shrinkage implícito", "Implicit shrinkage")} value={fmtPct(shrinkage)} sub={tx("1 − Eficiencia", "1 − Efficiency")} tone={shrinkage!=null && shrinkage>0.35 ? "bad":"good"} />
      </div>

      <div className="grid lg:grid-cols-4 gap-4 mb-4">
        <Card title={tx("Eficiencia NLH", "NLH efficiency")} subtitle={tx("Productivas / Pagadas por intervalo", "Productive / Paid by interval")} className="flex flex-col items-center justify-center">
          <GaugeChart value={efficiency} label={tx("Eficiencia", "Efficiency")} sublabel={efficiency!=null ? `${totalProd.toFixed(1)}h / ${totalPaid.toFixed(1)}h` : undefined} size={200} thresholds={{good:0.75, warn:0.6}} />
          <div className="mt-4 text-xs text-center text-[var(--text-tertiary)] max-w-[220px]">
            {efficiency!=null && efficiency <0.6 ? tx("Gran parte del tiempo pagado no se traduce en tiempo productivo. Revisa shrinkage y AUX.", "A large share of paid time does not turn into productive time. Review shrinkage and AUX.") : efficiency!=null && efficiency >0.8 ? tx("Eficiencia excelente. Verifica que no haya agotamiento por sobre-utilización.", "Excellent efficiency. Check there is no burnout from over-utilization.") : tx("En rango típico para centros de contacto (60-75%).", "Within the typical range for contact centers (60-75%).")}
          </div>
        </Card>

        <Card title={tx("Horas por intervalo", "Hours by interval")} subtitle={tx("Barras apiladas: productivo vs no-productivo", "Stacked bars: productive vs non-productive")} className="lg:col-span-3">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={byInterval} margin={{top:8,right:12,left:-8,bottom:0}}>
                <ChartGradients />
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{fontSize:11}} iconSize={10}/>
                <Bar dataKey="prodHours" stackId="h" name={tx("Productivas", "Productive")} fill="#14b8a6" radius={[0,0,0,0]} />
                <Bar dataKey="gap" stackId="h" name={tx("No-productivas", "Non-productive")} fill="#e2e8f0" stroke="#94a3b8" strokeDasharray="3 3" radius={[4,4,0,0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title={tx("Eficiencia por intervalo", "Efficiency by interval")}>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={byInterval} margin={{top:8,right:12,left:-8,bottom:0}}>
              <ChartGradients />
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v)=>`${Math.round(v*100)}%`} domain={[0,1]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>fmtPct(Number(v))} />
              <Line type="monotone" dataKey="efficiency" name={tx("Eficiencia NLH", "NLH efficiency")} stroke="#14b8a6" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
