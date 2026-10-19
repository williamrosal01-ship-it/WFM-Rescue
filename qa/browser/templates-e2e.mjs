// E2E: source template card on /app/import, ES and EN. Usage: BASE=http://127.0.0.1:3100 node templates-e2e.mjs es|en
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const XLSX = require("../../node_modules/xlsx");

const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const lang = process.argv[2] ?? "es";
const results = [];
const check = (name, ok, extra = "") => { results.push({ name, ok, extra }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`); };

// Words that must not appear in the card text of each language (exempt: proper names).
const EN_WORDS = /\b(Download|Source|Template|Columns|Sheet|Sheets|Required|Dictionary|Instructions|Scheduled|Attendance|Schedule|Volumes|Steps|Description|Example|Unit|Type|Origin|Queue|Channel|Interval|Date|Staff|Calls|Abandoned)\b/;
const ES_WORDS = /\b(Descargar|Origen|Plantilla|Columnas|Hoja|Hojas|Obligatoria|Tipo|Unidad|Descripción|Ejemplo|Instrucciones|Diccionario|Programado|Presente|Necesario|Pasos|Volúmenes|Intervalo|Fecha|Cola|Canal|Ofrecidas|Atendidas|Abandonadas|Horarios|Asistencia)\b/;

const browser = await chromium.launch();
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
await context.addInitScript((l) => { try { localStorage.setItem("wfm-locale", l); } catch {} }, lang);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(`${BASE}/app/import`, { waitUntil: "domcontentloaded" });
const title = lang === "es" ? "Plantillas por origen de datos" : "Templates by data source";
await page.getByText(title, { exact: true }).waitFor({ timeout: 60000 });
check("card title visible", true, title);

// Text of the smallest ancestor of the source select that contains the card title.
const cardText = await page.locator("#template-source").evaluate((sel, t) => {
  let el = sel;
  while (el && !el.innerText.includes(t)) el = el.parentElement;
  return el ? el.innerText : "";
}, title);
check("card text captured", cardText.length > 200, `${cardText.length} chars`);
const selectedTab = await page.locator("#template-source").inputValue();
check("default source is five9", selectedTab === "five9", selectedTab);

const leakRe = lang === "es" ? EN_WORDS : ES_WORDS;
const leaks = cardText.match(new RegExp(leakRe.source, "g")) ?? [];
check(`no other-language words in ${lang} card`, leaks.length === 0, leaks.slice(0, 8).join(", "));

for (const src of ["salesforce", "five9", "verint", "other"]) {
  await page.locator("#template-source").selectOption(src);
  const btn = page.getByRole("button", { name: lang === "es" ? "Descargar plantilla XLSX" : "Download XLSX template" });
  const [download] = await Promise.all([page.waitForEvent("download"), btn.click()]);
  const path = `/tmp/tpl-${src}-${lang}.xlsx`;
  await download.saveAs(path);
  const expected = `wfm-rescue-plantilla-${src}-${lang}.xlsx`;
  check(`download name ${src}/${lang}`, download.suggestedFilename() === expected, download.suggestedFilename());
  const wb = XLSX.read(readFileSync(path), { type: "buffer" });
  const data = lang === "es" ? ["Intervalos", "Horarios", "Asistencia"] : ["Intervals", "Schedule", "Attendance"];
  const extra = lang === "es" ? ["Instrucciones", "Diccionario"] : ["Instructions", "Dictionary"];
  check(`sheets ${src}/${lang}`, [...data, ...extra].every((n) => wb.SheetNames.includes(n)), wb.SheetNames.join("|"));
  const headers = XLSX.utils.sheet_to_json(wb.Sheets[data[0]], { header: 1 })[0];
  check(`intervals headers ${src}/${lang}`, headers.length === 11 && headers[0] === (lang === "es" ? "Fecha" : "Date"), headers.join("|"));
  const dict = XLSX.utils.sheet_to_json(wb.Sheets[extra[1]], { header: 1 });
  check(`dictionary origin column ${src}/${lang}`, dict[0].at(-1) === (lang === "es" ? "Origen en la fuente" : "Origin in source") && dict.length === 23, `${dict.length} rows`);
}

await page.setViewportSize({ width: 390, height: 844 });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("no horizontal overflow on mobile import page", overflow <= 2, `overflow=${overflow}`);
await page.screenshot({ path: `/tmp/tpl-mobile-${lang}.png`, fullPage: false });
check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${lang}: ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
