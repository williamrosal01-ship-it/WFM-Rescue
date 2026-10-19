# WFM Rescue web 2.8.2 — estado (base: wfm-rescue-saas-development-features)

Base confirmada por el usuario: `wfm-rescue-saas-development-features` (landing con "Cómo es un día con WFM Rescue versus cómo es hoy").
Preview: puerto 3100.

## Verificado (navegador, Playwright, 19 rutas, EN y ES)
- Errores de página: 0 en ambos idiomas.
- Botones con contraste < 3:1: 0 en tema claro y 0 en tema oscuro (antes: 4 a 9 por ruta en oscuro). Causa corregida: `.btn-accent` tenía texto blanco fijo sobre turquesa claro en oscuro.
- Desbordamiento horizontal en móvil 390 px: 0 en todas las rutas probadas (antes: hasta 184 px). Causa corregida: tarjetas y `main` sin `min-width:0`; tablas con scroll propio en móvil. El menú de /docs se oculta en móvil.
- Idioma ES: 0 a 3 textos sospechosos por ruta (páginas ya escritas en español).

## Pendiente
1. Idioma EN: 210 textos en español visibles (landing, docs, dashboard, diagnósticos, importar, informes). La base escribe las páginas en español directamente; hay que pasarlas a `useI18n`.
2. Funciones de v2.7 que no están en la base saas: Report Studio avanzado, Acciones, Agentes, Manager View, Data Explorer, Team & Access, respaldo ZIP, importación XLSX multihoja, plantillas por origen (Salesforce, Five9, Verint). No portadas.
3. Probar cada botón con clic (no solo contraste): no hecho.
4. Lupa y notificaciones: presentes en el shell; no probadas con clic.
5. Solo demo para usuarios (sin subida de archivos propios): no aplicado.
6. Logo `gauge` Lucide en el shell: no verificado.
7. QA por roles (proyecto, programación, mercado ES, mercado EN): no hecho.

## Recorrido de clics (click-audit, 19 rutas, EN y ES)
- Controles pulsados: 560 por idioma; 0 errores de página en ambos idiomas; 7 omitidos (cerrar sesión, descargas, pagos).
- Sin cambio visible (123 en EN): selects nativos, enlaces a la misma página, "Toggle theme" (cambia atributo, no texto), "Demo"/"Limpiar" ya activos. Revisados: correctos.
- Stubs reales encontrados y corregidos: Ajustes > Perfiles: "Nuevo perfil" y "Duplicar" solo mostraban un aviso. Ahora crean/duplican (verificado: 4 → 5 → 6 perfiles).
- Stub pendiente: Ajustes > "API & Integraciones" dice "Próximamente" (sin implementar).
- Botón sin etiqueta accesible en /app/diagnostics (solo icono): pendiente de nombrar.

## Cambios de esta ronda (verificados)
- Logo: icono Lucide `gauge` (SVG) en lugar del escudo propio. Verificado en /app/dashboard.
- Alcance comercial: `src/lib/config.ts` → `USER_UPLOADS_ENABLED = false`. En /app/import la zona de subida queda oculta y aparece aviso de espacio demo (EN/ES). Verificado: sin input visible, sin zona de arrastre, 0 errores de página.
- Perfiles en Ajustes: crear y duplicar funcionan (4 → 5 → 6).

## Evaluación contra demanda (fuentes consultadas, oct 2026)
- Precio por agente transparente: Assembled publica $25 / $45 / $75 por agente al mes; NICE $110–$249; Genesys CX3 $155. Pocos proveedores publican precio: la transparencia es un diferenciador.
- Mayor demanda: pronóstico y programación (~41% del ingreso del segmento) y adherencia en tiempo real (~29%), según Dataintelo. WFM Rescue ya cubre adherencia y pronóstico vs real a nivel de análisis, no como motor de programación.
- Hueco: gestión de proveedores/BPO. Una fuente del sector indica que la mayoría de plataformas no la cubren bien (fuente comercial, tomar con cautela).
- Riesgo: sin cobro integrado, no hay ventas. Pagos siguen fuera de alcance por instrucción.

