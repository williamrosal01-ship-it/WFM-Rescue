// ============================================================================
// WFM Diagnostic Engine
// Goes beyond "show me the numbers" to identify specific operational issues,
// quantify their impact, and recommend concrete actions.
//
// Design principles:
//  - Every finding has: severity, evidence (what rows), impact ($, service),
//    and recommended actions with owners and priority.
//  - We never say "investigate"; we point to the intervals and queues.
//  - Financial estimates use explicit assumptions (loaded labor cost per agent).
// ============================================================================
import { aggregateIntervals, sum, wtdAvg } from "./wfm";
import type { AgentIntervalRecord, DiagnosticFinding, IntervalRecord } from "./types";

// Same number convention as the rest of the app (fmtInt): comma thousands, dot decimals, in both languages.
const num0 = (v: number) => Math.round(v).toLocaleString("en-US");
const num1 = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });


interface DiagnosticInput {
  intervals: IntervalRecord[];
  agentIntervals?: AgentIntervalRecord[];
  slTarget?: number;
  slThreshold?: number;
  loadedHourlyCost?: number; // USD per agent-hour; assumption
  locale?: "es" | "en";
}

const DEFAULT_SL_TARGET = 0.8;
const DEFAULT_SL_THRESHOLD = 20; // seconds
const LOADED_COST_DEFAULT = 28; // USD per agent hour (loaded) — assumption stated in UI

