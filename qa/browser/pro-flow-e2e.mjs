// E2E for the Pro build (NEXT_PUBLIC_WFM_PLAN=pro): upload, sheet choice, data language,
// import profiles, restore after reload, cancel keeps data, delete profile.
// Usage: BASE=http://127.0.0.1:3101 node pro-flow-e2e.mjs es|en
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
const XLSX = require("../../node_modules/xlsx");

const BASE = process.env.BASE ?? "http://127.0.0.1:3101";
const lang = process.argv[2] ?? "es";
const es = lang === "es";
const T = (e, n) => (es ? e : n);
const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} [${lang}] ${name}${extra ? " — " + extra : ""}`);
};

// Fixture 1: Spanish-formatted workbook with two sheets (first = data, second = other).
mkdirSync("/tmp/fx", { recursive: true });
const wb = XLSX.utils.book_new();
const data = [
  ["interval_start", "queue", "offered", "answered", "service_level"],
  ["05/10/2026 08:00", "Ventas", "1.234,5", "1.100", "82,5%"],
  ["05/10/2026 08:15", "Ventas", "1.300", "1.200", "85%"],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Datos");
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Columna X", "Valor"], ["a", 1]]), "Otra");
const fixture = "/tmp/fx/es-data-2sheets.xlsx";
XLSX.writeFile(wb, fixture);

const browser = await chromium.launch();
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
await context.addInitScript((l) => { try { localStorage.setItem("wfm-locale", l); } catch {} }, lang);
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));

const idbRows = () =>
  page.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open("wfm-rescue", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("datasets");
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("datasets")) { db.close(); resolve(null); return; }
      const g = db.transaction("datasets", "readonly").objectStore("datasets").get("current");
      g.onsuccess = () => { db.close(); resolve(g.result ? { name: g.result.name, rows: g.result.rows.map((r) => ({ queue: r.queue, offered: r.offered, serviceLevel: r.serviceLevel })) } : null); };
      g.onerror = () => { db.close(); resolve(null); };
    };
    req.onerror = () => resolve(null);
  }));

try {
  // 1. Pro shows upload and templates
  await page.goto(`${BASE}/app/import`, { waitUntil: "domcontentloaded" });
  const tplTitle = T("Plantillas por origen de datos", "Templates by data source");
  await page.getByText(tplTitle, { exact: true }).waitFor({ timeout: 60000 });
  check("pro: templates card visible", true);
  const fileInputs = await page.locator('input[type="file"]').count();
  check("pro: file input present", fileInputs > 0, String(fileInputs));

  // 2. Template language is independent of the UI language
  const otherLang = es ? "en" : "es";
  await page.locator("#template-lang").selectOption(otherLang);
  const [dl] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: T("Descargar plantilla XLSX", "Download XLSX template") }).click(),
  ]);
  const tplPath = `/tmp/fx/tpl-${otherLang}.xlsx`;
  await dl.saveAs(tplPath);
  const tplBook = XLSX.readFile(tplPath);
  const expectedSheet = otherLang === "es" ? "Intervalos" : "Intervals";
  check("template downloads in chosen language", tplBook.SheetNames.includes(expectedSheet), tplBook.SheetNames.join("|"));
  check("template file name carries language", dl.suggestedFilename().includes(otherLang), dl.suggestedFilename());

  // 3. Upload two-sheet file: mapping shows a sheet selector and the data-language selector
  await page.locator('input[type="file"]').first().setInputFiles(fixture);
  await page.getByText(T("Mapear columnas", "Map columns"), { exact: true }).first().waitFor({ timeout: 30000 });
  const sheetSel = page.locator("#import-sheet");
  check("sheet selector visible for two-sheet workbook", (await sheetSel.count()) === 1);
  check("first sheet selected by default", (await sheetSel.inputValue()) === "Datos");
  await sheetSel.selectOption("Otra");
  await page.waitForTimeout(400);
  check("switching sheet re-reads the file", (await sheetSel.inputValue()) === "Otra");
  await sheetSel.selectOption("Datos");
  await page.waitForTimeout(400);

  const dataLang = page.locator("#data-lang");
  check("data language defaults to UI language", (await dataLang.inputValue()) === (es ? "es" : "en"), await dataLang.inputValue());
  await dataLang.selectOption("es");

  // 4. Save and reuse a profile
  const profileName = T("Perfil QA ventas", "QA sales profile");
  await page.getByPlaceholder(T("Nombre del perfil (ej. Genesys Intraday Export)", "Profile name (e.g. Genesys Intraday Export)")).fill(profileName);
  await page.getByRole("button", { name: T("Guardar perfil", "Save profile"), exact: true }).click();
  await page.getByText(profileName, { exact: false }).first().waitFor({ timeout: 10000 });
  const stored = await page.evaluate(() => localStorage.getItem("wfm-import-profiles"));
  check("profile stored in browser", !!stored && stored.includes(profileName));

  // 5. Process: data is saved in this browser and restored after reload
  const processBtn = page.getByRole("button", { name: T("Procesar y ver diagnósticos", "Process and view diagnostics") });
  check("process button enabled after mapping", await processBtn.isEnabled());
  await processBtn.click();
  await page.waitForTimeout(1500);
  const saved = await idbRows();
  check("dataset saved in IndexedDB", !!saved && saved.rows.length === 2, saved ? `${saved.rows.length} rows` : "none");
  if (saved) {
    const r0 = saved.rows[0];
    check("Spanish numbers read as Spanish (1.234,5 → 1234.5)", r0.offered === 1234.5 || saved.rows.some((r) => r.offered === 1234.5), JSON.stringify(saved.rows.map((r) => r.offered)));
    check("Spanish percent read (82,5% → 0.825)", saved.rows.some((r) => Math.abs((r.serviceLevel ?? -1) - 0.825) < 1e-9), JSON.stringify(saved.rows.map((r) => r.serviceLevel)));
  }

  await page.goto(`${BASE}/app/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const emptyText = T("No hay datos para los filtros seleccionados.", "No data for the selected filters.");
  const emptyShown = await page.getByText(emptyText, { exact: false }).count();
  check("after reload dashboard has data (restored)", emptyShown === 0, `empty-state count ${emptyShown}`);
  const nameShown = await page.getByText("es-data-2sheets.xlsx", { exact: false }).count();
  check("after reload the uploaded file name is shown (not demo)", nameShown > 0, `count ${nameShown}`);
  const stillSaved = await idbRows();
  check("saved dataset survives reload", !!stillSaved && stillSaved.rows.length === 2);

  // 6. Cancel during mapping keeps the existing data
  await page.goto(`${BASE}/app/import`, { waitUntil: "domcontentloaded" });
  await page.getByText(tplTitle, { exact: true }).waitFor({ timeout: 60000 });
  await page.locator('input[type="file"]').first().setInputFiles(fixture);
  await page.getByText(T("Mapear columnas", "Map columns"), { exact: true }).first().waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: T("Cancelar", "Cancel"), exact: true }).first().click();
  await page.waitForTimeout(800);
  const afterCancel = await idbRows();
  check("cancel keeps existing data", !!afterCancel && afterCancel.rows.length === 2);

  // 7. Profiles in settings: listed, then deleted
  await page.goto(`${BASE}/app/settings`, { waitUntil: "domcontentloaded" });
  await page.getByText(profileName, { exact: false }).first().waitFor({ timeout: 30000 });
  check("settings lists the saved profile", true);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: T("Eliminar", "Delete") }).first().click();
  await page.waitForTimeout(500);
  const afterDel = await page.evaluate(() => localStorage.getItem("wfm-import-profiles"));
  check("delete removes the profile", !afterDel || !afterDel.includes(profileName));
} catch (e) {
  check("flow completed without exception", false, String(e).slice(0, 300));
}

check("no page errors", pageErrors.length === 0, pageErrors.slice(0, 2).join(" | "));
await browser.close();
const passed = results.filter((r) => r.ok).length;
console.log(`\nSUMMARY [${lang}] ${passed}/${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);
