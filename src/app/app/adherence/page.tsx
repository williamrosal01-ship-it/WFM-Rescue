"use client";
import { IntervalExport } from "@/components/interval-export";
import { useTx } from "@/lib/tx";
import { useWfmStore, selectFilteredIntervals } from "@/lib/store";
import { KpiCard, Card, SectionHeader, Chip, EmptyState, Button } from "@/components/ui";
import { FilterBar } from "@/components/filters";
import { fmtPct, fmtInt, fmtSec } from "@/lib/formatters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
  ReferenceLine,
} from "recharts";
import Link from "next/link";
import { UserCheck, Users, AlertTriangle, Upload, Clock, Coffee } from "lucide-react";
import { useMemo } from "react";

export default function AdherencePage() {
  const tx = useTx();
  const { intervals, agentIntervals, filters } = useWfmStore();
  // For adherence we use the agent-level data (demo data has it); fall back to message if not.
  const prodIntervals = useMemo(() => agentIntervals.filter((a) => a.isScheduledProduction), [agentIntervals]);
  const adherenceRate = prodIntervals.length > 0
    ? prodIntervals.filter((a) => a.isAdherent).length / prodIntervals.length
    : null;

  // By team
  const byTeam = useMemo(() => {
    const m = new Map<string, { total: number; adherent: number; aux: number; auxTime: number; team: string; site: string }>();
    for (const a of prodIntervals) {
      const key = `${a.team ?? "Sin equipo"}|${a.site ?? ""}`;
      const cur = m.get(key) ?? { total: 0, adherent: 0, aux: 0, auxTime: 0, team: a.team ?? "Sin equipo", site: a.site ?? "" };
      cur.total += 1;
      if (a.isAdherent) cur.adherent += 1;
      if (a.auxCode) { cur.aux += 1; cur.auxTime += a.auxDurationSec ?? 0; }
      m.set(key, cur);
    }
    return [...m.values()].map((v) => ({
      ...v,
      adherence: v.total > 0 ? v.adherent / v.total : null,
      auxRate: v.total > 0 ? v.aux / v.total : null,
    })).sort((a, b) => (a.adherence ?? 0) - (b.adherence ?? 0));
  }, [prodIntervals]);

  // AUX by code
  const auxByCode = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of agentIntervals) {
      if (a.auxCode) {
        m.set(a.auxCode, (m.get(a.auxCode) ?? 0) + (a.auxDurationSec ?? 0));
      }
    }
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    return [...m.entries()].map(([code, secs]) => ({ code, secs, pct: total > 0 ? secs / total : 0 })).sort((a, b) => b.secs - a.secs);
  }, [agentIntervals]);

  // Schedule vs actual presence (from interval data, fallback)
  const rows = useMemo(() => selectFilteredIntervals(intervals, filters), [intervals, filters]);
  const totalSched = rows.reduce<number>((acc, r) => acc + (r.scheduledStaff ?? 0), 0);
  const totalActual = rows.reduce<number>((acc, r) => acc + (r.actualStaff ?? 0), 0);
  const conformance = totalSched > 0 ? totalActual / totalSched : null;

  return (
    <div>
      <SectionHeader
        title={tx("Adherencia, Asistencia y AUX", "Adherence, Attendance and AUX")}
        description={tx("Análisis de adherencia al horario (momento correcto, actividad correcta), conformidad (total de horas), y códigos AUX con mayor impacto.", "Schedule adherence analysis (right time, right activity), conformance (total hours), and the AUX codes with the greatest impact.")}
        actions={<div className="flex flex-wrap items-center justify-end gap-2"><IntervalExport rows={rows} name="adherence" />{
          <Link href="/app/import">
            <Button variant="accent" size="sm"><Upload className="h-3.5 w-3.5" /> {tx("Importar adherencia", "Import adherence")}</Button>
          </Link>
        }</div>}
      />
      <FilterBar />

      {agentIntervals.length === 0 ? (
        <Card>
          <EmptyState
            icon={<UserCheck className="h-5 w-5" />}
            title={tx("No hay datos a nivel de agente", "No agent-level data")}
            description={tx("El conjunto de datos demo incluye agentes y te permite ver adherencia por equipo y AUX. Si importas tus propios datos, añade un archivo con agent_id, actividad programada y actividad real por intervalo.", "The demo dataset includes agents and lets you see adherence by team and AUX. If you import your own data, add a file with agent_id, scheduled activity and actual activity per interval.")}
            action={<Link href="/app/import"><Button variant="accent">{tx("Importar datos de agentes", "Import agent data")}</Button></Link>}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <KpiCard label={tx("Adherencia", "Adherence")} value={fmtPct(adherenceRate)} sub={tx("Actividad correcta en momento correcto", "Right activity at the right time")} tone={adherenceRate != null && adherenceRate >= 0.94 ? "good" : adherenceRate != null && adherenceRate >= 0.9 ? "warn" : "bad"} target="≥ 94%" icon={<UserCheck className="h-4 w-4" />} />
            <KpiCard label="Conformance (presencia)" value={fmtPct(conformance)} sub={tx("Presentes vs programados", "Present vs scheduled")} tone={conformance != null && conformance >= 0.97 ? "good" : conformance != null && conformance >= 0.93 ? "warn" : "bad"} target="≥ 97%" icon={<Users className="h-4 w-4" />} />
            <KpiCard label={tx("Tiempo en AUX (no productivo)", "Time in AUX (unproductive)")} value={fmtSec(auxByCode.reduce<number>((a, b) => a + b.secs, 0) / 68)} sub={tx("Promedio por agente", "Average per agent")} icon={<Coffee className="h-4 w-4" />} />
            <KpiCard label={tx("Intervalos con desvío", "Intervals with deviation")} value={fmtInt(prodIntervals.length - prodIntervals.filter((a) => a.isAdherent).length)} sub={`${tx("de", "of")} ${fmtInt(prodIntervals.length)} ${tx("programados", "scheduled")}`} icon={<AlertTriangle className="h-4 w-4" />} />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card title={tx("Adherencia por equipo / sitio", "Adherence by team / site")} className="lg:col-span-2">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byTeam} layout="vertical" margin={{ top: 8, right: 20, left: 90, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" style={{ stroke: "var(--border-subtle)" }} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} style={{ stroke: "var(--border-default)" }} tickLine={false} tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0.7, 1]} />
                    <YAxis type="category" dataKey="team" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} style={{ stroke: "var(--border-default)" }} tickLine={false} width={80} />
                    <Tooltip
                      contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: unknown) => fmtPct(Number(v), 1)}
                    />
                    <ReferenceLine />
                    <Bar dataKey="adherence" name={tx("Adherencia", "Adherence")} radius={[0, 4, 4, 0]}>
                      {byTeam.map((t, i) => (
                        <Cell key={i} fill={t.adherence != null && t.adherence >= 0.94 ? "var(--c-good)" : t.adherence != null && t.adherence >= 0.9 ? "var(--c-warn)" : "var(--c-bad)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title={tx("Distribución de AUX por código", "AUX distribution by code")}>
              {auxByCode.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={auxByCode} dataKey="secs" nameKey="code" innerRadius={40} outerRadius={80} paddingAngle={2} style={{ stroke: "var(--bg-surface)" }}>
                        {auxByCode.map((_, i) => {
                          const colors = ["#f43f5e", "#f59e0b", "#3b82f6", "#10b981", "#818cf8", "#94a3b8"];
                          return <Cell key={i} fill={colors[i % colors.length]} />;
                        })}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: unknown) => fmtSec(Number(v))}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-sm text-[var(--text-tertiary)] py-4 text-center">{tx("No hay datos de AUX.", "No AUX data.")}</div>
              )}
            </Card>
          </div>

          <Card title={tx("Desglose por equipo", "Breakdown by team")} className="mt-4">
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                    <th className="text-left px-5 py-2 font-semibold">{tx("Equipo", "Team")}</th>
                    <th className="text-left px-3 py-2 font-semibold">{tx("Sitio", "Site")}</th>
                    <th className="text-right px-3 py-2 font-semibold">{tx("Intervalos prod.", "Production intervals")}</th>
                    <th className="text-right px-3 py-2 font-semibold">{tx("Adherencia", "Adherence")}</th>
                    <th className="text-right px-3 py-2 font-semibold">{tx("AUX no-productivo", "Unproductive AUX")}</th>
                    <th className="text-right px-3 py-2 font-semibold">{tx("Tiempo AUX total", "Total AUX time")}</th>
                    <th className="text-right px-5 py-2 font-semibold">{tx("Estado", "Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {byTeam.map((t) => {
                    const good = t.adherence != null && t.adherence >= 0.94;
                    const warn = t.adherence != null && t.adherence >= 0.9;
                    return (
                      <tr key={`${t.team}-${t.site}`} className="tbl-row tbl-row-stripe border-b border-[var(--border-subtle)] last:border-0">
                        <td className="px-5 py-2 font-medium">{t.team}</td>
                        <td className="px-3 py-2">{t.site}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtInt(t.total)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{fmtPct(t.adherence, 1)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtPct(t.auxRate, 1)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtSec(t.auxTime)}</td>
                        <td className="px-5 py-2 text-right">
                          <Chip variant={good ? "success" : warn ? "warning" : "danger"}>
                            {good ? "OK" : warn ? tx("Revisar", "Review") : tx("Crítico", "Critical")}
                          </Chip>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 px-5 text-[11px] text-[var(--text-tertiary)] flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              {tx("Adherencia mide conformidad con la actividad programada en cada intervalo; conformidad mide horas totales trabajadas. Un agente puede tener 100% conformance y baja adherence si trabajó horas completas pero en el momento equivocado.", "Adherence measures conformity with the scheduled activity in each interval; conformance measures total hours worked. An agent can have 100% conformance and low adherence if they worked full hours at the wrong time.")}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
