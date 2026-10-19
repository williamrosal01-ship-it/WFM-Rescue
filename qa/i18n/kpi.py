import re, json
src=open('src/lib/wfm.ts',encoding='utf-8').read()
lits=[m.group(1) for m in re.finditer(r'"((?:[^"\\]|\\.)*)"', src)]
EN_BY_PREFIX = {
"Porcentaje de contactos atendidos dentro del umbral":"Percentage of contacts answered within the agreed time threshold (e.g. 80% in 20 seconds).",
"Ofrecidos menos abandonos cortos":"Offered minus short abandons (configurable).",
"Los abandonos antes del umbral se excluyen":"Abandons before the threshold are excluded from the denominator by default (common industry practice).",
"La agregación diaria no es un promedio simple":"Daily aggregation is not a simple average; it is recalculated from totals when available.",
"Distintos proveedores calculan SL":"Different vendors calculate SL differently (Genesys, Avaya, NICE, etc.). Check your ACD's convention.",
"Tiempo promedio que un contacto espera":"Average time a contact waits in queue before being answered.",
"Tiempo promedio total por contacto":"Average total handle time per contact: talk + hold + after-call work (ACW). Used to calculate workload and requirement.",
"Porcentaje del tiempo registrado (loggeado)":"Percentage of logged-in time that an agent is actually busy handling contacts or in after-call work.",
"No incluye tiempo en AUX no productivo":"Does not include unproductive AUX time if your ACD reports it separately.",
"Porcentaje de contactos que cuelgan":"Percentage of contacts that hang up or abandon before being answered.",
"Se añade shrinkage para convertir":"Shrinkage is added to convert 'bodies in chairs' into agents required in the schedule.",
"Bajo-dimensiona cuando hay abandono":"Under-sizes when there is significant abandonment or non-Poisson arrivals (chat with backlog).",
"Porcentaje del tiempo que el agente está en la actividad correcta":"Percentage of time the agent is in the correct activity according to their schedule. Distinguish from 'conformance' (total worked vs total scheduled).",
"Total de tiempo trabajado versus programado":"Total time worked versus scheduled; does not penalize temporary deviations if the time is recovered.",
"Porcentaje de agentes programados que efectivamente":"Percentage of scheduled agents who actually showed up.",
"Porcentaje del tiempo pagado que los agentes NO":"Percentage of paid time in which agents are NOT handling contacts (breaks, training, meetings, coaching, absences, unproductive AUX, etc.).",
"Se separa en shrinkage planificado":"Split into planned shrinkage (PTO, training, meetings) vs unplanned (absences, excess AUX).",
"Proporción del tiempo logueado en códigos AUX":"Share of logged-in time spent in unproductive AUX codes.",
"Occupancy > 92% sostenido":"Sustained occupancy above 92% predicts burnout and turnover.",
"Diferencia entre agentes presentes":"Difference between agents present and agents required. Negative = deficit; positive = surplus.",
"Erlang-C asume cero abandonos":"Erlang-C assumes zero abandons; actual SL may differ from modeled SL.",
"Dotación necesaria para alcanzar":"Staffing needed to reach the SL target. Calculated with Erlang-C + configured shrinkage.",
"Adherence mide 'en la actividad correcta":"Adherence measures 'in the right activity at the right time'; Conformance measures the total at the end of the day.",
}
pairs={}
missing=[]
for pref,en in EN_BY_PREFIX.items():
    m=[t for t in lits if t.startswith(pref)]
    if not m: missing.append(pref); continue
    full=m[0].encode().decode('unicode_escape') if '\\' in m[0] else m[0]
    pairs[full]=en
# Also the exact 'WAPE' literal and es-en static entries used by KPI text
for t in lits:
    if t.startswith('Precisión del pronóstico por volumen usando WAPE'):
        pairs[t]="Forecast accuracy by volume using WAPE (Weighted Absolute Percentage Error). Better than MAPE because it does not inflate errors from small intervals."
    if t.startswith('Adherence mide') or t.startswith('Dotación necesaria'):
        pass
body='\n'.join(f'  {json.dumps(k,ensure_ascii=False)}: {json.dumps(v,ensure_ascii=False)},' for k,v in pairs.items())
ts=f'''// English text for static KPI definitions (src/lib/wfm.ts KPI_DEFINITIONS).
// Keys are the exact Spanish source strings; the docs page uses tl(text, locale).
export const EN_TEXT: Record<string, string> = {{
{body}
}};

export function tl(text: string, locale: "es" | "en"): string {{
  return locale === "en" ? (EN_TEXT[text] ?? text) : text;
}}
'''
open('src/lib/texts-en.ts','w',encoding='utf-8').write(ts)
print('entries', len(pairs), 'missing prefixes', missing)
