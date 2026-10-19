import json
def T(es,en): return '{tx(%s, %s)}' % (json.dumps(es,ensure_ascii=False), json.dumps(en,ensure_ascii=False))
def TT(es,en): return '${tx(%s, %s)}' % (json.dumps(es,ensure_ascii=False), json.dumps(en,ensure_ascii=False))
ES_UNIF="WFM Rescue unifica tus exportaciones de WFM, ACD, asistencia y adherencia; audita la calidad de los datos; y te dice qué está pasando, por qué, qué cuesta y qué hacer al respecto."
EN_UNIF="WFM Rescue unifies your WFM, ACD, attendance and adherence exports, audits data quality, and tells you what is happening, why, what it costs and what to do about it."
ES_DOC73="Las fórmulas documentadas aquí son las que usa el motor de cálculo real del producto. Si detectas una desviación respecto a la convención de tu ACD o proveedor, puedes ajustar los parámetros en Configuración. WFM Rescue sigue la convención más extendida en la industria pero siempre te muestra los supuestos."
EN_DOC73="The formulas documented here are the ones the product's real calculation engine uses. If you detect a deviation from your ACD or vendor convention, you can adjust the parameters in Settings. WFM Rescue follows the most widespread industry convention but always shows you the assumptions."
ES_DOC169="Las métricas se añaden según la demanda de los clientes. Si necesitas una métrica específica de tu operación (p. ej. SLA por skill con umbrales específicos, Net Promoter Score integrado, FCR por intervalo), abre un issue o contáctanos."
EN_DOC169="Metrics are added based on customer demand. If you need a metric specific to your operation (e.g. SLA per skill with specific thresholds, built-in Net Promoter Score, FCR per interval), open an issue or contact us."
ES_DIAG1="Cada hallazgo incluye evidencia concreta (colas, intervalos, métricas), impacto estimado y acciones con prioridad sugerida."
EN_DIAG1="Each finding includes concrete evidence (queues, intervals, metrics), estimated impact and actions with a suggested priority."
ES_DIAG2="Las estimaciones en USD usan un costo cargado de "
ES_DIAG2b=" por agente; puedes ajustar este valor según tu operación."
EN_DIAG2b=" per agent; you can adjust this value to fit your operation."
pairs = [
 ('src/app/page.tsx', ES_UNIF, None, EN_UNIF),
 ('src/app/docs/page.tsx', ES_DOC73, None, EN_DOC73),
 ('src/app/docs/page.tsx', ES_DOC169, None, EN_DOC169),
 ('src/app/app/diagnostics/page.tsx', ES_DIAG1, None, EN_DIAG1),
 ('src/app/app/diagnostics/page.tsx', ES_DIAG2, None, "Estimates in USD use a loaded cost of "),
 ('src/app/app/diagnostics/page.tsx', ES_DIAG2b, None, EN_DIAG2b),
 ('src/app/app/forecast/page.tsx', "El plan se quedó corto. Considera reforecast intradía para picos.", None, "The plan fell short. Consider an intraday reforecast for peaks."),
 ('src/app/app/aux-report/page.tsx', "`Intervalos con >${AUX_THRESHOLD_SEC/60} min no-productivo`", None, "`Intervals with >${AUX_THRESHOLD_SEC/60} min unproductive`"),
 ('src/app/app/reports/page.tsx', "`Informe (${visible.length} filas)`", None, "`${tx(\"Informe\", \"Report\")} (${visible.length} ${tx(\"filas\", \"rows\")})`"),
]
import re
for f,old,_,en in pairs:
    s=open(f,encoding='utf-8').read()
    if old not in s: print('MISS', f, old[:60]); continue
    if f.endswith('diagnostics/page.tsx') and old==ES_DIAG2:
        s=s.replace(old, T(ES_DIAG2,"Estimates in USD use a loaded cost of ")+' <strong>${loadedCost}/hora</strong>',1) if False else s.replace(old, '{'+'tx(%s, %s)'%(json.dumps(ES_DIAG2,ensure_ascii=False),json.dumps("Estimates in USD use a loaded cost of ",ensure_ascii=False))+'}',1)
    elif f.endswith('diagnostics/page.tsx') and old==ES_DIAG2b:
        s=s.replace(old, '{'+'tx(%s, %s)'%(json.dumps(ES_DIAG2b,ensure_ascii=False),json.dumps(EN_DIAG2b,ensure_ascii=False))+'}',1)
    elif old.startswith('`'):
        s=s.replace(old, en, 1)
    else:
        if old in ('El plan se quedó corto. Considera reforecast intradía para picos.',):
            s=s.replace(old, '{'+'tx(%s, %s)'%(json.dumps(old,ensure_ascii=False),json.dumps(en,ensure_ascii=False))+'}',1)
        else:
            s=s.replace(old, '{'+'tx(%s, %s)'%(json.dumps(old,ensure_ascii=False),json.dumps(en,ensure_ascii=False))+'}',1)
    open(f,'w',encoding='utf-8').write(s)
    print('ok', f, old[:40])
