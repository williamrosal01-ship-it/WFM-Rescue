// E2E: /app/explorer in ES or EN. Usage: BASE=... node explorer-e2e.mjs es|en
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const lang = process.argv[2] ?? "es";
const L = lang === "es"
  ? { title: "Explorador de datos", search: "Buscar en cada fila y campo…", cols: "Filtrar columnas", export: "Exportar CSV", noRows: "No hay filas que coincidan", first: "Fecha", aht: "TMO (seg)", filterAht: "tmo" }
  : { title: "Data Explorer", search: "Search every row and field…", cols: "Filter columns", export: "Export CSV", noRows: "No matching rows", first: "Date", aht: "AHT (sec)", filterAht: "aht" };
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
await ctx.addInitScript((l) => { try { localStorage.setItem("wfm-locale", l); localStorage.setItem("wfm-rescue-language-chosen", "1"); } catch {} }, lang);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(`${BASE}/app/explorer`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { level: 1, name: L.title }).waitFor({ timeout: 60000 });
check("title visible", true, L.title);
await page.locator("thead th").first().waitFor({ timeout: 30000 }); // data loads from this browser's storage after first paint
const headers = await page.locator("thead th").allInnerTexts();
check("first column header localized", headers[0] === L.first, headers[0]);
check("all 17 columns shown by default", headers.length === 17, `${headers.length}`);
const rowsAll = await page.locator("tbody tr").count();
check("default limit shows 250 or all rows", rowsAll > 0 && rowsAll <= 250, `${rowsAll} rows`);

// search
const search = page.getByPlaceholder(L.search);
await search.fill("zzzz-no-match");
check("search without match shows empty message", (await page.getByText(L.noRows, { exact: true }).count()) === 1);
await search.fill("");
// limit 100
await page.locator("select").last().selectOption("100");
const limited = await page.locator("tbody tr").count();
check("row limit 100 applied", limited === Math.min(100, rowsAll), `${limited}`);
// column filter
await page.getByPlaceholder(L.cols).fill(L.filterAht);
const cols = await page.locator("thead th").allInnerTexts();
check("column filter keeps the matching column", cols.length === 1 && cols[0] === L.aht, cols.join("|"));
await page.getByPlaceholder(L.cols).fill("");
// export
const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: L.export }).click()]);
const path = `/tmp/explorer-${lang}.csv`;
await dl.saveAs(path);
const csv = readFileSync(path, "utf8");
check("csv file name", dl.suggestedFilename() === "wfm-rescue-explorer-" + (lang === "es" ? "intervalos" : "intervals") + ".csv", dl.suggestedFilename());
check("csv has BOM and CRLF", csv.charCodeAt(0) === 0xfeff && csv.includes("\r\n"));
check("csv header localized", csv.slice(1).startsWith(`${L.first},`), csv.slice(1, 60));
check("csv row count matches displayed limit", csv.trim().split("\r\n").length === 1 + Math.min(100, rowsAll));

// mobile: no page-level horizontal overflow (table scrolls inside its box)
await page.setViewportSize({ width: 390, height: 844 });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("mobile: no page-level horizontal overflow", overflow <= 2, `overflow=${overflow}`);
check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${lang}: ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
