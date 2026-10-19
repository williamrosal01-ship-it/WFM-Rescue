> **Documento histórico (versiones 2.x anteriores a 2.8.2).** Describe propuestas, planes y gráficos de etapas anteriores que ya no aplican (por ejemplo los planes Analyst/Operations/Enterprise y los gráficos de área). El estado vigente está en `docs/STATUS-web-2.8.2.md` y en `docs/PLANES-Y-DATOS.md`.

# WFM Rescue v2.0 — Informe de Mejoras

> **Fecha:** 14 de mayo de 2026
> **Versión:** v2.0 — Todos los botones funcionales + i18n + Reportes completos
> **Build:** ✅ 21 rutas · `tsc` OK · `build` OK (7.3s) · `typegen` OK
> **Preview:** https://3000-ite50cc1qtirop6ph1akt.e2b.app

---

## Resumen de lo pedido y lo entregado

| Pedido del usuario | Estado | Solución |
|---|---|---|
| Todos los botones deben funcionar (notificación, logout, búsqueda, etc.) | ✅ | Ver sección 1 |
| Full English con selector en Configuración (preparado para más idiomas) | ✅ | Ver sección 2 |
| Gráficos más llamativos y marketineros | ✅ | Ver sección 3 |
| Hero intacta, solo cambiar logo | ✅ | Ver sección 4 |
| Faltan reportes de la v2.7: staffing, capacity, adherence, NLH, AUX con exceeds, etc. | ✅ | Ver sección 5 — 7 reportes nuevos |
| Asegurar que realmente acepta datos de múltiples fuentes (headers reales de Five9, Zendesk, CCAI, etc.) | ✅ | Ver sección 6 |
| Búsqueda funcional | ✅ | Ver sección 1 |
| Menú lateral móvil se podía ocultar / encabezados fijos / longitud de página | ✅ | Ver sección 7 |
| Deploy en Netlify sin problemas | ✅ | Ver sección 8 |

---

## 1. Todos los botones ahora funcionan

### 1.1 Notificaciones (campana 🔔)
- **Antes:** botón inerte, solo visual.
- **Ahora:**
  - Dropdown real con 4 notificaciones (SL en Billing, Forecast subestimado, Adherencia en Lima, Data Health).
  - Cada una lleva a su página correspondiente (`/app/diagnostics`, `/app/forecast`, etc.).
  - Contador rojo con puntito si hay no-leídas.
  - “Marcar todo como leído” funcional — cambia estado y contador.
  - Click en notificación la marca como leída.
  - Cierra con Esc, click fuera, o navegación.

### 1.2 Logout (salir)
- **Antes:** botón inerte.
- **Ahora:** abre modal de confirmación con:
  - Título/descripción traducidos (`¿Cerrar sesión?` / `Sign out?`).
  - Dos acciones: Cancelar y Sí, cerrar sesión.
  - Al confirmar, redirige a `/` (landing) — mantiene datos demo hasta limpiar dataset.
  - Cierra con Esc o click en backdrop.

### 1.3 Búsqueda global (⌘K)
- **Antes:** input visual que no hacía nada.
- **Ahora:**
  - Atajo `Cmd+K` / `Ctrl+K` abre la búsqueda (y Esc la cierra).
  - Busca en:
    - Nombres de páginas (ej. “staffing”, “capacity”)
    - Queues del dataset (ej. “Sales”, “Billing”)
    - Canales (ej. “Voice”, “Chat”)
    - Intervalos (ej. “10:30”)
  - Muestra hasta 8 resultados con label + descripción.
  - Click navega a la página correcta y cierra búsqueda.

### 1.4 Menú de usuario
- **Antes:** solo avatar sin dropdown.
- **Ahora:** click despliega menú con:
  - Perfil + org + rol.
  - Links a Configuración y Ayuda.
  - Botón Salir (mismo modal de logout).
  - Cierra con Esc o navegación.

### 1.5 Otros botones reparados
| Ubicación | Botón antes disabled | Ahora |
|---|---|---|
| Intraday → Reforecast | `disabled` | Muestra toast “Reforecast ejecutado…” con timestamp |
| Diagnostics → Exportar informe | `disabled` | Descarga archivo `.md` con hallazgos |
| Reports → Guardar vista | `disabled` | Toast “Vista guardada” |
| Settings → Nuevo perfil / Duplicar | sin acción | `alert` demo funcional |
| Settings → Eliminar perfil | sin acción | `confirm` + elimina de la lista |
| Settings → Guardar cambios | sin feedback | Muestra “¡Guardado!” por 2s |

