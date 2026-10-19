# WFM Rescue · Cambios y guía de despliegue (base saas + mejoras)

Base de apariencia: `wfm-rescue-saas-development.zip` (Drive). Esta carpeta es esa base con las mejoras acumuladas (`wfm-rescue-web` 2.8.2) más los cambios de esta ronda.

## 1. Qué cambió en esta ronda
- **Build:** `DATABASE_URL` ya no es obligatoria para compilar. Sin ella, `/api/health` responde `database: "not_configured"`.
- **Textos:** en inglés ya no aparecen "Objetivo" ni "Presentes" en KPI y dashboard.
- **Contraste en oscuro:** las gráficas usaban azul marino fijo (`#102a43`), que se veía negro. Ahora usan `--c-actual`. En capacidad, las barras de referencia son grises y las de Erlang-C naranjas; la leyenda describe esos colores.
- **Report Studio:**
  - Botones **Editar** y **Ver a pantalla completa**. Por defecto se abre en vista.
  - En vista y al imprimir se ocultan todos los controles de edición (`.edit-only`) y la barra superior (`.no-print`).
  - Exporta CSV, XLSX y PDF del informe (una hoja o tabla por gráfico).
- **Exportación CSV, XLSX y PDF** en Reports (tabla de informes) y en las 12 páginas analíticas (Dashboard, Intradía, Nivel de servicio, Personal, Adherencia y AUX, Asistencia, Capacidad, Pronóstico vs real, Ocupación, NLH, Diagnósticos, Salud de datos). Exportan los intervalos con los filtros globales aplicados.
- **Canal Email** en los datos demo (Voice / Chat / Email). El volumen total no cambia: Email sale del pool de Voice.
- **Eliminado** el botón "Guardar vista" de Reports: solo mostraba un aviso y no guardaba nada.

## 2. Verificación ejecutada (2026-10-18)
- `npm run typecheck`: 0 errores.
- `npm run build`: OK.
- `npm run test:unit`: 14/14 (Studio) y 46/46 (planes, plantillas, explorador, idioma de datos, respaldo ZIP).
- Descargas reales (Playwright): CSV, XLSX y PDF de Dashboard, Capacidad, Pronóstico y Reports. Archivos abiertos: XLSX con 1 hoja de 337×21 y PDF con texto y paginación.
- Report Studio (EN y ES): en vista 0 controles de edición visibles; en impresión 0 controles, 0 barra lateral y 0 botones.
- Auditoría de clics (EN, tema oscuro, 20 rutas): 0 errores de página. Quedan elementos sin efecto visible que revisar (ver sección 4).
- Gráfica de capacidad en oscuro: revisada en captura.

## 3. Supabase (opcional para esta versión)
La app funciona completa en el navegador. La base de datos solo se usa en `/api/health` (consulta `select 1`).
1. Crea un proyecto en Supabase (plan Free sirve para probar).
2. Project Settings → Database → Connection string → **URI** (usa el pooler, puerto 6543).
3. Reemplaza `[YOUR-PASSWORD]` por tu contraseña de base de datos.
4. **No ejecutes migraciones ni SQL** para esta versión: no hay tablas en uso. El esquema de `src/db/schema.ts` queda para una fase futura.
5. Guarda la URL como variable `DATABASE_URL` (ver Netlify).

## 4. Netlify
1. Importa el repositorio o carpeta. `netlify.toml` ya define build `npm run build`, plugin `@netlify/plugin-nextjs` y Node 20.
2. Site settings → Environment variables:
   - `DATABASE_URL` = URI de Supabase (opcional).
3. Deploy. Verifica `https://TU-SITIO/api/health` → `{"ok":true,"database":"ok"}` (o `not_configured` si no la pusiste).
4. Si cambias variables, haz *Clear cache and deploy*.

## 5. Almacenamiento: qué se guarda y dónde
- **Datos cargados (CSV/XLSX):** en memoria de la pestaña. Se pierden al recargar. No se envían a ningún servidor.
- **Informes de Report Studio:** `localStorage` del navegador (`studio-store.ts`).
- **Perfiles de importación:** `localStorage` (solo mapeos, nunca filas).
- **Respaldo:** ZIP descargable desde Configuración.
- **Base de datos (Supabase):** no guarda datos de clientes en esta versión.
- Cálculo de referencia (estimación): 1 mes con 20 colas y 2 canales ≈ 1,4 M filas; en Postgres ~420 MB, lo que llenaría el límite de 500 MB del plan Free. Por eso los datos crudos no se guardan allí.

