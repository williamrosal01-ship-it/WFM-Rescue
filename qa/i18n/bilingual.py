import re, json
# ---------- 1) texts-en.ts: add ES_TEXT (EN source -> ES) and EN formulas
src=open('qa/i18n/kpi.py',encoding='utf-8').read()
ES_TEXT = {
 "Service Level":"Nivel de servicio",
 "Average Speed of Answer (ASA)":"Tiempo promedio de respuesta (ASA)",
 "Average Handle Time (AHT)":"Tiempo promedio de manejo (AHT)",
 "Occupancy":"Ocupación",
 "Abandonment Rate":"Tasa de abandono",
 "Required Staff (FTE)":"Personal requerido (FTE)",
 "Staffing Gap":"Brecha de dotación",
 "Forecast Accuracy (1 − WAPE)":"Precisión del pronóstico (1 − WAPE)",
 "Schedule Adherence":"Adherencia al horario",
 "Conformance":"Conformidad",
 "Attendance Rate":"Tasa de asistencia",
 "AUX Non-Productive Ratio":"Proporción de AUX no productivo",
 "Occupancy = (Handle Time Total) / TiempoLogueadoProductivo":"Ocupación = (Tiempo de manejo total) / TiempoLogueadoProductivo",
 "Abandoned / Offered":"Abandonados / Ofrecidos",
 "Required = Erlang-C(Volumen, AHT, Intervalo, SL, Umbral, Shrinkage)":"Requeridos = Erlang-C(Volumen, AHT, Intervalo, SL, Umbral, Shrinkage)",
 "Actual − Required":"Real − Requeridos",
 "1 − Σ|Actual − Forecast| / ΣActual":"1 − Σ|Real − Pronóstico| / ΣReal",
 "AHT = (Talk + Hold + ACW) / Atendidos":"AHT = (Conversación + Espera + ACW) / Atendidos",
 "Average Handle Time":"Tiempo promedio de manejo",
 "Team / Team Lead":"Equipo / Líder de equipo",
 "Talk time (sec)":"Tiempo de conversación (seg)",
 "Skill":"Skill",
 "Site":"Sitio",
 "Service Level (0-1 or %)":"Nivel de servicio (0-1 o %)",
 "Scheduled staff":"Personal programado",
 "Scheduled activity":"Actividad programada",
 "SL Threshold (seconds)":"Umbral de SL (segundos)",
 "SL Target (0-1 or %)":"Objetivo de SL (0-1 o %)",
 "Required staff":"Personal requerido",
 "Queue / Queue Name":"Cola / Nombre de cola",
 "Occupancy (0-1 or %)":"Ocupación (0-1 o %)",
 "Interval start (datetime)":"Inicio de intervalo (fecha y hora)",
 "Interval label (HH:MM)":"Etiqueta de intervalo (HH:MM)",
 "Interval end (datetime)":"Fin de intervalo (fecha y hora)",
 "Hold time (sec)":"Tiempo de espera (seg)",
 "Forecast volume (calls/contacts)":"Volumen pronosticado (llamadas/contactos)",
 "Forecast AHT (seconds)":"AHT pronosticado (segundos)",
 "Date":"Fecha",
 "Channel":"Canal",
 "Calls offered":"Llamadas ofrecidas",
 "Calls answered":"Llamadas atendidas",
 "Available / ready agents":"Agentes disponibles / listos",
 "Agent name":"Nombre del agente",
 "Agent ID":"ID de agente",
 "Actual volume":"Volumen real",
 "Actual staff / logged in":"Personal real / logueado",
 "Actual activity":"Actividad real",
 "Actual AHT (seconds)":"AHT real (segundos)",
 "Abandoned":"Abandonadas",
 "AUX duration (sec)":"Duración de AUX (seg)",
 "AUX code":"Código AUX",
 "ASA (seconds)":"ASA (segundos)",
 "ACW / Wrap (sec)":"ACW / Wrap (seg)",
}
EN_FORMULA = {
 "SL = AtendidosDentroUmbral / (Ofrecidos − AbandonadosAntesDeUmbral)":"SL = AnsweredWithinThreshold / (Offered − AbandonedBeforeThreshold)",
 "ASA = Σ TiempoEspera / Atendidos":"ASA = Σ WaitTime / Answered",
 "AHT = (Talk + Hold + ACW) / Atendidos":"AHT = (Talk + Hold + ACW) / Answered",
 "Adherente = TiempoEnActividadProgramada / TiempoTotalProgramado":"Adherence = TimeInScheduledActivity / TotalScheduledTime",
 "TiempoProductivoTotal / TiempoProgramadoTotal":"TotalProductiveTime / TotalScheduledTime",
 "(AgentesProgramados − Ausencias) / AgentesProgramados":"(ScheduledAgents − Absences) / ScheduledAgents",
 "(TiempoNoProductivo) / TiempoPagado":"(NonProductiveTime) / PaidTime",
 "TiempoAUXNoProductivo / TiempoLogueado":"AUXNonProductiveTime / LoggedInTime",
}
# AHT formula ES appears under the ES key "AHT = (Talk + Hold + ACW) / Atendidos" (source). Keep one mapping.
for k,v in list(EN_FORMULA.items()): pass
ES_TEXT_FORMULA = {"Occupancy = (Handle Time Total) / TiempoLogueadoProductivo":None}
# Build EN_TEXT entries (ES source -> EN) from kpi.py output, plus formulas
body_old=open('src/lib/texts-en.ts',encoding='utf-8').read()
en_entries=re.findall(r'^  (".*?"): (".*?"),$', body_old, flags=re.M)
en_map={json.loads(a):json.loads(b) for a,b in en_entries}
en_map.update(EN_FORMULA)
en_map.pop('AHT = (Talk + Hold + ACW) / Atendidos', None)
es_map=ES_TEXT
es_map.pop('AHT = (Talk + Hold + ACW) / Atendidos', None)
def block(name, d):
    return f"export const {name}: Record<string, string> = {{\n" + '\n'.join(f'  {json.dumps(k,ensure_ascii=False)}: {json.dumps(v,ensure_ascii=False)},' for k,v in d.items()) + "\n};\n"
ts = ("// Static bilingual copy for KPI definitions and import field labels.\n"
      "// Keys are the exact source strings (Spanish for EN_TEXT, English for ES_TEXT).\n"
      "// tl(text, locale) returns the translation for the active locale, or the source text.\n\n"
      + block('EN_TEXT', en_map) + "\n" + block('ES_TEXT', es_map) + '''
export function tl(text: string, locale: "es" | "en"): string {
  if (locale === "en") return EN_TEXT[text] ?? text;
  return ES_TEXT[text] ?? text;
}
''')
open('src/lib/texts-en.ts','w',encoding='utf-8').write(ts)
print('EN entries', len(en_map), 'ES entries', len(es_map))