export function runDiagnostics(input: DiagnosticInput): DiagnosticFinding[] {
  const isEn = input.locale === "en";
  const L = (es: string, en: string): string => (isEn ? en : es);
  const findings: DiagnosticFinding[] = [];
  const { intervals, agentIntervals } = input;
  const slTarget = input.slTarget ?? DEFAULT_SL_TARGET;
  const loadedCost = input.loadedHourlyCost ?? LOADED_COST_DEFAULT;

  if (intervals.length === 0) {
    findings.push({
      id: "no-data",
      severity: "critical",
      category: "data_quality",
      title: L("Sin datos de intervalos", "No interval data"),
      description: L("No hay datos que analizar. Importa un archivo o carga los datos demo.", "There is no data to analyze. Import a file or load the demo data."),
      impact: L("No se puede generar ningún diagnóstico.", "No diagnostic can be generated."),
      evidence: [],
      recommendedActions: [{ label: L("Importar datos", "Import data"), priority: "immediate" }],
    });
    return findings;
  }

  // 1. Understaffed intervals (staffing gap)
  const understaffed = intervals.filter(
    (r) =>
      typeof r.requiredStaff === "number" &&
      typeof r.actualStaff === "number" &&
      r.actualStaff < r.requiredStaff * 0.95 &&
      (r.actualVolume ?? r.offered ?? 0) > 0,
  );

  if (understaffed.length > 0) {
    // Aggregate deficit in agent-hours: sum over (required-actual) * intervalMinutes/60
    const totalDeficitAgentIntervals = understaffed.reduce<number>((acc, r) => {
      const def = (r.requiredStaff ?? 0) - (r.actualStaff ?? 0);
      return acc + Math.max(0, def) * 0.25; // 15 min = 0.25 h
    }, 0);

    // Find worst queues
    const byQueue = new Map<string, { deficit: number; intervals: number; slDip: number }>();
    for (const r of understaffed) {
      const q = r.queue ?? L("Sin cola", "No queue");
      const cur = byQueue.get(q) ?? { deficit: 0, intervals: 0, slDip: 0 };
      const def = (r.requiredStaff ?? 0) - (r.actualStaff ?? 0);
      cur.deficit += Math.max(0, def) * 0.25;
      cur.intervals += 1;
      cur.slDip += Math.max(0, slTarget - (r.serviceLevel ?? 0));
      byQueue.set(q, cur);
    }
    const worstQueue = [...byQueue.entries()].sort((a, b) => b[1].deficit - a[1].deficit)[0];
    const slDips = understaffed.filter(
      (r) => typeof r.serviceLevel === "number" && r.serviceLevel < slTarget,
    ).length;
    const avgGap =
      understaffed.reduce<number>(
        (acc, r) => acc + ((r.requiredStaff ?? 0) - (r.actualStaff ?? 0)),
        0,
      ) / understaffed.length;

    findings.push({
      id: "understaffing",
      severity: totalDeficitAgentIntervals > 10 ? "critical" : totalDeficitAgentIntervals > 4 ? "high" : "medium",
      category: "staffing_gap",
      title: L("Déficit de personal en horas pico", "Staffing deficit in peak hours"),
      description:
        L(`Se detectaron ${understaffed.length} intervalos con personal insuficiente (menos del 95% del requerido). Déficit total: ${num1(totalDeficitAgentIntervals)} horas-agente. ${slDips} de esos intervalos incumplieron el objetivo de SL.`, `Found ${understaffed.length} intervals with insufficient staff (under 95% of the requirement). Total deficit: ${num1(totalDeficitAgentIntervals)} agent-hours. ${slDips} of those intervals missed the SL target.`),
      impact: L(`El déficit se asocia a ${slDips} incumplimientos de SL. Costo aproximado de sobrecarga (horas-agente perdidas): $${Math.round(totalDeficitAgentIntervals * loadedCost)}. ${worstQueue ? `La cola más afectada es ${worstQueue[0]} (${worstQueue[1].deficit.toFixed(1)} horas-agente de déficit).` : ""}`, `The deficit is linked to ${slDips} SL misses. Approximate overload cost (lost agent-hours): $${Math.round(totalDeficitAgentIntervals * loadedCost)}. ${worstQueue ? `The most affected queue is ${worstQueue[0]} (${worstQueue[1].deficit.toFixed(1)} agent-hours of deficit).` : ""}`),
      evidence: [
        L(`Brecha promedio por intervalo: ${avgGap.toFixed(1)} agentes.`, `Average gap per interval: ${avgGap.toFixed(1)} agents.`),
        worstQueue ? L(`Peor cola: ${worstQueue[0]} — ${worstQueue[1].intervals} intervalos afectados.`, `Worst queue: ${worstQueue[0]} — ${worstQueue[1].intervals} intervals affected.`) : "",
      ].filter(Boolean),
      financialImpact: {
        label: L("Costo del déficit (agentes requeridos no presentes)", "Cost of deficit (required agents not present)"),
        value: Math.round(totalDeficitAgentIntervals * loadedCost),
        note: L(`Asunción: $${loadedCost}/hora cargada por agente. Es un costo de servicio al cliente perdido, no nómina.`, `Assumption: $${loadedCost}/hour (loaded) per agent. This is a lost customer-service cost, not payroll.`),
      },
      affectedIntervals: understaffed.length,
      recommendedActions: [
        { label: L("Revisar agendas y autorizar overtime para los intervalos de mayor déficit", "Review schedules and authorize overtime for the intervals with the largest deficit"), priority: "immediate", owner: L("Gerente intradía", "Intraday Manager") },
        { label: L("Activar agentes de reserva o cross-skill en la cola afectada", "Activate backup agents or cross-skill in the affected queue"), priority: "immediate", owner: L("Supervisor", "Supervisor") },
        { label: L("Ajustar pronóstico para reflejar el sesgo observado en picos", "Adjust the forecast to reflect the bias observed at peaks"), priority: "this_week", owner: L("Analista WFM", "WFM Analyst") },
        { label: L("Revisar shrinkage no-planificado en esos turnos", "Review unplanned shrinkage in those shifts"), priority: "today", owner: L("Gerente de operaciones", "Operations Manager") },
      ],
    });
  }

  // 2. Overstaffed intervals (wasted labor $)
  const overstaffed = intervals.filter(
    (r) =>
      typeof r.requiredStaff === "number" &&
      typeof r.actualStaff === "number" &&
      r.actualStaff > r.requiredStaff * 1.2 &&
      (r.actualVolume ?? r.offered ?? 0) > 0 &&
      (r.occupancy ?? 1) < 0.7,
  );
  if (overstaffed.length > 0) {
    const excessHours = overstaffed.reduce<number>((acc, r) => {
      const exc = (r.actualStaff ?? 0) - (r.requiredStaff ?? 0) * 1.1;
      return acc + Math.max(0, exc) * 0.25;
    }, 0);
    findings.push({
      id: "overstaffing",
      severity: excessHours > 15 ? "high" : excessHours > 6 ? "medium" : "low",
      category: "staffing_gap",
      title: L("Sobredotación en intervalos de baja demanda", "Overstaffing in low-demand intervals"),
      description: L(`${overstaffed.length} intervalos muestran más del 20% de personal por encima del requerido y ocupación baja. Exceso estimado: ${excessHours.toFixed(1)} horas-agente.`, `${overstaffed.length} intervals show more than 20% staff above requirement and low occupancy. Estimated excess: ${excessHours.toFixed(1)} agent-hours.`),
      impact: L(`Costo directo de sobre-dotación: ~$${Math.round(excessHours * loadedCost)} (asumiendo $${loadedCost}/hora cargada).`, `Direct cost of overstaffing: ~$${Math.round(excessHours * loadedCost)} (assuming $${loadedCost}/hour loaded).`),
      evidence: [
        L("Posible causa: pausas y almuerzos no escalonados o pronósticos pesimistas en horas valle.", "Possible cause: breaks and lunches not staggered, or pessimistic forecasts in off-peak hours."),
        overstaffed.some((r) => r.intervalStart && r.intervalStart.getHours() < 9)
          ? L("El exceso se concentra al inicio del día (8:00-9:00).", "The excess is concentrated at the start of the day (8:00-9:00).")
          : "",
        overstaffed.some((r) => r.intervalStart && r.intervalStart.getHours() >= 16)
          ? L("El exceso se concentra al final del día (16:00+).", "The excess is concentrated at the end of the day (16:00+).")
          : "",
      ].filter(Boolean),
      financialImpact: {
        label: L("Ahorro potencial si se ajustan horarios/breaks", "Potential savings if schedules/breaks are adjusted"),
        value: Math.round(excessHours * loadedCost),
        note: L("No se pueden eliminar agentes sin afectar SL si los picos son posteriores; pero se pueden reescalar pausas, ofrecer tiempo libre voluntario o mover a backoffice.", "Agents cannot be removed without affecting SL if the peaks come later; but breaks can be rescheduled, VTO offered, or work moved to back office."),
      },
      recommendedActions: [
        { label: L("Escalonar pausas y almuerzos para reducir superposición", "Stagger breaks and lunches to reduce overlap"), priority: "today", owner: L("WFM / Supervisores", "WFM / Supervisors") },
        { label: L("Ofrecer VTO o tiempo voluntario solo en los intervalos identificados", "Offer VTO or voluntary time off only in the identified intervals"), priority: "today", owner: L("Gerente de operaciones", "Ops Manager") },
        { label: L("Asignar trabajo de backoffice (email, chat asincrónico) a los agentes ociosos", "Assign back-office work (email, asynchronous chat) to idle agents"), priority: "immediate", owner: L("Líder de equipo", "Team Lead") },
      ],
    });
  }

  // 3. Forecast accuracy (WAPE)
  const fctPairs = intervals.filter(
    (r) => typeof r.forecastVolume === "number" && typeof r.actualVolume === "number",
  );
  if (fctPairs.length > 5) {
    const totalAbsErr = sum(fctPairs.map((r) => Math.abs((r.actualVolume ?? 0) - (r.forecastVolume ?? 0))));
    const totalActual = sum(fctPairs.map((r) => r.actualVolume ?? 0));
    const wape = totalActual > 0 ? totalAbsErr / totalActual : null;
    const bias =
      totalActual > 0
        ? sum(fctPairs.map((r) => (r.actualVolume ?? 0) - (r.forecastVolume ?? 0))) / totalActual
        : 0;

    if (wape != null && wape > 0.1) {
      findings.push({
        id: "forecast-accuracy",
        severity: wape > 0.2 ? "high" : "medium",
        category: "forecast_accuracy",
        title: L(`Precisión de pronóstico por debajo del objetivo (WAPE ${(wape * 100).toFixed(1)}%)`, `Forecast accuracy below target (WAPE ${(wape * 100).toFixed(1)}%)`),
        description: L(`El pronóstico agregado tiene un error absoluto ponderado del ${(wape * 100).toFixed(1)}%. ${bias > 0.05 ? `El pronóstico subestima el volumen real en un ${(bias * 100).toFixed(1)}% (riesgo de déficit).` : bias < -0.05 ? `El pronóstico sobreestima el volumen en un ${(Math.abs(bias) * 100).toFixed(1)}% (riesgo de sobredotación).` : "No hay sesgo agregado significativo, pero hay errores por intervalo."}`, `The aggregated forecast has a weighted absolute error of ${(wape * 100).toFixed(1)}%. ${bias > 0.05 ? `The forecast underestimates actual volume by ${(bias * 100).toFixed(1)}% (deficit risk).` : bias < -0.05 ? `The forecast overestimates volume by ${(Math.abs(bias) * 100).toFixed(1)}% (overstaffing risk).` : "No significant aggregate bias, but there are errors by interval."}`),
        impact: L("Un pronóstico desviado genera planes incorrectos, SL incumplido o costos innecesarios.", "A biased forecast produces wrong plans, missed SL or unnecessary costs."),
        evidence: [
          L(`Volumen total pronosticado: ${num0(sum(fctPairs.map((r) => r.forecastVolume ?? 0)))}.`, `Total forecast volume: ${num0(sum(fctPairs.map((r) => r.forecastVolume ?? 0)))}.`),
          L(`Volumen total real: ${num0(totalActual)}.`, `Total actual volume: ${num0(totalActual)}.`),
        ],
        recommendedActions: [
          { label: L("Reentrenar modelo con datos de las últimas 6 semanas incluyendo el día de hoy", "Retrain the model with the last 6 weeks of data, including today"), priority: "this_week", owner: L("Analista WFM", "WFM Analyst") },
          { label: L("Revisar si hubo eventos no previstos (campañas, incidencias)", "Check whether there were unplanned events (campaigns, incidents)"), priority: "today", owner: L("Analista WFM", "WFM Analyst") },
          { label: L("Introducir repronóstico intradía para las colas con mayor error", "Introduce intraday reforecasting for the queues with the largest error"), priority: "this_week", owner: L("Líder WFM", "WFM Lead") },
        ],
      });
    }
  }

  // 4. Service level breaches
  const slBreaches = intervals.filter(
    (r) => typeof r.serviceLevel === "number" && r.serviceLevel < slTarget,
  );
  if (slBreaches.length > 0) {
    const worstIntervals = [...slBreaches]
      .sort((a, b) => (a.serviceLevel ?? 0) - (b.serviceLevel ?? 0))
      .slice(0, 5)
      .map((r) => `${r.intervalLabel} ${r.queue ?? ""}: ${((r.serviceLevel ?? 0) * 100).toFixed(0)}% (${r.actualStaff ?? 0}/${r.requiredStaff ?? 0} ${L("agentes", "agents")})`);
    findings.push({
      id: "sl-breaches",
      severity: slBreaches.length > 8 ? "high" : "medium",
      category: "service_level",
      title: L(`${slBreaches.length} intervalos por debajo del objetivo de SL (${(slTarget * 100).toFixed(0)}%)`, `${slBreaches.length} intervals below SL target (${(slTarget * 100).toFixed(0)}%)`),
      description: L(`Se registraron ${slBreaches.length} incumplimientos del objetivo de nivel de servicio.`, `${slBreaches.length} service-level target misses were recorded.`),
      impact: L("Cada 1pp de caída en SL afecta la satisfacción y aumenta el abandono. Abandonos en estos intervalos correlacionan con pérdida de ventas/satisfacción.", "Each 1 pp drop in SL affects satisfaction and increases abandonment. Abandons in these intervals correlate with lost sales and satisfaction."),
      evidence: worstIntervals,
      recommendedActions: [
        { label: L("Priorizar refuerzo en los 5 intervalos con SL más bajo", "Prioritize reinforcement in the 5 intervals with the lowest SL"), priority: "immediate", owner: L("Gerente intradía", "Intraday Manager") },
        { label: L("Verificar si las desviaciones se deben a absentismo o volumen inesperado", "Check whether the deviations are due to absenteeism or unexpected volume"), priority: "today", owner: L("Supervisor", "Supervisor") },
      ],
    });
  }

  // 5. Occupancy anomalies — very high occupancy (burnout) or very low (waste)
  const highOcc = intervals.filter((r) => typeof r.occupancy === "number" && r.occupancy > 0.92);
  if (highOcc.length > 4) {
    findings.push({
      id: "high-occupancy",
      severity: highOcc.length > 10 ? "high" : "medium",
      category: "occupancy",
      title: L(`${highOcc.length} intervalos con ocupación mayor al 92%`, `${highOcc.length} intervals with occupancy above 92%`),
      description:
        L("Ocupación sostenida > 92% se asocia con agotamiento, rotación y mayor AHT por fatiga.", "Sustained occupancy above 92% is associated with burnout, turnover and higher AHT from fatigue."),
      impact: L("Riesgo de rotación y disminución de calidad; no es ahorro, es deuda con el equipo.", "Risk of turnover and lower quality; this is not a saving, it is a debt to the team."),
      evidence: highOcc.slice(0, 3).map((r) => `${r.intervalLabel}: ${((r.occupancy ?? 0) * 100).toFixed(0)}%`),
      recommendedActions: [
        { label: L("Agregar descansos cortos o aliviar con off-phone support", "Add short breaks or relieve with off-phone support"), priority: "today", owner: L("Líder de equipo", "Team Lead") },
        { label: L("Revisar si los AUX disponibles están siendo utilizados", "Check whether the available AUX codes are being used"), priority: "today", owner: L("Supervisor", "Supervisor") },
      ],
    });
  }

  // 6. Adherence (if agent data available)
  if (agentIntervals && agentIntervals.length > 0) {
    const prodIntervals = agentIntervals.filter((a) => a.isScheduledProduction);
    const adherentProd = prodIntervals.filter((a) => a.isAdherent);
    const adherence = prodIntervals.length > 0 ? adherentProd.length / prodIntervals.length : null;
    if (adherence != null && adherence < 0.92) {
      // By team
      const byTeam = new Map<string, { total: number; bad: number; site?: string }>();
      for (const a of prodIntervals) {
        const key = `${a.team ?? L("Sin equipo", "No team")} (${a.site ?? ""})`;
        const cur = byTeam.get(key) ?? { total: 0, bad: 0 };
        cur.total += 1;
        if (!a.isAdherent) cur.bad += 1;
        byTeam.set(key, cur);
      }
      const worstTeams = [...byTeam.entries()]
        .filter(([, v]) => v.total > 20)
        .map(([k, v]) => ({ team: k, rate: 1 - v.bad / v.total, bad: v.bad, total: v.total }))
        .sort((a, b) => a.rate - b.rate)
        .slice(0, 3);

      findings.push({
        id: "adherence-low",
        severity: adherence < 0.88 ? "high" : "medium",
        category: "adherence",
        title: L(`Adherencia al schedule en ${(adherence * 100).toFixed(1)}% (objetivo ≥ 94%)`, `Schedule adherence at ${(adherence * 100).toFixed(1)}% (target ≥ 94%)`),
        description: L(`${prodIntervals.length - adherentProd.length} intervalos de producción con desviación al schedule.`, `${prodIntervals.length - adherentProd.length} production intervals with schedule deviation.`),
        impact: L("Cada punto porcentual perdido de adherence representa personal que no está en la actividad correcta en el momento correcto — amplifica las brechas de staffing en picos.", "Each lost percentage point of adherence means staff who are not in the right activity at the right time, which amplifies staffing gaps at peaks."),
        evidence: worstTeams.map((t) => `${t.team}: ${(t.rate * 100).toFixed(1)}% (${t.bad}/${t.total})`),
        recommendedActions: [
          { label: L("Revisar con los equipos con menor adherencia las causas (AUX excesivo, breaks fuera de horario)", "Review causes with the teams with the lowest adherence (excess AUX, breaks outside schedule)"), priority: "today", owner: L("Supervisor", "Supervisor") },
          { label: L("Identificar si hay problemas de sistema (log-in delays) que expliquen desvíos", "Identify whether system issues (log-in delays) explain the deviations"), priority: "today", owner: L("TI / Soporte", "IT / Support") },
        ],
      });
    }
  }

  // 7. AHT anomalies by queue
  const queueGroups = new Map<string, IntervalRecord[]>();
  for (const r of intervals) {
    const q = r.queue ?? "—";
    if (!queueGroups.has(q)) queueGroups.set(q, []);
    queueGroups.get(q)!.push(r);
  }
  for (const [q, rows] of queueGroups) {
    const aht = wtdAvg(
      rows.map((r) => r.actualAht),
      rows.map((r) => r.actualVolume ?? r.offered ?? 1),
    );
    if (aht != null && aht > 540) {
      findings.push({
        id: `aht-high-${q}`,
        severity: "medium",
        category: "service_level",
        title: L(`AHT elevado en ${q}: ${Math.round(aht)}s`, `High AHT in ${q}: ${Math.round(aht)}s`),
        description: L(`El AHT ponderado en la cola ${q} supera los 9 minutos. Esto incrementa los requerimientos de personal y degrada SL si no se ajusta el plan.`, `Weighted AHT in queue ${q} exceeds 9 minutes. This increases staffing requirements and degrades SL if the plan is not adjusted.`),
        impact: L("Mayor AHT = más carga por contacto = más agentes necesarios para el mismo volumen.", "Higher AHT = more load per contact = more agents needed for the same volume."),
        evidence: [],
        recommendedActions: [
          { label: L("Auditar 10-20 contactos para identificar causas (proceso, sistema, capacitación)", "Audit 10-20 contacts to identify causes (process, system, training)"), priority: "this_week", owner: L("QA / Capacitación", "QA / Training") },
          { label: L("Actualizar el forecast AHT si el valor real es estructuralmente mayor", "Update the AHT forecast if the actual value is structurally higher"), priority: "this_week", owner: L("Analista WFM", "WFM Analyst") },
        ],
      });
    }
  }

  // Sort by severity
  const sevRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  findings.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);
  return findings;
}

export { LOADED_COST_DEFAULT as DEFAULT_LOADED_COST };