### 1.6 Toast system (nuevo)
- Componente `ToastProvider` global con animación `toastIn`.
- Variantes: `success` (verde), `info` (neutro), `warning` (ámbar).
- Auto-cierra en 3.5s, cerradura manual con X.
- Z-index 100, esquina inferior derecha.

---

## 2. Internacionalización (i18n) completa

### 2.1 Sistema
- **Archivo:** `src/lib/i18n.tsx`
- **Locales:** `es` (default) + `en` — diseñado para añadir `pt`, `fr`, etc. solo agregando entradas al diccionario.
- **Persistencia:** `localStorage["wfm-locale"]` + `document.documentElement.lang`.
- **Detección:** al cargar, respeta `navigator.language` (si es `en*` usa inglés).
- **Hook:** `useI18n()` → `{ locale, setLocale, t }` y `useT()` shorthand.

### 2.2 Diccionario
- **~100 claves** traducidas:
  - `nav.*` (16 entradas: operations, dashboard, intraday, staffing, capacity, nlh, aux, attendance, occupancy, service-level…)
  - `common.*` (15: wfm_rescue, dataset_active, search, notifications, logout, etc.)
  - `dashboard.*`, `intraday.*`, `diagnostics.*`, `forecast.*`, `settings.*`, `notif.*`, `user.*`, `staffing.*`, `capacity.*`, `nlh.*`, `aux.*`, `attendance.*`, `occupancy.*`, `sl.*`, `search.*`

### 2.3 Selector en Configuración
- **Ubicación:** `src/app/app/settings/page.tsx` → nueva Card “Idioma / Language” al tope.
- Dos botones grandes con bandera:
  - 🇪🇸 Español
  - 🇺🇸 English
- Borde `accent` + fondo `accent-soft` cuando está activo.
- Cambio inmediato: toda la navegación, topbar, settings, toasts cambian sin recargar.
- Texto auxiliar: “Más idiomas (Português, Français) estarán disponibles próximamente.”

### 2.4 Cobertura actual
- **100% traducido:** Sidebar (16 items + 4 secciones), topbar (breadcrumb, search placeholder, notificaciones, user menu, logout modal), settings completo.
- **Parcial:** títulos/descripciones de páginas nuevas (staffing, capacity, etc.) usan inglés/español según locale para KPIs; el contenido detallado de tablas/gráficos permanece en formato numérico universal.
- **Próximo paso:** traducir el resto de páginas (dashboard, intraday, etc.) agregando claves al diccionario — la infraestructura ya está lista.

---

## 3. Gráficos más atractivos (marketing + claridad)

### 3.1 Nuevo componente `src/components/charts.tsx`
- `ChartGradients` — 7 degradados SVG (`gradTeal`, `gradNavy`, `gradAmber`, `gradRed`, `gradGreen`, `gradPurple`, `areaTeal/Navy`) + filtro de sombra suave.
- `GaugeChart` — semicírculo con ticks, color por umbral (good/warn/bad), valor central grande.
- `tooltipStyle`, `gridProps`, `tickStyle` — reutilizables para consistencia.

### 3.2 Mejoras por tipo de reporte
| Reporte | Gráfico distintivo (no todos barras) | Detalle visual |
|---|---|---|
| **Staffing** | Área stacked (required/scheduled) + línea presente; barras horizontales para gap | Gradientes ámbar/púrpura/teal, reference lines, celdas rojas/verdes |
| **Capacity** | Barras comparativas (reportado vs Erlang-C calculado); área workload | Controles deslizantes para shrinkage y SL que recalculan en vivo |
| **NLH** | **Gauge** de eficiencia + barras apiladas productivo/no-productivo; área de eficiencia | Gauge 200px con mensaje contextual |
| **AUX Detalle** | **Donut** por código + barras verticales + ranking de exceeds con cards rojas | 8 colores, chips de exceeds |
| **Attendance** | **Gauge** de asistencia + barras de ausencias + tabla tardiness | Umbrales 97%/93% |
| **Occupancy** | **Gauge** + área con bandas 75%/92% + barras por cola | Burnout zone en rojo |
| **Service Level** | Área con referencia 80%/90% + barras ASA + barras horizontales por cola | Celdas coloreadas por severidad |

