// E2E: demo plan must not show source templates or upload. Usage: BASE=... node plan-gating-e2e.mjs es|en
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const lang = process.argv[2] ?? "es";
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript((l) => { try { localStorage.setItem("wfm-locale", l); localStorage.setItem("wfm-rescue-language-chosen", "1"); } catch {} }, lang);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(`${BASE}/app/import`, { waitUntil: "domcontentloaded" });
await page.getByText(lang === "es" ? "Cómo funciona" : "How it works", { exact: true }).waitFor({ timeout: 60000 });
const templateTitle = lang === "es" ? "Plantillas por origen de datos" : "Templates by data source";
check("demo: templates card hidden", (await page.getByText(templateTitle, { exact: true }).count()) === 0);
check("demo: no template download button", (await page.getByRole("button", { name: /Descargar plantilla|Download XLSX template/ }).count()) === 0);
const banner = lang === "es"
  ? "La carga de archivos propios y las plantillas por origen están disponibles en el plan Pro."
  : "Uploading your own files and source templates are available on the Pro plan.";
check("demo banner names the Pro plan", (await page.getByText(banner.slice(0, 60), { exact: false }).count()) > 0);
check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${lang}: ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