## Pendiente real (lo que NO está hecho)
1. Inglés completo: ~210 textos en español en EN (portada, docs, dashboard, diagnósticos, importar, informes).
2. Portar desde v2.8.1: Report Studio avanzado, Acciones, Agentes, Manager View, Data Explorer, Team, respaldo ZIP, importación XLSX multihoja, plantillas por origen.
3. "API & Integraciones" en Ajustes dice "Próximamente": sin función.
4. Botón sin nombre accesible en Diagnósticos.
5. Lupa y notificaciones: no probadas con clic en esta ronda.
6. Revisión visual EN/ES y tema por cada ruta tras la traducción.
7. Rondas de QA por rol (proyecto, programación, mercado ES, mercado EN).

## Estado 2026-10-17 (ronda de idioma y clics)

Verificado en navegador (preview `next start` sobre el build actual):
- Auditoría de clics (`qa/browser/click-audit.mjs`): EN y ES con 560 OK, 7 omitidos, 0 errores de página. Los "sin cambio visible" (EN 156, ES 170) se revisaron y son benignos.
- Inglés: el primer revisor (`review.mjs en`) dio un falso negativo (255 líneas en español visibles). Se corrigió con `qa/browser/sweep-lang.mjs en`, que es la fuente de verdad. Resultado actual: 0 líneas en español; quedan 8 nombres propios o nativos ("Bogotá", "Español", "America/México (UTC-6)", "es-CO — Español (Colombia)", "en-US — English (US)").
- Español: `sweep-lang.mjs es` con detector de palabras en inglés. Resultado actual: 0 líneas con inglés real. Las marcas restantes son falsos positivos (palabras como "total", "actual" o "WFM") o nombres de fuente ("Avaya CMS Interval Export", "NICE CXone Adherence").
- Cambio de idioma: en Diagnósticos los hallazgos se recalculan en el idioma activo (`lang-switch.mjs`).
- Definiciones de KPI (docs), nombres de campos de importación y fórmulas: traducidas con `src/lib/texts-en.ts` (`tl(texto, idioma)`).
- Stubs: "Nuevo perfil" y "Duplicar" en Ajustes ya agregan perfiles reales (`profiles-check.mjs`).
- Eliminados: tarjeta "API & Integraciones / Próximamente" (sin función); botón de solo icono en Diagnósticos ahora tiene etiqueta.

Cambios estructurales:
- `src/lib/tx.ts`: hook `useTx()` → `tx(es, en)`. Todas las páginas de la app lo usan.
- Portada, precios y docs: la portada conserva su copy (los arreglos de funciones se movieron dentro del componente); `docs/layout.tsx` lleva el `metadata` del glosario.
- `diagnostics.ts`: `runDiagnostics({ locale })` produce títulos, descripciones, impactos, acciones y owners en el idioma pedido.

Decisiones:
- Nombres propios y nombres nativos ("Bogotá", "Español", "America/México (UTC-6)", "en-US — English (US)") quedan exentos de la regla "sin mezcla".
- Port desde v281: se hace en orden completo; el primer bloque es Report Studio (no iniciado en esta ronda).

Pendiente (no hecho en esta ronda):
- Metadatos del `<head>` de `layout.tsx`: el título de pestaña es neutro ("WFM Rescue"); la descripción SEO sigue en español porque los metadatos son estáticos del servidor (limitación conocida).
- Textos de error de parseo que solo aparecen con archivos reales no se han revisado en EN (no entraron en el barrido de rutas).
- Portar desde v281 (en curso): Report Studio completo, Acciones, Agentes, Manager View, Data Explorer, Team & Access, respaldo ZIP, XLSX multihoja, plantillas por origen.
- Pagos pendientes; usuarios solo ven demo; logo Lucide `gauge`; banner de `verify`; documentos v2.7.1; QA secuencial (proyecto, programación, mercado ES y EN).

## Report Studio (ronda 2026-10-17, port desde v281)

Portado en esta base (saas), sobre los intervalos canónicos:
- Ruta `/app/studio`: biblioteca de 9 plantillas, informes guardados y plantillas propias (localStorage, sin nube).
- Editor `/app/studio/[id]`: varios gráficos por informe; tipo (KPI, barras, apiladas, líneas, dona, tabla), dimensión (intervalo, fecha, cola, canal, sitio, skill), métricas con agregación (suma, promedio, mínimo, máximo, conteo), subir/bajar, duplicar, guardar como plantilla, imprimir, eliminar y CSV por gráfico.
- Cada plantilla usa el gráfico que corresponde a su dato. Ninguna usa área.
- "Tabla de informes" (`/app/reports`) conserva la tabla ad-hoc anterior y enlaza al estudio.

