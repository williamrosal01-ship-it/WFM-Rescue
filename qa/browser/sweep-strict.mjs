// Stricter language sweep: flags visible text (incl. title/aria-label/placeholder) that contains
// words of the OTHER language. Jargon accepted in both UIs is allowlisted. Usage: BASE=... node sweep-strict.mjs es|en [routes...]
import { chromium } from "playwright";
import fs from "fs";
const lang = process.argv[2] ?? "en";
const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const DEFAULT_ROUTES = ["/", "/pricing", "/docs", "/app/studio", "/app/dashboard", "/app/intraday", "/app/service-level", "/app/staffing", "/app/adherence", "/app/attendance", "/app/aux-report", "/app/capacity", "/app/occupancy", "/app/nlh", "/app/forecast", "/app/diagnostics", "/app/data-health", "/app/import", "/app/reports", "/app/settings", "/app/explorer"];
const ROUTES = process.argv.length > 3 ? process.argv.slice(3) : DEFAULT_ROUTES;
// Words that are Spanish (flagged in EN)
const ES_WORDS = "de|la|el|los|las|para|por|del|que|con|sin|tu|tus|datos|cola|colas|intervalo|intervalos|agentes|equipo|equipos|archivo|archivos|cargar|importar|exportar|guardar|nuevo|nueva|ocupación|cobertura|sesgo|real|tasa|casos|promedio|usos|excede|ejemplo|vacío|rango|filas|campo|campos|sugerencia|acciones|evidencia|impacto|medios|bajos|informativos|errores|advertencias|abandonadas|atendidas|ofrecidos|volumen|columnas|mapeadas|requeridos|otros|revisar|completitud|brecha|dotación|programados|contestadas|pronóstico|nivel|análisis|resumen|diagnóstico|ver|hoy|semana|mes|día|hora|minutos|segundos|tiempo|conjunto|importa|carga|añade|sube|mapea|cuando|cuál|pero|más|también|según|desde|hasta|entre|sobre|todos|todas|cada|este|esta|estos|estas|ese|esa|son|está|están|hay|sí|no|o|y|se|es|al|en|un|una|unos|unas|pero|muy|sólo|solo|siempre|nunca|faltan|faltantes|detectados|detectadas|mapeo|cargado|cargados|importado|importados|mostrar|ocultar|cerrar|abrir|borrar|limpiar|reiniciar|vista|dimensión|servicio|volumen|ajustes|idioma|tema|plantilla|plantillas|perfil|perfiles|notificaciones|buscar|búsqueda|resultado|resultados|guardado|descargar|descargado|restaurar|respaldo|precio|precios|usuario|usuarios|mensual|anual|gratis|solicitar|probar|entrar|abrir|ir a|revisar|nombre|hoja|hojas|fila|filas|valor|valores|sin datos|no hay|cola|colas|canal|canales|sitio|sitios|paso|pasos|continuar|cancelar|aceptar|confirmar|eliminar|duplicar|nombre|nombres";
const EN_WORDS = "the|and|with|your|you|for|are|from|this|all|view|load|import|export|save|clear|reset|run|rows|columns|hours|days|status|search|filter|open|close|add|name|team|teams|queue|queues|channel|channels|site|sites|agent|agents|interval|intervals|coverage|target|range|rate|cases|average|uses|exceeds|example|mapped|offered|answered|abandoned|required|scheduled|present|errors|warnings|rescan|impact|evidence|recommended|details|review|back|next|select|choose|none|empty|missing|optional|field|fields|source|sources|time|week|month|today|hour|minute|second|data|file|files|upload|download|print|language|theme|settings|help|plan|contact|request|access|try|enter|go|to|of|is|on|at|by|or|an|a|it|be|as|if|not|can|will|no|yes|per|via|set|use|used|using|show|hide|total totals|value|values|click|saved|removed|deleted|added|updated|loaded|imported|exported|restored|backup|profile|profiles|template|templates|report|reports|chart|charts|line|bar|bars|pie|donut|table|summary|note|notes|warning|error|info|success|ok|cancel|confirm|delete|duplicate|continue|skip|map|mapping|header|headers|column|sheet|sheets|language|date|dates";
const ALLOW = /\b(Staffing|Forecast|Dashboard|Intraday|Shrinkage|Erlang|AHT|SL|ASA|NLH|AUX|ACW|FTE|WAPE|WFM|Report Studio|Data Health|Data Explorer|Excel|Salesforce|Five9|Verint|CSV|XLSX|PDF|Demo|Pro|Lima|Bogotá|México|Colombia|Argentina|Madrid|UTC|Español|English|Intraday|Gap|Bias|Sesgo|Abandonment|Adherence|Occupancy|Workload|Delta|Scheduled|Required|Present)\b/g;
const ES_RE = new RegExp(`[áéíóúñ¿¡]|\\b(${ES_WORDS.split("|").join("|")})\\b`, "i");
const EN_RE = new RegExp(`\\b(${EN_WORDS.split(" ").join("|").split("|").filter(Boolean).join("|")})\\b`, "i");
const MODE_RE = lang === "es" ? EN_RE : ES_RE;
const b = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 1366, height: 860 } });
await ctx.addInitScript((l) => { localStorage.setItem("wfm-locale", l); localStorage.setItem("wfm-rescue-language-chosen", "1"); }, lang);
const p = await ctx.newPage();
const out = {};
for (const r of ROUTES) {
  await p.goto(BASE + r, { waitUntil: "domcontentloaded", timeout: 30000 });
  await p.waitForTimeout(900);
  const lines = await p.evaluate(() => {
    const seen = new Set(); const res = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; while ((n = walker.nextNode())) {
      const t = n.textContent.replace(/\s+/g, " ").trim();
      if (!t || t.length < 2) continue;
      const el = n.parentElement; if (!el) continue;
      const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden") continue;
      if (el.closest("script,style,noscript")) continue;
      if (!seen.has(t)) { seen.add(t); res.push(t); }
    }
    document.querySelectorAll("[title],[aria-label],[placeholder],option").forEach((el) => {
      for (const a of ["title", "aria-label", "placeholder"]) { const v = el.getAttribute(a); if (v && v.trim() && !seen.has(v)) { seen.add(v); res.push("@" + a + ": " + v.trim()); } }
      if (el.tagName === "OPTION" && el.textContent && !seen.has(el.textContent.trim())) { seen.add(el.textContent.trim()); res.push("option: " + el.textContent.trim()); }
    });
    return res;
  });
  out[r] = lines.map((t) => t.replace(ALLOW, "")).filter((t) => MODE_RE.test(t) && t.length < 400);
}
fs.writeFileSync(`strict-${lang}.json`, JSON.stringify(out, null, 2));
let total = 0;
for (const [r, arr] of Object.entries(out)) { total += arr.length; for (const t of arr) console.log(r, "|", t.slice(0, 160)); }
console.log("TOTAL flagged:", total);
await b.close();
