# Planes, datos y límites — WFM Rescue 2.8.2

Estado: vigente a 2026-10-18. Reemplaza las decisiones de planes Analyst / Operations / Enterprise de versiones anteriores.

## 1. Planes

Solo existen dos planes. No hay plan "free" distinto de Demo.

| | **Demo** (gratis) | **Pro** (de pago) |
|---|---|---|
| Para qué | Probar la plataforma completa con datos ilustrativos | Analizar los datos propios del equipo |
| Datos | Demo ilustrativo (no es un feed en vivo) | Carga de XLSX y CSV propios |
| Análisis, Explorador de datos, Report Studio | Sí, con datos demo | Sí, con datos propios |
| Carga de archivos propios | **No** | Sí |
| Plantillas XLSX por origen (Salesforce, Five9, Verint, otras) | **No** | Sí |
| Idioma de los datos (es / en) | — | Sí |
| Perfiles de importación guardados | — | Sí |
| Respaldo ZIP (descargar y restaurar) | — | Sí |
| Precio | Gratis | Mensual: **$29 por usuario al mes**. Anual (opción en la landing): **$24 por usuario al mes**, facturado al año |

**Enterprise fue retirado del producto.** Sus funciones (multiorganización, permisos por rol, SSO, conectores API) no existen en esta versión y no se prometen en la landing.

Funciones que estaban en textos anteriores y **no existen**, por lo que se retiraron de la landing: comparación de periodos, comparativo de pronóstico multisemana, SSO / SAML, integración directa con API de CCaaS, retención configurable y acuerdo de nivel de servicio. "Imprimir / guardar como PDF" sí existe (desde Report Studio, con la impresión del navegador).

### Precio de Pro: decisión pendiente

- **Precio publicado en la landing:** $29 por usuario al mes; anual $24 por usuario al mes (≈17 % menos), con el chip "Anual: 17 % menos".
- **Validación:** no hay validación de un experto en precios. La investigación de mercado (oct. 2026) muestra precios de referencia, pero no los valida un especialista. Lectura de esos datos: Pro a $29 queda entre las opciones de entrada de programación (~$25–45 por agente al mes) y las suites empresariales (~$110 o más). El producto es de análisis con carga de archivos, no de programación ni de intradía, así que una alternativa razonable para probar es $19–29 mensual. **No publicar sin decisión del usuario.**
- **Precio anual:** $24 es una propuesta sin validar.

### Términos de cancelación anual: pendientes de aprobación

La landing muestra la opción anual con la frase "cancela cuando quieras". Antes de publicar hay que aprobar estos términos (hoy marcados como pendientes en la landing):

- La cancelación detiene la renovación. **No hay reembolso del año en curso.**
- El acceso continúa hasta el final del periodo pagado.
- Un cambio de plan o de precio se aplica en la siguiente renovación.

Sin aprobación, la frase "cancela cuando quieras" no debe usarse sin estas aclaraciones.

### Cobro

- **No hay cobro integrado.** Mientras no exista, el sitio público se entrega como **Demo**. Los pagos quedan fuera de alcance.
- Pro se activa en el *build* con la variable `NEXT_PUBLIC_WFM_PLAN=pro`. Es una decisión de despliegue, no de usuario. Sin la variable, el build es Demo.
- Descuento por compañía: no se implementa (no es verificable). Si se quiere un descuento, la alternativa propuesta es facturación anual.

## 2. Dónde viven los datos

**Decisión:** los intervalos crudos de los clientes **no se guardan en Supabase**. Viven en el navegador del cliente.

| Dato | Dónde | Notas |
|---|---|---|
| Intervalos cargados (filas) | Navegador, IndexedDB (`wfm-rescue` / `datasets`) | Se guarda el último conjunto cargado. Se restaura al abrir la app. |
| Perfiles de importación (solo mapeos, sin filas) | Navegador, `localStorage` (`wfm-import-profiles`) | |
| Reportes de Report Studio | Navegador, `localStorage` (`wfm-studio-v1`) | |
| Idioma, tema, sesión de demo | Navegador | |
| Usuarios, organizaciones, metadatos de carga y vistas | Supabase (solo si se usa) | Hoy Supabase **no** se usa para datos de clientes. |

Consecuencias para el cliente:

- Los datos no salen del navegador. El pie de la app lo dice.
- El botón "Limpiar" de la barra de filtros borra el conjunto guardado.
- Borrar los datos del sitio en el navegador también los borra. No hay respaldo en servidor.
- **Respaldo ZIP (Pro, Ajustes):** el cliente descarga un ZIP con sus intervalos, perfiles y reportes, y lo restaura en otro navegador o equipo. El ZIP se crea en el navegador; no se sube a ningún servidor. Es el único respaldo: el cliente debe guardarlo.
- Un conjunto de cinco millones de filas o más puede exceder la cuota de almacenamiento del navegador. La cuota depende del navegador y del disco y **no se verificó** en este entorno.

## 3. Tamaño estimado de los datos

