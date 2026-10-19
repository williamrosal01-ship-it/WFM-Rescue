import re, glob, sys
sys.path.insert(0,'qa/i18n')
R = []  # (file, old, new)
def T(es,en): 
    import json
    return '{tx(%s, %s)}' % (json.dumps(es,ensure_ascii=False), json.dumps(en,ensure_ascii=False))
def TT(es,en):
    import json
    return '${tx(%s, %s)}' % (json.dumps(es,ensure_ascii=False), json.dumps(en,ensure_ascii=False))
D='src/app/app/dashboard/page.tsx'
R += [
 (D,'El puntaje de calidad del dataset activo es <strong>', T('El puntaje de calidad del dataset activo es','The active dataset quality score is')+' <strong>'),
 (D,'</strong>. Algunas métricas pueden no ser confiables.', '</strong>. '+T('Algunas métricas pueden no ser confiables.','Some metrics may not be reliable.')),
 (D,'con datos`}', TT('con datos','with data')+'`}'),
 (D,'`Faltan ${fmtInt(Math.abs(kpis.staffingGap))} agentes en total (suma de intervalos)`', '`'+TT('Faltan','Short by')+' ${fmtInt(Math.abs(kpis.staffingGap))} '+TT('agentes en total (suma de intervalos)','agents in total (sum of intervals)')+'`'),
 (D,'`Excedente de ${fmtInt(kpis.staffingGap)} agentes agregados`', '`'+TT('Excedente de','Surplus of')+' ${fmtInt(kpis.staffingGap)} '+TT('agentes agregados','agents in aggregate')+'`'),
 (D,'`Déficit agregado de ~${fmtInt(Math.abs(kpis.staffingGap) * 0.25)} horas-agente. Impacto en SL y abandono.`', '`'+TT('Déficit agregado de ~','Aggregate deficit of ~')+'${fmtInt(Math.abs(kpis.staffingGap) * 0.25)}'+TT(' horas-agente. Impacto en SL y abandono.',' agent-hours. Impact on SL and abandonment.')+'`'),
 (D,'`Excedente agregado de ~${fmtInt(kpis.staffingGap * 0.25)} horas-agente. Oportunidad de ajuste de breaks/VTO.`', '`'+TT('Excedente agregado de ~','Aggregate surplus of ~')+'${fmtInt(kpis.staffingGap * 0.25)}'+TT(' horas-agente. Oportunidad de ajuste de breaks/VTO.',' agent-hours. Opportunity to adjust breaks/VTO.')+'`'),
]
F='src/app/app/forecast/page.tsx'
R += [
 (F,'El volumen real es {fmtPct(bias)} mayor que lo pronosticado.', T('El volumen real es','Actual volume is')+' {fmtPct(bias)} '+T('mayor que lo pronosticado.','higher than forecast.')),
 (F,'El volumen real es {fmtPct(Math.abs(bias))} menor que lo pronosticado.', T('El volumen real es','Actual volume is')+' {fmtPct(Math.abs(bias))} '+T('menor que lo pronosticado.','lower than forecast.')),
]
I='src/app/app/import/page.tsx'
R += [
 (I,'`Archivo: ${importSession.filename} · ${importSession.rawRows.length} filas · ${importSession.headers.length} columnas detectadas.`',
    '`'+TT('Archivo:','File:')+' ${importSession.filename} · ${importSession.rawRows.length} '+TT('filas','rows')+' · ${importSession.headers.length} '+TT('columnas detectadas.','columns detected.')+'`'),
 (I,'`Mapeo de columnas (${mappedCount}/${importSession.mappings.length} mapeadas)`',
    '`'+TT('Mapeo de columnas','Column mapping')+' (${mappedCount}/${importSession.mappings.length} '+TT('mapeadas','mapped')+')`'),
]
N='src/app/app/intraday/page.tsx'
R += [
 (N,'`Enviar ${Math.min(6, Math.ceil(Math.abs(p.gap)))} agentes de refuerzo o activar cross-skill.`',
    '`'+TT('Enviar','Send')+' ${Math.min(6, Math.ceil(Math.abs(p.gap)))} '+TT('agentes de refuerzo o activar cross-skill.','agents as reinforcement or enable cross-skill.')+'`'),
]
H='src/app/page.tsx'
R += [
 (H,'De Excel a <span className="text-[var(--accent)]">decisiones intradía</span> en minutos',
    T('De Excel a','From Excel to')+' <span className="text-[var(--accent)]">'+T('decisiones intradía','intraday decisions')+'</span> '+T('en minutos','in minutes')),
]
ok=0; miss=[]
for f,old,new in R:
    s=open(f,encoding='utf-8').read()
    if old in s:
        s=s.replace(old,new,1); open(f,'w',encoding='utf-8').write(s); ok+=1
    else: miss.append((f,old[:90]))
print('applied',ok,'missing',len(miss))
for m in miss: print('  MISS',m)
