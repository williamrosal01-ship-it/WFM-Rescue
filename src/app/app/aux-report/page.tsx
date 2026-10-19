"use client";
import { useTx } from "@/lib/tx";
import { useWfmStore } from "@/lib/store";
import { KpiCard, Card, SectionHeader, Chip, EmptyState, Button } from "@/components/ui";
import { ExportMenu } from "@/components/export-menu";
import { CHART } from "@/lib/chart-palette";
import { useI18n } from "@/lib/i18n";
import { FilterBar } from "@/components/filters";
import { ChartGradients, tooltipStyle, gridProps, tickStyle } from "@/components/charts";
import { fmtInt, fmtPct, fmtSec } from "@/lib/formatters";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend } from "recharts";
import Link from "next/link";
import { ShieldAlert, Timer, AlertTriangle, Coffee } from "lucide-react";
import { useMemo } from "react";
import { ShareReportButton } from "@/components/share-report-button";
import { buildAuxContent } from "@/lib/report-snapshot";

const AUX_THRESHOLD_SEC = 900; // 15 min per interval = exceeds

export default function AuxReportPage() {
  const tx = useTx();
  const { agentIntervals } = useWfmStore();
  const auxRows = useMemo(()=> agentIntervals.filter(a=>a.auxCode || !a.isAdherent), [agentIntervals]);

  // By AUX code
  const byCode = useMemo(()=>{
    const m = new Map<string,{code:string,count:number,totalSec:number,agents:Set<string>}>();
    for(const a of auxRows){
      const code = a.auxCode ?? (a.isAdherent ? "—" : tx("Desvío sin código", "Deviation without code"));
      const cur = m.get(code) ?? {code, count:0, totalSec:0, agents:new Set<string>()};
      cur.count+=1;
      cur.totalSec+= a.auxDurationSec ?? 0;
      cur.agents.add(a.agentId);
      m.set(code,cur);
    }
    return [...m.values()].map(v=>({
      code:v.code,
      count:v.count,
      totalSec:v.totalSec,
      avgSec: v.count>0 ? v.totalSec/v.count : 0,
      agents: v.agents.size,
      exceeds: v.totalSec > AUX_THRESHOLD_SEC ? Math.round((v.totalSec - AUX_THRESHOLD_SEC)/60) : 0,
    })).sort((a,b)=>b.totalSec-a.totalSec);
  },[auxRows]);

  // Exceeds: agents/intervals where AUX > threshold
  const exceeds = useMemo(()=>{
    const map = new Map<string,{agent:string,code:string,sec:number,exceeds:number}>();
    for(const a of auxRows){
      if((a.auxDurationSec ?? 0) > AUX_THRESHOLD_SEC){
        const k = `${a.agentId}-${a.auxCode}`;
        map.set(k, {agent:a.agentName, code:a.auxCode ?? "—", sec:a.auxDurationSec ?? 0, exceeds: Math.round(((a.auxDurationSec ?? 0)-AUX_THRESHOLD_SEC)/60)});
      }
    }
    return [...map.values()].sort((a,b)=>b.sec-a.sec).slice(0,20);
  },[auxRows]);

  // By team
  const byTeam = useMemo(()=>{
    const m = new Map<string,{team:string,site:string,auxSec:number,intervals:number}>();
    for(const a of auxRows){
      const k = `${a.team}|${a.site}`;
      const cur = m.get(k) ?? {team:a.team ?? "—", site:a.site ?? "", auxSec:0, intervals:0};
      cur.auxSec += a.auxDurationSec ?? 0;
      cur.intervals+=1;
      m.set(k,cur);
    }
    return [...m.values()].map(v=>({...v, avgMin: v.intervals>0 ? Math.round(v.auxSec/v.intervals/60*10)/10 : 0})).sort((a,b)=>b.auxSec-a.auxSec);
  },[auxRows]);

  const totalAuxSec = byCode.reduce((a,b)=>a+b.totalSec,0);
  const totalExceeds = exceeds.length;

  if(auxRows.length===0){
    return <div><SectionHeader title={tx("AUX — Análisis Detallado", "AUX — Detailed analysis")} description="Desglose de tiempo no-productivo por código AUX." /><FilterBar /><Card><EmptyState icon={<ShieldAlert className="h-5 w-5"/>} title="No hay datos AUX" description="Importa datos de adherencia con códigos AUX o carga la demo." action={<Link href="/app/import"><Button variant="accent">Importar</Button></Link>} /></Card></div>;
  }

  return (
    <div>
      <SectionHeader title={tx("AUX — Análisis Detallado", "AUX — Detailed analysis")} description={tx("Desglose de tiempo no-productivo por código AUX. Detecta excesos, compara planificado vs no-planificado.", "Breakdown of unproductive time by AUX code. Detects excesses, compares planned vs unplanned.")} actions={<div className="flex flex-wrap items-center gap-2"><ExportMenu name="aux-detail" title={tx("AUX — Análisis Detallado", "AUX — Detailed analysis")} sections={[{name:"aux-codes", title:tx("AUX por código","AUX by code"), rows: byCode.map(r=>({[tx("Código AUX","AUX code")]: r.code, [tx("Intervalos","Intervals")]: r.count, [tx("Tiempo total (min)","Total time (min)")]: Math.round(r.totalSec/60), [tx("Promedio (min)","Average (min)")]: Math.round(r.avgSec/60*10)/10, [tx("Agentes","Agents")]: r.agents, [tx("Exceso (min)","Excess (min)")]: r.exceeds}))}, {name:"aux-exceeds", title:tx("Excesos por agente","Excesses by agent"), rows: exceeds.map(r=>({[tx("Agente","Agent")]: r.agent, [tx("Código AUX","AUX code")]: r.code, [tx("Tiempo (min)","Time (min)")]: Math.round(r.sec/60), [tx("Exceso (min)","Excess (min)")]: r.exceeds}))}]} /><ShareReportButton title={tx("AUX — Análisis Detallado", "AUX — Detailed analysis")} getContent={() => buildAuxContent(agentIntervals, tx("es", "en") as "es" | "en")} /><Link href="/app/adherence"><Button variant="ghost" size="sm">{tx("Ver Adherencia →", "View Adherence →")}</Button></Link></div>} />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label={tx("Tiempo total AUX", "Total AUX time")} value={fmtSec(totalAuxSec)} sub={`${byCode.length} ${tx("códigos distintos", "distinct codes")}`} icon={<Timer className="h-4 w-4"/>} />
        <KpiCard label={tx("Promedio por intervalo", "Average per interval")} value={auxRows.length>0 ? `${Math.round(totalAuxSec/auxRows.length)}s` : "—"} sub={`${fmtInt(auxRows.length)} ${tx("intervalos AUX", "AUX intervals")}`} icon={<Coffee className="h-4 w-4"/>} />
        <KpiCard label={tx("Excede (>15 min)", "Exceeds (>15 min)")} value={fmtInt(totalExceeds)} sub={tx("Intervalos sobre umbral", "Intervals over threshold")} tone={totalExceeds>5 ? "bad": totalExceeds>2 ? "warn":"good"} icon={<AlertTriangle className="h-4 w-4"/>} />
        <KpiCard label={tx("Equipos afectados", "Affected teams")} value={fmtInt(byTeam.length)} sub={tx("Equipos con AUX registrado", "Teams with recorded AUX")} icon={<ShieldAlert className="h-4 w-4"/>} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title={tx("Distribución AUX por código", "AUX distribution by code")} subtitle={tx("Tamaño = tiempo total", "Size = total time")}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCode} dataKey="totalSec" nameKey="code" innerRadius={55} outerRadius={95} paddingAngle={2} style={{ stroke: "var(--bg-surface)" }}>
                  {byCode.map((_,i)=>{
                    const colors=["#14b8a6","#f59e0b","#f43f5e","#818cf8","#10b981","#ec4899","#94a3b8","#14b8a6"];
                    return <Cell key={i} fill={colors[i%colors.length]} />;
                  })}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>fmtSec(Number(v))} />
                <Legend wrapperStyle={{fontSize:11}} iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={tx("Tiempo AUX por código (horas)", "AUX time by code (hours)")} subtitle={tx("Barras con gradiente, rojo si excede", "Gradient bars, red if over the limit")}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCode} layout="vertical" margin={{top:8,right:20,left:100,bottom:0}}>
                <ChartGradients />
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v)=>`${Math.round(v/3600)}h`} />
                <YAxis type="category" dataKey="code" tick={{fontSize:11, fill:"var(--text-secondary)"}} tickLine={false} width={95} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>fmtSec(Number(v))} />
                <Bar dataKey="totalSec" name="Tiempo AUX" radius={[0,4,4,0]}>
                  {byCode.map((v,i)=>(
                    <Cell key={i} fill={v.totalSec > 900*byCode.length/2 ? "#f43f5e" : "#14b8a6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={tx("AUX excedido — ranking", "AUX exceeds — ranking")} subtitle={`${tx("Intervalos con >", "Intervals with >")}${AUX_THRESHOLD_SEC/60} ${tx("min no-productivo", "min unproductive")}`}>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {exceeds.length===0 ? (
              <div className="text-sm text-[var(--text-tertiary)] py-4 text-center">{tx("No hay intervalos sobre el umbral. ¡Buen control de AUX!", "No intervals over the threshold. Good AUX control!")}</div>
            ) : exceeds.map((e,i)=>(
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)]">
                <div className="h-7 w-7 rounded-lg bg-[var(--danger-solid)] text-white flex items-center justify-center text-xs font-bold">{i+1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{e.agent} — {e.code}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{fmtSec(e.sec)} · Excede por {e.exceeds} min</div>
                </div>
                <Chip variant="danger">+{e.exceeds}m</Chip>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card title={tx("AUX por equipo / sitio", "AUX by team / site")}>
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                  <th className="text-left px-5 py-2">{tx("Equipo", "Team")}</th>
                  <th className="text-left px-3 py-2">{tx("Sitio", "Site")}</th>
                  <th className="text-right px-3 py-2">{tx("Intervalos", "Intervals")}</th>
                  <th className="text-right px-3 py-2">{tx("Tiempo AUX", "AUX time")}</th>
                  <th className="text-right px-3 py-2">{tx("Promedio", "Average")}</th>
                  <th className="text-right px-5 py-2">{tx("Estado", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {byTeam.map(t=>(
                  <tr key={`${t.team}-${t.site}`} className="tbl-row tbl-row-stripe border-b border-[var(--border-subtle)] last:border-0">
                    <td className="px-5 py-2 font-medium">{t.team}</td>
                    <td className="px-3 py-2">{t.site}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtInt(t.intervals)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtSec(t.auxSec)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{t.avgMin}m</td>
                    <td className="px-5 py-2 text-right"><Chip variant={t.avgMin>10 ? "danger": t.avgMin>6 ? "warning":"success"}>{t.avgMin>10 ? "Alto": t.avgMin>6 ? "Medio":"OK"}</Chip></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={tx("Detalle por código AUX", "Detail by AUX code")}>
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                  <th className="text-left px-5 py-2">{tx("Código AUX", "AUX code")}</th>
                  <th className="text-right px-3 py-2">{tx("Usos", "Uses")}</th>
                  <th className="text-right px-3 py-2">{tx("Agentes", "Agents")}</th>
                  <th className="text-right px-3 py-2">Total</th>
                  <th className="text-right px-3 py-2">{tx("Promedio", "Average")}</th>
                  <th className="text-right px-5 py-2">{tx("Excede", "Exceeds")}</th>
                </tr>
              </thead>
              <tbody>
                {byCode.map(c=>(
                  <tr key={c.code} className="tbl-row tbl-row-stripe border-b border-[var(--border-subtle)] last:border-0">
                    <td className="px-5 py-2 font-medium">{c.code}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtInt(c.count)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtInt(c.agents)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtSec(c.totalSec)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtSec(c.avgSec)}</td>
                    <td className="px-5 py-2 text-right">{c.exceeds>0 ? <Chip variant="danger">+{c.exceeds}m</Chip> : <Chip variant="success">OK</Chip>}</td>
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