## 6. Pendientes conocidos (no hechos)
- Carga de archivos en demo: el input funciona; el aviso dice "Pro" pero no hay bloqueo por plan ni interruptor de plan en código.
- Exportación por tabla en cada analítica: hoy exporta los intervalos filtrados; las tablas calculadas por página no se exportan aún.
- Selector "Idioma de datos" por fuente: existe en Importar; no aparece aún en Reports ni en Configuración.
- "Vistas guardadas" (Reports) no existe; sería una función nueva.
- Auditoría de clics completa en ES y en modo claro: pendiente de re-ejecutar.
- Logo: la base web usa el icono `gauge`; el saas original usa el escudo con pulso. Decisión pendiente.

## Ronda de vista previa (oct 2026) — cambios

- **Gauges** (Occupancy, NLH, Attendance): pista más visible, trazo más grueso, escala 0%/100%, valor grande y etiqueta legible en claro y oscuro. Etiqueta de NLH traducida.
- **Error % por intervalo** (Forecast vs Actual): colores fijos verde (dentro de ±10%), morado (por encima, +10%), ámbar (por debajo, −10%) y gris (sin dato). La causa de las barras negras era usar `<rect>` en lugar de `<Cell>` dentro de Recharts.
- **Cabeceras en móvil**: título, Download y "View NLH →" ya no se cortan. Tablas anchas se desplazan horizontalmente dentro de su tarjeta.
- **AUX Detail**: ahora tiene Download (CSV, XLSX, PDF).
- **NLH y Occupancy**: textos fijos en español que salían en inglés ahora usan el selector de idioma.
- **Report Studio**: plantilla "Full operations report" (8 widgets) y "Adherence and staffing" (3 widgets).

### Qué hacer en Supabase y Netlify
- Supabase: nada nuevo en esta ronda. No se añadieron tablas ni migraciones.
- Netlify: publicar el build normal. No hay variables nuevas.

### Base de datos
- Los datos crudos viven en el navegador (IndexedDB). Supabase guarda solo metadatos y, a futuro, suscripciones.

## Ronda de publicación (oct 2026)

### Netlify: lo que hay que hacer
1. Conectar el repositorio (o subir el ZIP) en Netlify. `netlify.toml` ya define: build `npm run build`, Node 20, plugin `@netlify/plugin-nextjs`.
2. Variables de entorno: ninguna es obligatoria. La demo funciona sin base de datos.
   - `NEXT_PUBLIC_WFM_PLAN` = `demo` (por defecto) o `pro` (solo si se publica la versión Pro).
   - `DATABASE_URL` solo si quieres que `/api/health` reporte la base (opcional).
3. Desplegar. El sitio es público en cuanto Netlify termine el build.

### Supabase: qué hacer hoy
- **Nada obligatorio.** La app no lee ni escribe tablas en Supabase. No hay que ejecutar SQL ni `drizzle-kit push`.
- `src/db/schema.ts` define tablas para el futuro (organizaciones, usuarios, suscripciones). Ninguna página las usa todavía.
- Cuando se active cuenta y pagos, se ejecuta el esquema contra Supabase con `DATABASE_URL` y se revisa RLS antes de publicar.

### Qué cambió en esta ronda
- **PDF por reporte:** cabecera profesional, KPIs con título, gráficas vectoriales (barras, líneas, objetivo) y tabla resumen. Idioma según el selector. Lógica en `src/lib/pdf-report.ts` y `src/lib/report-presets.ts`.
- **Paleta de gráficas:** una sola paleta en `src/lib/chart-palette.ts`. Turquesa = real, índigo = pronóstico/programado, verde/ámbar/rosa = semáforo, morado = real por encima del pronóstico. Las variables `--c-actual` y `--c-forecast` estaban invertidas (causaban barras negras); ya corregidas en claro y oscuro.
- **Tooltips y textos de gráficas en oscuro:** texto claro sobre fondo de tarjeta.
- **Gráficas en móvil:** una regla CSS impedía dibujarlas (ancho 0). Quitada.
- **Portada:** selector EN | ES en la cabecera y pantalla de elección de idioma la primera vez que se entra (`src/components/landing-language.tsx`).
- **Ajustes:** zonas horarias ampliadas (26), sin "Colombia" en la lista, por defecto Guatemala.
- **AUX Detail:** PDF con gráfica y KPIs.

### Pendiente (no hecho en esta ronda)
- Report Studio: PDF de informes creados con gráficas por widget (hoy exporta tabla).
- Plantillas Pro en Import y Forecast; gating de carga por plan.
- Revisión EN/ES completa de todas las pantallas con el nuevo PDF.
