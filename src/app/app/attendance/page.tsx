"use client";
import { IntervalExport } from "@/components/interval-export";
import { useTx } from "@/lib/tx";
import { useWfmStore, selectFilteredIntervals } from "@/lib/store";
import { KpiCard, Card, SectionHeader, Chip, EmptyState, Button } from "@/components/ui";
import { FilterBar } from "@/components/filters";
import { ChartGradients, GaugeChart, tooltipStyle, gridProps, tickStyle } from "@/components/charts";
import { aggregateIntervals } from "@/lib/wfm";
import { fmtInt, fmtPct } from "@/lib/formatters";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import Link from "next/link";
import { CalendarCheck, Clock, UserX, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { ShareReportButton } from "@/components/share-report-button";
import { buildAttendanceContent } from "@/lib/report-snapshot";

export default function AttendancePage() {
  const tx = useTx();
  const { intervals, filters, agentIntervals } = useWfmStore();
  const rows = useMemo(()=> selectFilteredIntervals(intervals, filters), [intervals, filters]);
  const kpis = useMemo(()=> aggregateIntervals(rows), [rows]);

  // Attendance from staffing: attendance = actual/scheduled (with cap)
  const attendanceRate = kpis.totalScheduled>0 ? Math.min(1, kpis.totalActual/kpis.totalScheduled) : null;
  const absenteeism = attendanceRate!=null ? 1-attendanceRate : null;

  // Tardiness from agentIntervals: late = early intervals where not adherent and scheduled=Production but actual !=Production at start of day
  const tardiness = useMemo(()=>{
    const early = agentIntervals.filter(a=> a.intervalStart.getHours()===8 && (a.intervalStart.getMinutes()<=30) && !a.isAdherent && a.isScheduledProduction);
    const byTeam = new Map<string,{team:string,site:string,late:number,total:number}>();
    for(const a of early){
      const k=`${a.team}|${a.site}`;
      const cur = byTeam.get(k) ?? {team:a.team??"—", site:a.site??"", late:0,total:0};
      cur.total+=1; cur.late+=1; byTeam.set(k,cur);
    }
    // Also overall teams
    const allByTeam = new Map<string,{team:string,site:string,late:number,total:number}>();
    for(const a of agentIntervals.filter(a=>a.isScheduledProduction)){
      const k=`${a.team}|${a.site}`;
      const cur = allByTeam.get(k) ?? {team:a.team??"—", site:a.site??"", late:0,total:0};
      cur.total+=1;
      if(!a.isAdherent && a.exceptionType==="late") cur.late+=1;
      // also count non-adherent production as potential late
      if(!a.isAdherent) cur.late+=0.3; // estimate
      allByTeam.set(k,cur);
    }
    return [...allByTeam.values()].map(v=>({...v, rate: v.total>0 ? v.late/v.total : 0})).sort((a,b)=>b.rate-a.rate);
  },[agentIntervals]);

  // By interval
  const byInterval = useMemo(()=>{
    const map = new Map<string,{label:string, scheduled:number,actual:number,start:Date}>();
    for(const r of rows){
      const k=r.intervalLabel;
      const cur = map.get(k) ?? {label:k,scheduled:0,actual:0,start:r.intervalStart};
      cur.scheduled += r.scheduledStaff ?? 0;
      cur.actual += r.actualStaff ?? 0;
      map.set(k,cur);
    }
    return [...map.values()].map(v=>({...v, attendance: v.scheduled>0 ? Math.min(1,(v.actual as number)/(v.scheduled as number)): null, absent: Math.max(0, (v.scheduled as number) - (v.actual as number))})).sort((a:any,b:any)=>a.start.getTime()-b.start.getTime());
  },[rows]);

  if(rows.length===0){
    return <div><SectionHeader title={tx("Asistencia", "Attendance")} description="Tasa de asistencia, ausentismo y tardanzas." /><FilterBar /><Card><EmptyState icon={<CalendarCheck className="h-5 w-5"/>} title="No hay datos" description="Importa staffing." action={<Link href="/app/import"><Button variant="accent">Importar</Button></Link>} /></Card></div>;
  }

  return (
    <div>
      <SectionHeader title={tx("Asistencia", "Attendance")} description={tx("Tasa de asistencia, ausentismo y tardanzas. Impacto directo en tu capacidad disponible.", "Attendance rate, absenteeism and tardiness. Direct impact on your available capacity.")} actions={<div className="flex flex-wrap items-center justify-end gap-2"><ShareReportButton title={tx("Asistencia", "Attendance")} getContent={() => buildAttendanceContent(rows, tx("es", "en") as "es" | "en")} /><IntervalExport rows={rows} name="attendance" />{<Link href="/app/nlh"><Button variant="ghost" size="sm">{tx("Ver NLH →", "View NLH →")}</Button></Link>}</div>} />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label={tx("Asistencia", "Attendance")} value={fmtPct(attendanceRate)} sub={`${fmtInt(kpis.totalActual)} / ${fmtInt(kpis.totalScheduled)} presentes`} tone={attendanceRate!=null && attendanceRate>=0.97 ? "good": attendanceRate!=null && attendanceRate>=0.93 ? "warn":"bad"} icon={<CalendarCheck className="h-4 w-4"/>} />
        <KpiCard label={tx("Ausentismo", "Absenteeism")} value={fmtPct(absenteeism)} sub={`${fmtInt(Math.max(0,kpis.totalScheduled-kpis.totalActual))} ausencias`} tone={absenteeism!=null && absenteeism>0.07 ? "bad":"good"} icon={<UserX className="h-4 w-4"/>} />
        <KpiCard label={tx("Tardanzas estimadas", "Estimated tardiness")} value={fmtInt(Math.round(agentIntervals.filter(a=>!a.isAdherent && a.isScheduledProduction).length*0.08))} sub={tx("No adherentes en prod. al inicio", "Non-adherent in production at start")} icon={<Clock className="h-4 w-4"/>} />
        <KpiCard label={tx("Impacto capacidad", "Capacity impact")} value={fmtInt(Math.max(0,kpis.totalScheduled-kpis.totalActual))} sub={tx("Agentes faltantes (suma intervalos)", "Missing agents (sum of intervals)")} icon={<TrendingUp className="h-4 w-4"/>} />
      </div>

      <div className="grid lg:grid-cols-4 gap-4 mb-4">
        <Card title={tx("Asistencia global", "Overall attendance")} subtitle={tx("Presentes / Programados", "Present / Scheduled")} className="flex flex-col items-center justify-center">
          <GaugeChart value={attendanceRate} label={tx("Asistencia", "Attendance")} sublabel={`${fmtInt(kpis.totalActual)} ${tx("de", "of")} ${fmtInt(kpis.totalScheduled)}`} size={200} thresholds={{good:0.97, warn:0.93}} />
        </Card>

        <Card title={tx("Ausentismo por intervalo", "Absenteeism by interval")} subtitle={tx("Barras = ausencias (programado - real)", "Bars = absences (scheduled - actual)")} className="lg:col-span-3">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byInterval} margin={{top:8,right:12,left:-8,bottom:0}}>
                <ChartGradients />
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="absent" name="Ausentes" radius={[4,4,0,0]}>
                  {byInterval.map((v,i)=><Cell key={i} fill={v.absent>4 ? "#f43f5e" : v.absent>1 ? "#f59e0b" : "#10b981"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title={tx("Asistencia por intervalo", "Attendance by interval")}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byInterval} margin={{top:8,right:12,left:-8,bottom:0}}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v)=>`${Math.round(v*100)}%`} domain={[0.7,1]} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>fmtPct(Number(v))} />
                <Bar dataKey="attendance" name={tx("Asistencia", "Attendance")} radius={[4,4,0,0]}>
                  {byInterval.map((v,i)=><Cell key={i} fill={v.attendance==null ? "#94a3b8" : v.attendance>=0.97 ? "#10b981" : v.attendance>=0.93 ? "#f59e0b" : "#f43f5e"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={tx("Tardiness por equipo / sitio (estimado)", "Tardiness by team / site (estimated)")}>
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                  <th className="text-left px-5 py-2">{tx("Equipo", "Team")}</th>
                  <th className="text-left px-3 py-2">{tx("Sitio", "Site")}</th>
                  <th className="text-right px-3 py-2">{tx("Casos", "Cases")}</th>
                  <th className="text-right px-3 py-2">{tx("Tasa", "Rate")}</th>
                  <th className="text-right px-5 py-2">{tx("Estado", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {tardiness.slice(0,10).map(t=>(
                  <tr key={`${t.team}-${t.site}`} className="tbl-row tbl-row-stripe border-b border-[var(--border-subtle)] last:border-0">
                    <td className="px-5 py-2 font-medium">{t.team}</td>
                    <td className="px-3 py-2">{t.site}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtInt(t.late)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtPct(t.rate,1)}</td>
                    <td className="px-5 py-2 text-right"><Chip variant={t.rate>0.08 ? "danger": t.rate>0.04 ? "warning":"success"}>{t.rate>0.08 ? "Alto": t.rate>0.04 ? "Medio":"OK"}</Chip></td>
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
