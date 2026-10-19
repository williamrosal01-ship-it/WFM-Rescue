// E2E (Pro): market formats. Uploads a Spanish-format file (1.234,5 / dd/mm) and an English-format file
// (1,234.5 / mm/dd) with the data-language selector, and checks the parsed values stored in the browser.
// Covers the four combinations of UI language and data language. Usage: BASE=http://127.0.0.1:3101 node pro-market-e2e.mjs
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
const BASE = process.env.BASE ?? "http://127.0.0.1:3101";
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`); };
mkdirSync("/tmp/fx", { recursive: true });
const make = (path, rows) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Datos");
  XLSX.writeFile(wb, path);
  return path;
};
const esFile = make("/tmp/fx/market-es.xlsx", [
  ["interval_start", "queue", "offered", "answered", "service_level"],
  ["05/10/2026 08:00", "Ventas", "1.234,5", "1.100", "82,5%"],
  ["05/10/2026 08:15", "Ventas", "1.300", "1.200", "85%"],
]);
const enFile = make("/tmp/fx/market-en.xlsx", [
  ["interval_start", "queue", "offered", "answered", "service_level"],
  ["10/05/2026 08:00", "Sales", "1,234.5", "1,100", "82.5%"],
  ["10/05/2026 08:15", "Sales", "1,300", "1,200", "85%"],
]);

async function run(uiLang, dataLang, file, expectOffered) {
  const tag = `ui=${uiLang} data=${dataLang}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript((l) => { try { localStorage.setItem("wfm-locale", l); localStorage.setItem("wfm-rescue-language-chosen", "1"); } catch {} }, uiLang);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE}/app/import`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="file"]').first().setInputFiles(file);
  const mapLabel = uiLang === "es" ? "Mapear columnas" : "Map columns";
  await page.getByText(mapLabel, { exact: true }).first().waitFor({ timeout: 30000 });
  await page.locator("#data-lang").selectOption(dataLang);
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: uiLang === "es" ? "Procesar y ver diagnósticos" : "Process and view diagnostics" }).click();
  await page.waitForTimeout(1500);
  const rows = await page.evaluate(() => new Promise((res) => {
    const r = indexedDB.open("wfm-rescue", 1);
    r.onsuccess = () => { try { const g = r.result.transaction("datasets").objectStore("datasets").get("current"); g.onsuccess = () => res(g.result?.rows ?? []); g.onerror = () => res([]); } catch { res([]); } };
    r.onerror = () => res([]);
  }));
  const offered = rows.map((x) => x.offered);
  check(`[${tag}] two rows parsed`, rows.length === 2, `${rows.length} rows`);
  check(`[${tag}] offered values ${JSON.stringify(expectOffered)}`, JSON.stringify(offered) === JSON.stringify(expectOffered), JSON.stringify(offered));
  const d = rows[0]?.intervalStart ? new Date(rows[0].intervalStart) : null;
  check(`[${tag}] date read as 5 Oct 2026`, !!d && d.getFullYear() === 2026 && d.getMonth() === 9 && d.getDate() === 5, d ? d.toISOString() : "no date");
  check(`[${tag}] no page errors`, errors.length === 0, errors.join(" | ").slice(0, 160));
  await browser.close();
}

await run("es", "es", esFile, [1234.5, 1300]);
await run("en", "en", enFile, [1234.5, 1300]);
await run("es", "en", enFile, [1234.5, 1300]);
await run("en", "es", esFile, [1234.5, 1300]);
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed (market formats)`);
process.exit(failed ? 1 : 0);