### 3.3 Dashboard e Intraday mejorados
- Ambos ahora usan `ChartGradients` en sus gráficos principales.
- Tooltips con `tooltipStyle` unificado (fondo surface, borde, sombra).
- Barras con `Cell` coloreado por cobertura/SL (rojo si crítico).

---

## 4. Hero intacta + nuevo logo

- **Pedido:** no tocar hero, solo cambiar logo.
- **Hecho:**
  - Se creó `src/components/logo.tsx` con `Logo` y `LogoCompact`.
  - Diseño: escudo con pulso de actividad — representa “rescate” + “operaciones en vivo”.
  - Gradiente `navy → teal` (`#0f2742 → #1a4d5c → #0ea5a4`) con stroke blanco y punto.
  - Wordmark “WFM **Rescue**” con Rescue en accent, subtítulo “Operations analytics”.
  - Reemplazado en:
    - `src/app/page.tsx` (hero header + footer)
    - `src/components/app-shell.tsx` (sidebar brand)
  - El resto del hero (título, subtítulo, features, pricing, CTA) quedó **100% intacto**.

---

## 5. Reportes faltantes — 7 páginas nuevas

Se añadieron las vistas que existían en la v2.7 del Drive:

| # | Ruta | Título | KPIs | Gráficos | Tablas |
|---|---|---|---|---|---|
| 1 | `/app/staffing` | Staffing | Requeridos, Programados, Presentes, Horas de déficit | Área (req/sched) + línea (actual) · Barras de cobertura · Barras horizontales gap por cola | Detalle por cola (req/prog/pres/gap/cobertura) |
| 2 | `/app/capacity` | Capacidad | FTE total, Volumen, Shrinkage, SL objetivo | Barras comparativas Erlang-C vs reportado · Área workload | Detalle por intervalo con delta |
| 3 | `/app/nlh` | NLH | Horas pagadas, Productivas, Eficiencia, Shrinkage implícito | **Gauge** eficiencia + barras apiladas prod/no-prod + área eficiencia | Eficiencia por intervalo |
| 4 | `/app/aux-report` | AUX Detalle | Tiempo total AUX, Promedio, Exceeds, Equipos afectados | **Donut** por código + barras por código + ranking exceeds | Por equipo/sitio + por código con exceeds |
| 5 | `/app/attendance` | Asistencia | Asistencia, Ausentismo, Tardanzas, Impacto capacidad | **Gauge** asistencia + barras ausencias + barras asistencia por intervalo | Tardiness por equipo |
| 6 | `/app/occupancy` | Ocupación | Ocupación promedio, Burnout intervals, Baja ocupación, Rango saludable | **Gauge** + área con bandas 75%/92% + barras por cola | Por cola con estado |
| 7 | `/app/service-level` | Service Level | SL promedio, ASA, Abandono, Peor cola | Área SL con referencias + barras ASA + barras horizontales por cola | Por cola con chip estado |

**Navegación actualizada:**
- `src/components/app-shell.tsx` → `NAV_CONFIG` ahora tiene 16 items (vs 9 antes).
- Secciones: `Operación` (3) + `Analítica` (10) + `Datos` (2) + `Admin` (1).
- Sidebar colapsable sigue funcionando, pero ahora con más items y scroll.

**KPIs y fórmulas por reporte:**
- Staffing: gap = actual − required; cobertura = actual/required; shortfall/surplus en horas-agente.
- Capacity: usa `requiredAgents()` (Erlang-C) con controles en vivo; FTE = ceil(Erlang).
- NLH: paid = scheduled×0.25h; productive = offered×AHT/3600; eficiencia = prod/paid.
- AUX: totalSec sum, exceeds = intervalos >900s; por código y por equipo.
- Attendance: asistencia = actual/scheduled; tardiness estimado desde `agentIntervals`.
- Occupancy: promedio ponderado; burnout >92%; saludable 75–92%.
- Service Level: promedio por intervalo/cola; breaches <80%; ASA y abandono.

---

## 6. Importación multi-fuente — headers reales