Supuesto: intervalos de 15 minutos (96 por día), 365 días por año.
Estimación de tamaño por fila: 300 bytes en Postgres y 400 bytes en el navegador. Son cálculos, no mediciones.

| Escenario | Colas | Canales | Periodo | Filas | Postgres (×300 B) | Navegador (×400 B) |
|---|---|---|---|---|---|---|
| Pequeño | 5 | 1 | 1 año | 175.200 | ~53 MB | ~70 MB |
| Mediano | 20 | 2 | 1 año | 1.401.600 | ~420 MB | ~561 MB |
| Grande | 60 | 3 | 2 años | 12.614.400 | ~3.784 MB | ~5.046 MB |

Metadatos: unos 95 KB por organización, lo que cabe para unas 5.000 organizaciones.

## 4. Límites del plan gratuito de Supabase

Valores según la documentación de Supabase consultada en esta sesión (octubre de 2026):

- Base de datos: 500 MB por proyecto. Al superarlo pasa a solo lectura.
- Almacenamiento de archivos: 1 GB.
- Egreso: 5 GB (más 5 GB de caché).
- 2 proyectos activos.
- El proyecto se pausa tras 7 días sin actividad.
- Sin respaldos automáticos.
- Plan Pro de Supabase: $25 al mes, 8 GB de disco, 100 GB de almacenamiento, 250 GB de egreso y respaldos diarios.

**Conclusión:** un cliente mediano ya llena los 500 MB del plan gratuito. Por eso los intervalos no se guardan en Supabase. Supabase sirve solo para metadatos.

## 5. Idioma de los datos

El idioma de los datos es independiente del idioma de la interfaz. Se elige en la configuración de importación.

| Idioma de los datos | Fecha `05/10/2026` | Número `1.234,5` / `1,234.5` | Porcentaje |
|---|---|---|---|
| Español | 5 de octubre (día/mes) | 1234.5 | `82,5%` → 0.825 |
| English | 10 de mayo (mes/día) | `1,234.5` → 1234.5 | `82.5%` → 0.825 |

- Si una parte de la fecha es mayor que 12, el orden se resuelve solo (`25/10/2026` se lee como 25 de octubre en cualquier idioma).
- Las fechas ISO (`2026-10-05 08:15`) no cambian con el idioma.
- Las plantillas XLSX tienen su propio selector de idioma. Se puede descargar una plantilla en inglés aunque la interfaz esté en español, y viceversa. La plataforma reconoce encabezados en ambos idiomas.
- **Formato de números en pantalla:** coma para miles y punto para decimales, en ambos idiomas (`1,384.5`). Es la convención de Guatemala y de México, y la misma que usan todos los KPI de la app.

## 6. Pruebas que respaldan este documento (2026-10-18)

- `npm run verify` (typecheck, pruebas unitarias y build): exit 0.
- `npm run test:unit`: Report Studio 14/14; planes 5/5, plantillas 20/20, explorador 7/7, idioma de datos 7/7 y respaldo ZIP 7/7 (46/46 en total).
- `qa/browser/pro-backup-e2e.mjs` (build Pro): subir, guardar perfil y reporte, descargar ZIP, borrar, restaurar, verificar datos, perfil, reporte y dashboard; rechazo de un archivo que no es respaldo y de un ZIP comprimido, ambos con mensaje localizado. ES 14/14 y EN 14/14.
- `qa/browser/pro-market-e2e.mjs` (build Pro): archivo con formato español (1.234,5; día/mes) y archivo con formato inglés (1,234.5; mes/día), con las cuatro combinaciones de idioma de interfaz y de datos. Valores y fecha verificados en el almacén. 16/16.
- `qa/browser/pro-flow-e2e.mjs` (build Pro): ES 20/20 y EN 20/20.
- `qa/browser/templates-e2e.mjs` (build Pro): ES 22/22 y EN 22/22.
- `qa/browser/landing-pricing-e2e.mjs`: ES 14/14 y EN 14/14 (Demo); con `--pro`, ES 14/14 y EN 14/14.
- `qa/browser/plan-gating-e2e.mjs` (build Demo): ES 4/4 y EN 4/4. Demo no muestra carga ni plantillas.
- `qa/browser/explorer-e2e.mjs` ES 13/13 y EN 13/13; `qa/browser/studio-e2e.mjs` ES 17/17 y EN 17/17.
- Desbordamiento a 390 px: sin desbordamiento en las rutas revisadas (Demo y Pro).

## 7. Pendientes (no están hechos)

- **Precio de Pro** ($29 mensual y $24 anual): validación de un experto y decisión del usuario antes de publicar.
- **Términos de cancelación anual**: aprobación del usuario antes de publicar la frase "cancela cuando quieras".
- **Cobro y cuentas**: no integrados. Pro se activa solo por build.
- **Copy de la página de inicio con y sin "WFM Rescue"**: pendiente. Falta revisar las variantes y que el usuario elija la versión.
- **Pro sin archivo propio**: al entrar sin datos guardados se muestran los datos demo con la etiqueta de demo, hasta que el usuario carga su archivo. Es un comportamiento de diseño que conviene confirmar.
