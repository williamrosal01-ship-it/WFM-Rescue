// End-to-end checks for Report Studio (/app/studio). Usage: node studio-e2e.mjs [es|en]
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE || "http://127.0.0.1:3100";
const lang = process.argv[2] || "es";
const T = lang === "es"
  ? { useTpl: "Usar plantilla", blank: "Informe en blanco", kpiTpl: "Resumen de KPIs", lineTpl: "Dotación por intervalo", tableTpl: "Detalle por cola (tabla)", csv: "CSV", donut: "Dona", table: "Tabla", bar: "Barras", add: "Añadir gráfico", reports: "Mis informes" }
  : { useTpl: "Use template", blank: "Blank report", kpiTpl: "KPI summary", lineTpl: "Staffing by interval", tableTpl: "Queue detail (table)", csv: "CSV", donut: "Donut", table: "Table", bar: "Bars", add: "Add chart", reports: "My reports" };

const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok: !!ok, extra });
  console.log(`${ok ? "PASS" : "FAIL"} [${lang}] ${name}${extra ? " — " + extra : ""}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
await ctx.addInitScript((l) => {
  localStorage.setItem("wfm-locale", l);
  localStorage.setItem("wfm-rescue-language-chosen", "1");
  // Clear studio data only once per browser session (addInitScript also runs on reload).
  if (!sessionStorage.getItem("qa-studio-init")) {
    localStorage.removeItem("wfm-studio-v1");
    sessionStorage.setItem("qa-studio-init", "1");
  }
}, lang);
const page = await ctx.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));

// Open the template card for `title` and click its "use template" button.
async function useTemplate(title) {
  const card = page
    .locator("div")
    .filter({ has: page.getByText(title, { exact: true }) })
    .filter({ has: page.getByRole("button", { name: T.useTpl }) })
    .last();
  await card.getByRole("button", { name: T.useTpl }).click();
  await page.waitForURL(/\/app\/studio\/[^/]+$/, { timeout: 15000 });
  // the editor's first input is the report name; it must match the template we asked for
  await page.locator('input[aria-label]').first().waitFor({ timeout: 15000 });
  const name = await page.locator('input[aria-label]').first().inputValue();
  if (name !== title) throw new Error(`opened "${name}" instead of "${title}"`);
}

try {
  await page.goto(`${BASE}/app/studio`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.getByText(T.reports, { exact: false }).first().waitFor({ timeout: 20000 });
  check("list page renders templates", (await page.getByRole("button", { name: T.useTpl }).count()) >= 9, `templates=${await page.getByRole("button", { name: T.useTpl }).count()}`);

  // 1) KPI summary template
  await useTemplate(T.kpiTpl);
  await page.locator(".recharts-wrapper, table, .grid").first().waitFor({ timeout: 15000 }).catch(() => {});
  const kpiValues = await page.locator("div.text-xl").allTextContents();
  check("KPI template shows 6 KPI values", kpiValues.length >= 6, kpiValues.join(" | "));
  const kpiNoDash = kpiValues.filter((v) => v.trim() !== "—").length;
  check("KPI values are populated (not dashes)", kpiNoDash >= 5, `${kpiNoDash}/${kpiValues.length}`);
  const kpiOffered = kpiValues[0];

  // 2) Add a donut chart on the same report and check it renders
  await page.getByRole("button", { name: T.donut, exact: true }).first().click();
  await page.waitForTimeout(300);
  check("add donut chart renders recharts pie", (await page.locator(".recharts-pie").count()) >= 1);

  // 3) Table template in a new report: totals row should equal KPI offered total
  await page.goto(`${BASE}/app/studio`, { waitUntil: "domcontentloaded" });
  await page.getByText(T.reports, { exact: false }).first().waitFor({ timeout: 20000 });
  await useTemplate(T.tableTpl);
  const totalRow = page.locator("tr").filter({ hasText: lang === "es" ? "Total" : "Total" }).last();
  const cells = await totalRow.locator("td").allTextContents();
  check("table template has a totals row", cells.length >= 3, cells.join(" | "));
  // compare Offered total with KPI summary total (same filtered data)
  const offeredTotal = cells[2] ?? "";
  check("table totals: offered matches KPI offered total", offeredTotal.replace(/\s/g, "") === kpiOffered.replace(/\s/g, ""), `table=${offeredTotal} kpi=${kpiOffered}`);

  // 4) CSV export of first chart
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }),
    page.getByRole("button", { name: T.csv, exact: true }).first().click(),
  ]);
  const csvPath = await download.path();
  const csv = fs.readFileSync(csvPath, "utf8");
  check("CSV export has BOM and header", csv.startsWith("\uFEFF") && csv.split("\n").length > 2, csv.split("\n")[0].slice(0, 80));

  // 5) Persistence: reload and count charts
  const url = page.url();
  const widgetsBefore = await page.locator("input[aria-label]").count();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const widgetsAfter = await page.locator("input[aria-label]").count();
  check("report persists after reload", page.url() === url && widgetsAfter === widgetsBefore, `inputs ${widgetsBefore}->${widgetsAfter}`);

  // 6) Chart type switch: table -> bar on the table widget
  await page.getByRole("button", { name: T.bar, exact: true }).first().click();
  await page.waitForTimeout(400);
  check("switch chart to bars renders recharts bars", (await page.locator(".recharts-bar-rectangle").count()) > 0);

  // 7) List shows reports
  await page.goto(`${BASE}/app/studio`, { waitUntil: "domcontentloaded" });
  await page.getByText(T.reports, { exact: false }).first().waitFor({ timeout: 20000 });
  const listed = await page.getByRole("button", { name: lang === "es" ? "Abrir" : "Open", exact: true }).count();
  check("list shows saved reports", listed >= 2, `open buttons=${listed}`);

  // 8) Line template: uses line chart (not area)
  await useTemplate(T.lineTpl);
  await page.waitForTimeout(500);
  check("staffing template renders line chart", (await page.locator(".recharts-line-curve").count()) >= 1);
  check("no area chart in staffing template", (await page.locator(".recharts-area").count()) === 0);

  // 9) Blank report + add bar chart
  await page.goto(`${BASE}/app/studio`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: T.blank }).first().click();
  await page.waitForURL(/\/app\/studio\/[^/]+$/, { timeout: 15000 });
  await page.getByRole("button", { name: T.bar, exact: true }).first().click();
  await page.waitForTimeout(400);
  check("blank report + bar chart renders", (await page.locator(".recharts-bar").count()) >= 1);

  // language check: the visible text of the editor and the list must not mix languages
  const EN_LEAK = /\b(Add chart|Use template|Blank report|Duplicate|Remove chart|Move up|Move down|Dimension|Aggregation|Metrics|Average|Chart title|Report name|Description|Saved automatically|intervals with|No data|Open|Delete|Save as template|Print|Template|Templates|Sum|Minimum|Maximum)\b/g;
  const ES_LEAK = /\b(Añadir gráfico|Usar plantilla|Informe en blanco|Duplicar|Quitar gráfico|Subir|Bajar|Dimensión|Agregación|Métricas|Promedio|Título del gráfico|Nombre del informe|Descripción|Se guarda automáticamente|intervalos con|No hay datos|Abrir|Eliminar|Guardar como plantilla|Imprimir|Plantilla|Suma|Mínimo|Máximo)\b/g;
  const leakRe = lang === "es" ? EN_LEAK : ES_LEAK;
  const screens = [];
  await page.goto(`${BASE}/app/studio`, { waitUntil: "domcontentloaded" });
  await page.getByText(T.reports, { exact: false }).first().waitFor({ timeout: 20000 });
  screens.push(["list", await page.locator("body").innerText()]);
  await useTemplate(T.kpiTpl);
  await page.waitForTimeout(400);
  screens.push(["editor-kpi", await page.locator("body").innerText()]);
  await page.getByRole("button", { name: T.donut, exact: true }).first().click();
  await page.getByRole("button", { name: T.table, exact: true }).first().click();
  await page.waitForTimeout(400);
  screens.push(["editor-table", await page.locator("body").innerText()]);
  for (const [name, text] of screens) {
    const hits = [...new Set(text.match(leakRe) || [])];
    check(`no ${lang === "es" ? "English" : "Spanish"} leaks on ${name}`, hits.length === 0, hits.join(", "));
  }

  check("no page errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" ; "));
} catch (e) {
  check("flow completed without exception", false, String(e).slice(0, 300));
  await page.screenshot({ path: `/tmp/studio-fail-${lang}.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`SUMMARY [${lang}] ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