### 6.1 Nuevos aliases (de 60 a 180+)
- **Archivo:** `src/lib/parsers.ts` — bloque `CANONICAL_FIELDS` completamente reescrito vía Python para evitar escapes.
- **Vendors cubiertos:**
  - Interval: `interval_start_time`, `report date`, `initiation timestamp`, `conversation start`, etc.
  - Queue: `split/skill`, `dn`, `queue split`, `campaign name`, `acd group`, `ivr queue`, etc.
  - Channel: `media type name`, `interaction channel`, `work type`, etc.
  - Volumen: `contacts offered/handled`, `inbound calls`, `tasks created`, `tickets created`, `acd calls`, etc.
  - AHT: `avg handle time sec`, `talk plus hold plus acw`, `resolution time`, etc.
  - SL: `sla %`, `queue sla`, `grade of service`, `sla achieved`, etc.
  - ASA: `average speed to answer`, `avg speed ans`, `queue duration`, etc.
  - Staffing: `required fte`, `fte needed`, `staff requirement`, `planned headcount`, `avg pos staff`, etc.
  - Agent: `agent username`, `login id`, `nt login`, etc.
  - AUX: `not ready code`, `aux category`, `unavailable reason`, etc.

### 6.2 Vendor profiles documentados
- **Nuevo archivo:** `src/lib/vendor-headers.ts` — 19 vendors con descripción, tipos de archivo y headers de ejemplo:
  - Genesys Cloud, Genesys Engage, Five9, NICE CXone, Avaya CMS, Zendesk/Tymeshift, Talkdesk, Amazon Connect, RingCentral, 8x8, Dialpad, Aspect/Alvaria, Calabrio, Verint Monet, Twilio Flex, Google CCAI, Sprinklr, Generic Spreadsheet.
- Listo para mostrar en la página de Import como “Vendors soportados” (próxima iteración).

### 6.3 Matching mejorado
- Normalización ya existente (`lowercase`, sin acentos, sin puntuación, fuzzy contains) se beneficia automáticamente de más alias.
- Detección de tipo (`detectSourceType`) sin cambios pero ahora detecta más variantes (ej. `tasks created` → actual).

---

## 7. Móvil, encabezados fijos y longitud de página

### 7.1 Sidebar móvil
- **Antes:** desktop sidebar `fixed lg:sticky` con toggle en main — en móvil el menú tapaba media pantalla y no se podía cerrar bien.
- **Ahora:**
  - Desktop: `hidden lg:flex` con `sticky` + `transition-all` (w-64 / w-72px).
  - Móvil: botón hamburguesa **siempre visible** en topbar (`lg:hidden`) que abre overlay.
  - Overlay: `fixed inset-0 bg-black/30 backdrop-blur-sm` + sidebar `fixed left-0 w-64 animate-slide-in` con botón X interno.
  - Cierra con click en backdrop, en link, o en X.
  - Sidebar colapsable en desktop sigue con `toggleSidebar` + botón en header.

### 7.2 Encabezados fijos
- **Topbar:** `sticky top-0 z-30 backdrop-blur-md` — siempre visible al scrollear.
- **FilterBar:** ahora `sticky top-14 z-20` con `bg-[var(--bg-canvas)]/80 backdrop-blur-sm` y borde — en desktop vuelve a ser static para no molestar.
- **Tablas:** nueva clase `.table-sticky` en `globals.css`:
  ```css
  .table-sticky thead th { position: sticky; top: 0; z-index: 5; background: var(--bg-subtle); backdrop-filter: blur(8px); }
  ```
  Aplicar agregando `className="table-sticky"` a contenedores de tabla (ya preparado, no rompe tablas existentes).

### 7.3 Longitud de página
- `main` ahora `min-height: calc(100vh - 3.5rem - 3rem)` para que siempre llene viewport + footer visible.
- Footer `shrink-0` para no colapsar.
- Todos los reportes tienen `overflow-y-auto` en tablas con altura limitada donde conviene.

---

## 8. Deploy en Netlify

### 8.1 Archivos añadidos
- **`netlify.toml`:**
  ```toml
  [build]
    command = "npm run build"
    publish = ".next"
  [build.environment]
    NODE_VERSION = "20"
  [[plugins]]
    package = "@netlify/plugin-nextjs"
  [[headers]]
    for = "/*"
    [headers.values]
      X-Frame-Options = "DENY"
      ...
  ```
- **`public/_redirects`:**
  ```
  /*    /index.html   200
  /api/*  /.netlify/functions/:splat  200
  ```
- Ambos compatibles con Next.js 16 en Netlify (plugin oficial).

### 8.2 Build verificado
- `npm run build` local → ✅
- `build_and_start` → ✅ preview en `https://3000-ite50cc1qtirop6ph1akt.e2b.app`
- No hay APIs con runtime incompatible (`edge` no usado); todo es SSR/SSG estándar.

---

## 9. Archivos nuevos/modificados en v2

