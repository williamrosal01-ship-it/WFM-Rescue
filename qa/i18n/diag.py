import re, json
P='src/lib/diagnostics.ts'
s=open(P,encoding='utf-8').read()
# (es literal incl. delimiters, en literal incl. delimiters)
pairs = [
('"Sin datos de intervalos"','"No interval data"'),
('"No hay datos que analizar. Importa un archivo o carga los datos demo."','"There is no data to analyze. Import a file or load the demo data."'),
('"No se puede generar ningún diagnóstico."','"No diagnostic can be generated."'),
('"Importar datos"','"Import data"'),
('"Sin cola"','"No queue"'),
('"Déficit de personal en horas pico"','"Staffing deficit in peak hours"'),
('`Se detectaron ${understaffed.length} intervalos con personal insuficiente (menos del 95% del requerido). Déficit total: ${totalDeficitAgentIntervals.toFixed(1)} horas-agente. ${slDips} de esos intervalos incumplieron el objetivo de SL.`',
 '`Found ${understaffed.length} intervals with insufficient staff (under 95% of the requirement). Total deficit: ${totalDeficitAgentIntervals.toFixed(1)} agent-hours. ${slDips} of those intervals missed the SL target.`'),
('`El déficit se asocia a ${slDips} incumplimientos de SL. Costo aproximado de sobrecarga (horas-agente perdidas): $${Math.round(totalDeficitAgentIntervals * loadedCost)}. ${worstQueue ? `La cola más afectada es ${worstQueue[0]} (${worstQueue[1].deficit.toFixed(1)} horas-agente de déficit).` : ""}`',
 '`The deficit is linked to ${slDips} SL misses. Approximate overload cost (lost agent-hours): $${Math.round(totalDeficitAgentIntervals * loadedCost)}. ${worstQueue ? `The most affected queue is ${worstQueue[0]} (${worstQueue[1].deficit.toFixed(1)} agent-hours of deficit).` : ""}`'),
('`Brecha promedio por intervalo: ${avgGap.toFixed(1)} agentes.`','`Average gap per interval: ${avgGap.toFixed(1)} agents.`'),
('`Peor cola: ${worstQueue[0]} — ${worstQueue[1].intervals} intervalos afectados.`','`Worst queue: ${worstQueue[0]} — ${worstQueue[1].intervals} intervals affected.`'),
('"Costo del déficit (agentes requeridos no presentes)"','"Cost of deficit (required agents not present)"'),
('`Asunción: $${loadedCost}/hora cargada por agente. Es un costo de servicio al cliente perdido, no nómina.`','`Assumption: $${loadedCost}/loaded hour per agent. This is a lost customer-service cost, not payroll.`'),
('"Revisar agendas y autorizar overtime para los intervalos de mayor déficit"','"Review schedules and authorize overtime for the intervals with the largest deficit"'),
('"Activar agentes de reserva o cross-skill en la cola afectada"','"Activate backup agents or cross-skill in the affected queue"'),
('"Ajustar pronóstico para reflejar el sesgo observado en picos"','"Adjust the forecast to reflect the bias observed at peaks"'),
('"Revisar shrinkage no-planificado en esos turnos"','"Review unplanned shrinkage in those shifts"'),
('"Sobredotación en intervalos de baja demanda"','"Overstaffing in low-demand intervals"'),
('`${overstaffed.length} intervalos muestran más del 20% de personal por encima del requerido y ocupación baja. Exceso estimado: ${excessHours.toFixed(1)} horas-agente.`',
 '`${overstaffed.length} intervals show more than 20% staff above requirement and low occupancy. Estimated excess: ${excessHours.toFixed(1)} agent-hours.`'),
('`Costo directo de sobre-dotación: ~$${Math.round(excessHours * loadedCost)} (asumiendo $${loadedCost}/hora cargada).`',
 '`Direct cost of overstaffing: ~$${Math.round(excessHours * loadedCost)} (assuming $${loadedCost}/loaded hour).`'),
('"Posible causa: breaks y lunches no escalonados o forecasts pesimistas en horas valle."','"Possible cause: breaks and lunches not staggered, or pessimistic forecasts in off-peak hours."'),
('"El exceso se concentra al inicio del día (8:00-9:00)."','"The excess is concentrated at the start of the day (8:00-9:00)."'),
('"El exceso se concentra al final del día (16:00+)."','"The excess is concentrated at the end of the day (16:00+)."'),
('"Ahorro potencial si se ajustan horarios/breaks"','"Potential savings if schedules/breaks are adjusted"'),
('"No se pueden eliminar agentes sin afectar SL si los picos son posteriores; pero se pueden reescalar breaks, ofrecer VTO o mover a backoffice."','"Agents cannot be removed without affecting SL if the peaks come later; but breaks can be rescheduled, VTO offered, or work moved to back office."'),
('"Escalonar breaks y lunches para reducir superposición"','"Stagger breaks and lunches to reduce overlap"'),
('"Ofrecer VTO o tiempo voluntario solo en los intervalos identificados"','"Offer VTO or voluntary time off only in the identified intervals"'),
('"Asignar trabajo de backoffice (email, chat asincrónico) a los agentes ociosos"','"Assign back-office work (email, asynchronous chat) to idle agents"'),
('`Precisión de pronóstico por debajo del objetivo (WAPE ${(wape * 100).toFixed(1)}%)`','`Forecast accuracy below target (WAPE ${(wape * 100).toFixed(1)}%)`'),
('`El pronóstico agregado tiene un error absoluto ponderado del ${(wape * 100).toFixed(1)}%. ${bias > 0.05 ? `El pronóstico subestima el volumen real en un ${(bias * 100).toFixed(1)}% (riesgo de déficit).` : bias < -0.05 ? `El pronóstico sobreestima el volumen en un ${(Math.abs(bias) * 100).toFixed(1)}% (riesgo de sobredotación).` : "No hay sesgo agregado significativo, pero hay errores por intervalo."}`',
 '`The aggregated forecast has a weighted absolute error of ${(wape * 100).toFixed(1)}%. ${bias > 0.05 ? `The forecast underestimates actual volume by ${(bias * 100).toFixed(1)}% (deficit risk).` : bias < -0.05 ? `The forecast overestimates volume by ${(Math.abs(bias) * 100).toFixed(1)}% (overstaffing risk).` : "No significant aggregate bias, but there are errors by interval."}`'),
('"Un pronóstico desviado genera planes incorrectos, SL incumplido o costos innecesarios."','"A biased forecast produces wrong plans, missed SL or unnecessary costs."'),
('`Volumen total pronosticado: ${sum(fctPairs.map((r) => r.forecastVolume ?? 0)).toFixed(0)}.`','`Total forecast volume: ${sum(fctPairs.map((r) => r.forecastVolume ?? 0)).toFixed(0)}.`'),
('`Volumen total real: ${totalActual.toFixed(0)}.`','`Total actual volume: ${totalActual.toFixed(0)}.`'),
('"Reentrenar modelo con datos de las últimas 6 semanas incluyendo el día de hoy"','"Retrain the model with the last 6 weeks of data, including today"'),
('"Revisar si hubo eventos no previstos (campañas, incidencias)"','"Check whether there were unplanned events (campaigns, incidents)"'),
('"Introducir intraday reforecast para las colas con mayor error"','"Introduce intraday reforecasting for the queues with the largest error"'),
('agentes)`);','agents)`);'),
('`${r.intervalLabel} ${r.queue ?? ""}: ${((r.serviceLevel ?? 0) * 100).toFixed(0)}% (${r.actualStaff ?? 0}/${r.requiredStaff ?? 0} agentes)`',
 '`${r.intervalLabel} ${r.queue ?? ""}: ${((r.serviceLevel ?? 0) * 100).toFixed(0)}% (${r.actualStaff ?? 0}/${r.requiredStaff ?? 0} agents)`'),
('`${slBreaches.length} intervalos por debajo del objetivo de SL (${(slTarget * 100).toFixed(0)}%)`','`${slBreaches.length} intervals below SL target (${(slTarget * 100).toFixed(0)}%)`'),
('`Se registraron ${slBreaches.length} incumplimientos del objetivo de nivel de servicio.`','`${slBreaches.length} service-level target misses were recorded.`'),
('"Cada 1pp de caída en SL afecta la satisfacción y aumenta el abandono. Abandonos en estos intervalos correlacionan con pérdida de ventas/satisfacción."','"Each 1 pp drop in SL affects satisfaction and increases abandonment. Abandons in these intervals correlate with lost sales and satisfaction."'),
('"Priorizar refuerzo en los 5 intervalos con SL más bajo"','"Prioritize reinforcement in the 5 intervals with the lowest SL"'),
('"Verificar si las desviaciones se deben a absentismo o volumen inesperado"','"Check whether the deviations are due to absenteeism or unexpected volume"'),
('`${highOcc.length} intervalos con ocupación mayor al 92%`','`${highOcc.length} intervals with occupancy above 92%`'),
('"Ocupación sostenida > 92% se asocia con burnout, rotación y mayor AHT por fatiga."','"Sustained occupancy above 92% is associated with burnout, turnover and higher AHT from fatigue."'),
('"Riesgo de rotación y disminución de calidad; no es ahorro, es deuda con el equipo."','"Risk of turnover and lower quality; this is not a saving, it is a debt to the team."'),
('"Agregar descansos cortos o aliviar con off-phone support"','"Add short breaks or relieve with off-phone support"'),
('"Revisar si los AUX disponibles están siendo utilizados"','"Check whether the available AUX codes are being used"'),
('"Sin equipo"','"No team"'),
('`Adherencia al schedule en ${(adherence * 100).toFixed(1)}% (objetivo ≥ 94%)`','`Schedule adherence at ${(adherence * 100).toFixed(1)}% (target ≥ 94%)`'),
('`${prodIntervals.length - adherentProd.length} intervalos de producción con desviación al schedule.`','`${prodIntervals.length - adherentProd.length} production intervals with schedule deviation.`'),
('"Cada punto porcentual perdido de adherence representa personal que no está en la actividad correcta en el momento correcto — amplifica las brechas de staffing en picos."','"Each lost percentage point of adherence means staff who are not in the right activity at the right time, which amplifies staffing gaps at peaks."'),
('"Revisar con los equipos con menor adherencia las causas (AUX excesivo, breaks fuera de horario)"','"Review causes with the teams with the lowest adherence (excess AUX, breaks outside schedule)"'),
('"Identificar si hay problemas de sistema (log-in delays) que expliquen desvíos"','"Identify whether system issues (log-in delays) explain the deviations"'),
('`AHT elevado en ${q}: ${Math.round(aht)}s`','`High AHT in ${q}: ${Math.round(aht)}s`'),
('`El AHT ponderado en la cola ${q} supera los 9 minutos. Esto incrementa los requerimientos de personal y degrada SL si no se ajusta el plan.`','`Weighted AHT in queue ${q} exceeds 9 minutes. This increases staffing requirements and degrades SL if the plan is not adjusted.`'),
('"Mayor AHT = más carga por contacto = más agentes necesarios para el mismo volumen."','"Higher AHT = more load per contact = more agents needed for the same volume."'),
('"Auditar 10-20 contactos para identificar causas (proceso, sistema, capacitación)"','"Audit 10-20 contacts to identify causes (process, system, training)"'),
('"Actualizar el forecast AHT si el valor real es estructuralmente mayor"','"Update the AHT forecast if the actual value is structurally higher"'),
('"Revisar agendas y autorizar overtime"','"Review schedules and authorize overtime"'),
]
owners = {
 'Intraday Manager':'Gerente intradía','Supervisor':'Supervisor','WFM Analyst':'Analista WFM',
 'Operations Manager':'Gerente de operaciones','WFM / Supervisors':'WFM / Supervisores','Ops Manager':'Gerente de operaciones',
 'Team Lead':'Líder de equipo','WFM Lead':'Líder WFM','IT / Support':'TI / Soporte','QA / Training':'QA / Capacitación',
}
for en_o, es_o in owners.items():
    pairs.append((f'"{en_o}"', f'"{en_o}"'))  # placeholder, handled below
miss=[]
for es,en in pairs:
    if es==en and es.startswith('"') and es.strip('"') in owners: continue
    if es in s:
        s=s.replace(es, f'L({es}, {en})')
    else: miss.append(es[:80])
# owners: replace owner: "X" with owner: L("es","X")
for en_o, es_o in owners.items():
    tgt=f'owner: "{en_o}"'
    n=s.count(tgt)
    s=s.replace(tgt, f'owner: L("{es_o}", "{en_o}")')
    if n==0: miss.append('owner '+en_o)
# typed input + L helper
s=s.replace('  loadedHourlyCost?: number; // USD per agent-hour; assumption\n}',
            '  loadedHourlyCost?: number; // USD per agent-hour; assumption\n  locale?: "es" | "en";\n}',1)
s=s.replace('export function runDiagnostics(input: DiagnosticInput): DiagnosticFinding[] {\n',
            'export function runDiagnostics(input: DiagnosticInput): DiagnosticFinding[] {\n  const isEn = input.locale === "en";\n  const L = (es: string, en: string): string => (isEn ? en : es);\n',1)
open(P,'w',encoding='utf-8').write(s)
print('misses:', len(miss))
for m in miss: print('  ', m)