Verificado:
- `qa/unit/run-studio-tests.sh`: 14 pruebas unitarias de la lógica (agregación, tasa de abandono como suma/suma, brecha de dotación, orden de grupos, CSV, plantillas válidas, formatos por idioma). 14/14.
- `qa/browser/studio-e2e.mjs es|en`: flujo completo (plantillas, cambio de gráfico, CSV, persistencia tras recarga, totales de tabla = KPI). 17/17 en cada idioma, incluida la revisión de mezcla de idiomas en lista y editor.
- `qa/browser/studio-visual.mjs`: sin desbordamiento horizontal en escritorio ni móvil (claro y oscuro).
- Barrido de idioma: EN 8 nombres propios; ES 29 falsos positivos conocidos.

No portado todavía (pendiente de v281):
- Campos calculados, mezclas (blends), varias páginas, controles de filtro y arrastrar y soltar fuentes.
- Acciones, Agentes, Manager View, Data Explorer, Team & Access, respaldo ZIP, XLSX multihoja, plantillas por origen (Salesforce, Five9, Verint).
- Gráficos a nivel de agente (adherencia y AUX por agente): la base saas solo tiene datos agregados por intervalo en el estudio.
- Logo Lucide `gauge`, pagos pendientes, modo solo demo para usuarios, banner de `verify`, documentos v2.7.1, QA secuencial.

## Plantillas por origen (2026-10-17)
- Plantillas XLSX de 3 hojas (Intervalos, Horarios, Asistencia) + Instrucciones + Diccionario para Salesforce, Five9, Verint y otra fuente. Descarga en /app/import (tarjeta "Plantillas por origen de datos").
- `parseXlsx` detecta las hojas de plantilla en ES o EN y une las tres por fecha + intervalo + cola + canal. Hojas sin nombre de plantilla: se usa la primera (o la indicada).
- Verificado: `./node_modules/.bin/tsx --test qa/unit/template.test.ts` 20/20 (también con TZ=America/Guatemala); typecheck OK; build19 OK; `qa/browser/templates-e2e.mjs` ES 22/22 y EN 22/22; click-audit ES y EN 578 OK, 0 errores; sweep ES 28 líneas (falsos positivos), EN 8 líneas (exentas).
- Origen en el diccionario: solo Five9 (Date, Hour of Day, Skill, Calls, Calls Answered, Abandoned (count), Service Level (% of records), Speed of answer threshold) y Verint (horarios y adherencia) donde hay fuente pública. Lo demás "—" hasta validar con exportación real del cliente.
- Compuerta por plan (`src/lib/config.ts`): demo = sin carga y sin plantillas; pro y enterprise = ambas. `CURRENT_PLAN = "demo"` hasta tener facturación. La tarjeta de plantillas ya no aparece en demo.
- Verificado: `qa/browser/plan-gating-e2e.mjs` ES 4/4 y EN 4/4 (demo sin plantillas, aviso menciona Pro y Enterprise). La vista con plantillas visible se verificó antes del cambio (22/22 por idioma); con demo no es alcanzable, así que no se reprobó de nuevo.
- Data Explorer portado: `/app/explorer` (`src/lib/explorer.ts`, `src/app/app/explorer/page.tsx`). Muestra el conjunto activo de intervalos (la base saas tiene un solo conjunto; v281 tenía varios). Búsqueda en todas las celdas, filtro de columnas, límite 100/250/500, exportación CSV con BOM. Pruebas: `qa/unit/explorer.test.ts` 7/7; `qa/browser/explorer-e2e.mjs` ES 13/13 y EN 13/13.
- Pendiente: selector de hoja en la UI de importación (el parser ya acepta el nombre); etiquetas de campos canónicos en la página de importación duplicadas ("Interval Interval") por truncar la etiqueta a la primera palabra.

## Estado 2026-10-18 (cierre de esta tanda)

Ver también `docs/PLANES-Y-DATOS.md` (planes, dónde viven los datos, tamaños, límites de Supabase).

