// Broad sweep: every visible text line on each route (incl. below the fold), in the given locale.
import { chromium } from "playwright";
import fs from "fs";
const lang = process.argv[2] || "en";
const BASE = "http://127.0.0.1:3100";
const ROUTES = ["/", "/pricing", "/docs", "/app/studio", "/app/dashboard", "/app/intraday", "/app/service-level", "/app/staffing", "/app/adherence", "/app/attendance", "/app/aux-report", "/app/capacity", "/app/occupancy", "/app/nlh", "/app/forecast", "/app/diagnostics", "/app/data-health", "/app/import", "/app/reports", "/app/settings"];
const ES_RE = /[áéíóúñ¿¡]|\b(de|la|el|los|las|para|por|del|que|con|se|en|un|una|al|sin|tu|tus|su|sus|es|son|más|cómo|ver|datos|cola|colas|intervalo|intervalos|agentes|equipo|sitio|canal|archivo|cargar|importar|exportar|guardar|nuevo|nueva|ocupación|dotación|adherencia|asistencia|capacidad|pronóstico|precios|abrir|cerrar|próximamente|hay|ninguno|todos|todas|cada|sobre|entre|desde|hasta|sólo|solo|crear|borrar|tardanzas|ausentismo|requerido|programado|presente|detalle|resumen|análisis|reporte|informe|configuración|monitoreo|diagnóstico|hallazgos)\b/i;
const EN_RE = /\b(the|and|of|to|with|your|you|for|is|are|from|this|all|view|load|import|export|save|clear|reset|run|rows|columns|hours|days|total|average|status|search|filter|sort|open|close|add|new|name|team|queue|channel|site|agent|agents|interval|intervals|report|reports|forecast|actual|required|scheduled|present|occupancy|adherence|attendance|diagnostics|settings|pricing|sign|start|get|see|read|more|less|per|by)\b/i;
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
    // attribute texts that are user-visible
    document.querySelectorAll("[title],[aria-label],[placeholder]").forEach((el) => {
      for (const a of ["title", "aria-label", "placeholder"]) { const v = el.getAttribute(a); if (v && v.trim() && !seen.has(v)) { seen.add(v); res.push("@" + a + ": " + v.trim()); } }
    });
    return res;
  });
  out[r] = lines.filter((t) => MODE_RE.test(t));
}
fs.writeFileSync(`sweep-${lang}.json`, JSON.stringify(out, null, 2));
let total = 0;
for (const [r, arr] of Object.entries(out)) { total += arr.length; for (const t of arr) console.log(r, "|", t.slice(0, 140)); }
console.log("TOTAL suspicious lines:", total);
await b.close();