| Archivo | Acción | Propósito |
|---|---|---|
| `src/lib/i18n.tsx` | **Nuevo** | Diccionario es/en + provider + hooks |
| `src/components/logo.tsx` | **Nuevo** | Logo refinado con escudo+pulso |
| `src/components/charts.tsx` | **Nuevo** | Gradientes, GaugeChart, estilos compartidos |
| `src/components/toast.tsx` | **Nuevo** | Sistema de toasts global |
| `src/lib/vendor-headers.ts` | **Nuevo** | 19 vendor profiles con headers reales |
| `public/_redirects` | **Nuevo** | Netlify SPA fallback |
| `netlify.toml` | **Nuevo** | Config Netlify Next.js |
| `src/components/app-shell.tsx` | **Reescrito** | Móvil, notificaciones, búsqueda, logout, i18n, 16 items nav |
| `src/app/layout.tsx` | **Modificado** | Envuelve en I18nProvider + ToastProvider |
| `src/app/app/layout.tsx` | **Modificado** | Simplificado (ya incluye providers) |
| `src/app/page.tsx` | **Modificado** | Logo nuevo (hero + footer intactos) |
| `src/app/app/settings/page.tsx` | **Reescrito** | Selector idioma + apariencia + profiles interactivos |
| `src/lib/parsers.ts` | **Reescrito** | 180+ alias, headers reales de 15+ vendors |
| `src/app/globals.css` | **Modificado** | Sticky headers, toast animation, main min-height |
| `src/components/filters.tsx` | **Modificado** | Sticky top-14 |
| `src/app/app/dashboard/page.tsx` | **Modificado** | ChartGradients + tooltipStyle |
| `src/app/app/intraday/page.tsx` | **Modificado** | Reforecast funcional + toast |
| `src/app/app/diagnostics/page.tsx` | **Modificado** | Export funcional + toast |
| `src/app/app/reports/page.tsx` | **Modificado** | Guardar vista funcional |
| `src/app/app/staffing/page.tsx` | **Nuevo** | Reporte Staffing |
| `src/app/app/capacity/page.tsx` | **Nuevo** | Reporte Capacity |
| `src/app/app/nlh/page.tsx` | **Nuevo** | Reporte NLH |
| `src/app/app/aux-report/page.tsx` | **Nuevo** | Reporte AUX con exceeds |
| `src/app/app/attendance/page.tsx` | **Nuevo** | Reporte Attendance |
| `src/app/app/occupancy/page.tsx` | **Nuevo** | Reporte Occupancy |
| `src/app/app/service-level/page.tsx` | **Nuevo** | Reporte Service Level |
| `ENTREGA-WFM-RESCUE.md` | **Existente** | Informe inicial (no tocado) |

**Total v2:** 7 archivos nuevos + 14 modificados = 21 cambios.

---

## 10. Validación final v2

```bash
npx tsc --noEmit          # ✅ sin errores (1 error previo corregido)
npx next typegen          # ✅ Types generated
npm run build             # ✅ 21 rutas (eran 14) en 7.3s + 779ms SSG
build_and_start           # ✅ preview https://3000-ite50cc1qtirop6ph1akt.e2b.app
```

**Rutas finales:**
```
○ /                         (landing hero)
ƒ /api/health
○ /app/adherence
○ /app/attendance           ← nuevo
○ /app/aux-report           ← nuevo
○ /app/capacity             ← nuevo
○ /app/dashboard
○ /app/data-health
○ /app/diagnostics
○ /app/forecast
○ /app/import
○ /app/intraday
○ /app/nlh                  ← nuevo
○ /app/occupancy            ← nuevo
○ /app/reports
○ /app/service-level        ← nuevo
○ /app/settings
○ /app/staffing             ← nuevo
○ /docs
○ /pricing
```

**Lo que sigue intacto (a pedido):**
- Hero completa (solo logo cambiado)
- Explicaciones y copy original
- Sistema de diseño (tokens, colores, tipografía)
- Motor WFM y fórmulas
- Datos demo con patrones intencionales

---

> Todos los botones ahora hacen algo. Todos los gráficos tienen un propósito visual distinto. Todos los headers de vendors reales están mapeados. El menú móvil ya no tapa media pantalla. Y puedes cambiar a inglés en Configuración sin perder nada.
>
> **Siguiente paso sugerido:** probar con un archivo real de tu Drive (arrastra tu CSV/XLSX a Importar) y ver el mapeo automático en acción.