### Hecho y verificado
- **Planes:** solo Demo (gratis, sin carga ni plantillas) y Pro (de pago). Enterprise retirado de configuración, landing y Ajustes. Pro se activa con `NEXT_PUBLIC_WFM_PLAN=pro` en el build. Sin cobro integrado: el sitio se entrega como Demo.
- **Landing:** tarjetas Demo y Pro. Se retiraron las promesas sin función real (comparación de periodos, comparativo multisemana, SSO, API, PDF "ejecutivo"). Precio Pro $29/usuario/mes: **pendiente de confirmar**.
- **Idioma de los datos:** selector en la configuración de importación, independiente de la interfaz. Números (1.234,5 / 1,234.5), porcentajes y fechas (día/mes o mes/día). Unit tests 7/7.
- **Plantillas XLSX:** selector de idioma propio (independiente de la interfaz). Verificado en ES y EN.
- **Carga de Pro (E2E):** XLSX con varias hojas, cambio de hoja (vuelve a mapear), idioma de datos, guardar y usar perfil, procesar, restauración tras recargar, cancelar sin perder datos, eliminar perfil. ES 20/20, EN 20/20.
- **Datos en el navegador:** intervalos cargados en IndexedDB; se restauran al abrir la app. Demo no se guarda. Una carga propia reemplaza a la demo.
- **Perfiles:** almacén real en `localStorage` (`src/lib/import-profiles.ts`). Ajustes ya no muestra perfiles de ejemplo.
- **Gráficos:** se retiró el área de Dashboard, Service Level, Dotación, Ocupación, Capacidad y NLH. Ahora son líneas, y el volumen de capacidad son barras.
- **Idioma:** textos fijos en español corregidos en importación, dashboard, reportes, pronóstico y landing. Barrido EN: solo nombres propios y nombres de idioma (exentos). Barrido ES: revisado, falsos positivos.
- **Versión:** `2.8.2` en `package.json` y en el pie de la app. `npm run verify` = typecheck + pruebas + build. El banner "v2.7.0" venía de `scripts/qa-v2.7.0.cjs` del proyecto v2.7.1 y no se portó.
- **Documentos:** `ENTREGA-*.md` marcados como históricos; descripciones de planes y gráficos de área corregidas.
- **Chips duplicados** "Interval Interval" corregidos (etiqueta completa). **Logo:** icono Lucide `gauge` como SVG (ya estaba).

### Pruebas (build Demo, 3100; build Pro, 3101)
- `npm run test:unit`: Report Studio 14/14; plans, plantillas, explorador e idioma de datos 39/39.
- `npm run typecheck` y `npm run build` (Demo y Pro): exit 0.
- `plan-gating-e2e` ES 4/4, EN 4/4. `explorer-e2e` ES 13/13, EN 13/13. `studio-e2e` ES 17/17, EN 17/17.
- `templates-e2e` (Pro): ES 22/22, EN 22/22. `pro-flow-e2e` (Pro): ES 20/20, EN 20/20.
- `click-audit`: EN 587 OK, 3 omitidos, 0 errores; ES 587 OK, 3 omitidos, 0 errores.
- `overflow` a 390 px en 18 rutas: sin desbordamiento. `unlabeled`: 0 sin etiqueta. `lang-switch`: 0 errores.

### Errores encontrados y corregidos en esta tanda
- Plantillas y selector de idioma de datos quedaban en español en la interfaz en inglés (valor inicial antes de leer el idioma guardado).
- La carga automática de la demo corría antes de restaurar los datos guardados (la restauración se saltaba).
- Una carga propia se mezclaba con la demo (338 filas en vez de 2).
- Botón "Cancelar" de mapeo borraba todo el conjunto cargado.
- "Guardar perfil" no hacía nada; perfiles de Ajustes eran de ejemplo.
- Explorador mostraba "All" en ES (valor de datos del agregado de sitio); ahora se muestra "Todos" en ES.
- Subtítulos "Área con…" en Service Level y Ocupación, y "Producto" / "Probar demo" fijos en la landing.

### Pendientes (no hechos)
- Respaldo ZIP de la versión 2.8.1 (no portado).
- Cobro y cuentas. Precio de Pro por confirmar.
- Revisión de copy de la página de inicio con y sin "WFM Rescue".
- QA por mercado (hispano y anglo) sobre datos reales.
- Comparación de periodos, comparativo multisemana, SSO/API, RBAC: no existen en esta versión (retirados de la landing).

## Estado 2026-10-18 (ronda final: respaldo, mercados, precio y anual)

Las listas de pendientes de secciones anteriores quedan superadas por esta sección. Detalle de planes, datos, precios y pruebas: `docs/PLANES-Y-DATOS.md`.

### Hecho y verificado (builds Demo y Pro, Playwright)
- **Respaldo ZIP** (Pro, Ajustes): portado desde v281 como ZIP propio sin compresión (`src/lib/backup-zip.ts`). Incluye intervalos, perfiles y reportes. Un archivo ajeno o un ZIP comprimido se rechazan con mensaje localizado. Unitarias 7/7; `pro-backup-e2e` ES 14/14 y EN 14/14. Corrección de esta ronda: un XLSX se reportaba como "faltan partes"; ahora dice que no es un respaldo.
- **Mercado (formatos de datos):** `pro-market-e2e` 16/16. Archivo español (1.234,5; día/mes) y archivo inglés (1,234.5; mes/día), con las cuatro combinaciones de idioma de interfaz y de datos. Valores y fecha verificados.
- **Precio y anual:** landing con toggle mensual ($29) y anual ($24, chip "Anual: 17 % menos"). Los dos precios **no están validados por un experto**; los términos de cancelación anual están marcados como pendientes de aprobación. `landing-pricing-e2e` ES 14/14 y EN 14/14 (Demo); con `--pro` 14/14 en cada idioma.
- **Diagnósticos:** números con el mismo formato que el resto de la app ("1,384.5", "69,279"). Fórmula de ocupación en ES sin identificadores en inglés ni en español ("Tiempo logueado productivo").
- **Versión:** `npm run verify` = typecheck + pruebas + build; exit 0. El banner "v2.7.0" no existe en este `verify` (venía de scripts de staging no portados).

### Pruebas finales (build Demo en 3100)
- `npm run verify`: exit 0. Unitarias: Report Studio 14/14; planes, plantillas, explorador, idioma de datos y respaldo 46/46.
- `plan-gating` ES 4/4 y EN 4/4; `explorer` ES 13/13 y EN 13/13; `studio` ES 17/17 y EN 17/17.
- `pro-flow` ES 20/20 y EN 20/20; `templates` ES 22/22 y EN 22/22 (build Pro).
- Barrido estricto (`sweep-strict`): ES revisado a mano; los residuos son frases correctas que el filtro marca por palabras comunes, más nombres propios y de dataset. EN: 33 marcas, las mismas revisadas en rondas anteriores (nombres de idioma, zona y falsos positivos); no se reabrieron en esta ronda.
- Desbordamiento a 390 px: sin desbordamiento en 9 rutas Pro y 12 rutas Demo.
- `unlabeled`: 0 controles sin etiqueta en `/app/import`, `/app/settings`, `/app/reports`.
- `click-audit` sobre el build final de Demo: ES 591 OK, 3 omitidos, 0 errores de página (`/tmp/click-es7.log`). EN: 591 OK, 3 omitidos, 0 errores (`/tmp/click-en7.log` hasta `/app/intraday` y `/tmp/click-en7b.log` para el resto). La corrida EN se atascó una vez en `/app/service-level` (espera de Playwright, no un error de página); se repitió solo con las rutas restantes y pasó.
- Estado vacío en Pro: al entrar sin datos guardados, Pro carga la demo con etiqueta de demo (diseño intencional). Los textos de estado vacío se verifican al limpiar datos; el barrido de Pro (ES y EN) no muestra inglés en importar, ajustes, explorador ni informes.

### Pendientes (decisión del usuario)
1. **Precio de Pro**: validar con un experto antes de publicar ($29 mensual, $24 anual). La investigación sugiere probar $19–29 mensual; no es validación experta.
2. **Términos de cancelación anual** ("cancela cuando quieras" = detener la renovación, sin reembolso del año en curso): aprobación antes de publicar.
3. **Copy de la portada con y sin "WFM Rescue"**: revisar variantes y elegir.
4. **Pro sin archivo propio**: confirmar que se muestre la demo con etiqueta (comportamiento actual) o un estado vacío.
5. **Cobro y cuentas**: no integrados; fuera de alcance por instrucción.
