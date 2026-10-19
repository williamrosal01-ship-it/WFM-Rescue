// E2E (Pro): workspace backup round-trip. Upload data, save a profile and a report, download the ZIP,
// wipe the browser, restore the ZIP and check everything is back. Also checks that a compressed ZIP is rejected.
// Usage: BASE=http://127.0.0.1:3101 node pro-backup-e2e.mjs es|en
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
const BASE = process.env.BASE ?? "http://127.0.0.1:3101";
const lang = process.argv[2] ?? "es";
const es = lang === "es";
const T = (e, n) => (es ? e : n);
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} [${lang}] ${name}${extra ? " — " + extra : ""}`); };

mkdirSync("/tmp/fx", { recursive: true });
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
  ["interval_start", "queue", "offered", "answered", "service_level"],
  ["05/10/2026 08:00", "Ventas", "1.234,5", "1.100", "82,5%"],
  ["05/10/2026 08:15", "Ventas", "1.300", "1.200", "85%"],
]), "Datos");
const fixture = "/tmp/fx/backup-src.xlsx";
XLSX.writeFile(wb, fixture);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
await ctx.addInitScript((l) => { try { localStorage.setItem("wfm-locale", l); localStorage.setItem("wfm-rescue-language-chosen", "1"); } catch {} }, lang);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const dialogs = [];
page.on("dialog", (d) => { dialogs.push(d.message()); d.accept(); });

// 1. Upload and process
await page.goto(`${BASE}/app/import`, { waitUntil: "domcontentloaded" });
await page.locator('input[type="file"]').first().setInputFiles(fixture);
await page.getByText(T("Mapear columnas", "Map columns"), { exact: true }).first().waitFor({ timeout: 30000 });
await page.getByRole("button", { name: T("Procesar y ver diagnósticos", "Process and view diagnostics") }).click();
await page.waitForTimeout(1500);
let saved = await page.evaluate(() => new Promise((res) => {
  const r = indexedDB.open("wfm-rescue", 1);
  r.onsuccess = () => { try { const g = r.result.transaction("datasets").objectStore("datasets").get("current"); g.onsuccess = () => res(g.result ?? null); g.onerror = () => res(null); } catch { res(null); } };
  r.onerror = () => res(null);
}));
check("upload saved 2 rows in IndexedDB", !!saved && saved.rows?.length === 2, saved ? `${saved.rows?.length} rows` : "none");

// 2. Profile and report stored in the browser
await page.evaluate(() => {
  localStorage.setItem("wfm-import-profiles", JSON.stringify([{ id: "qa-p1", name: "QA perfil", sourceType: null, dataLanguage: "es", mappings: [{ fileColumn: "queue", canonicalField: "queue" }], createdAt: "2026-10-18T00:00:00.000Z" }]));
  localStorage.setItem("wfm-studio-v1", JSON.stringify({ state: { reports: [{ id: "qa-r1", name: { es: "Informe QA", en: "QA report" }, description: { es: "", en: "" }, widgets: [], createdAt: "2026-10-18T00:00:00.000Z", updatedAt: "2026-10-18T00:00:00.000Z" }], userTemplates: [] }, version: 0 }));
});

// 3. Download the backup from Settings
await page.goto(`${BASE}/app/settings`, { waitUntil: "domcontentloaded" });
const dl = page.getByRole("button", { name: T("Descargar respaldo (.zip)", "Download backup (.zip)") });
await dl.waitFor({ timeout: 20000 });
check("backup card visible in Pro settings", true);
const [download] = await Promise.all([page.waitForEvent("download"), dl.click()]);
const zipPath = "/tmp/fx/backup-test.zip";
await download.saveAs(zipPath);
check("download is a ZIP file name", /wfm-rescue-respaldo-\d{4}-\d{2}-\d{2}\.zip$/.test(download.suggestedFilename()), download.suggestedFilename());
const bytes = readFileSync(zipPath);
check("ZIP starts with PK signature", bytes[0] === 0x50 && bytes[1] === 0x4b);
check("ZIP contains manifest with product WFM Rescue", bytes.includes(Buffer.from('"product": "WFM Rescue"')));

// 4. Wipe the browser
await page.evaluate(() => new Promise((res) => {
  localStorage.clear();
  const r = indexedDB.deleteDatabase("wfm-rescue");
  r.onsuccess = () => res(true); r.onerror = () => res(false); r.onblocked = () => res(false);
}));
await page.goto(`${BASE}/app/settings`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
const profilesEmpty = await page.getByText(T("No hay perfiles guardados", "No saved profiles")).count();
check("wiped: no profiles shown", profilesEmpty === 1);

// 5. Restore the ZIP (confirm dialog is accepted; the page reloads)
const restoreInput = page.locator('input[type="file"][accept*="zip"]');
await restoreInput.setInputFiles(zipPath);
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(2500);
const restoredProfile = await page.evaluate(() => (localStorage.getItem("wfm-import-profiles") ?? "").includes("QA perfil"));
check("profile restored", restoredProfile);
const restoredReport = await page.evaluate(() => (localStorage.getItem("wfm-studio-v1") ?? "").includes("QA report") || (localStorage.getItem("wfm-studio-v1") ?? "").includes("Informe QA"));
check("studio report restored", restoredReport);
const restoredRows = await page.evaluate(() => new Promise((res) => {
  const r = indexedDB.open("wfm-rescue", 1);
  r.onsuccess = () => { try { const g = r.result.transaction("datasets").objectStore("datasets").get("current"); g.onsuccess = () => res(g.result?.rows?.length ?? 0); g.onerror = () => res(-1); } catch { res(-1); } };
  r.onerror = () => res(-1);
}));
check("dataset restored (2 rows in IndexedDB)", restoredRows === 2, `${restoredRows} rows`);
await page.goto(`${BASE}/app/dashboard`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
const emptyShown = await page.getByText(T("No hay datos", "No data"), { exact: false }).count();
check("dashboard shows restored data (no empty state)", emptyShown === 0, `empty-state count ${emptyShown}`);

// 6. Rejections, each with a localized message: (a) a file that is not a backup (an XLSX),
//    (b) a compressed ZIP that has a manifest (the reader only accepts uncompressed backups).
const { execFileSync } = await import("node:child_process");
const deflated = "/tmp/fx/deflated-backup.zip";
execFileSync("python3", ["-c", `import zipfile,sys
with zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED) as z: z.writestr('manifest.json','{"product":"WFM Rescue"}')`, deflated]);
await page.goto(`${BASE}/app/settings`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(600);
await page.locator('input[type="file"][accept*="zip"]').setInputFiles(fixture);
await page.waitForTimeout(1200);
let errText = await page.locator("body").innerText();
check("non-backup file rejected with localized message", es ? errText.includes("no es un respaldo de WFM Rescue") : errText.includes("not a WFM Rescue backup"));
await page.locator('input[type="file"][accept*="zip"]').setInputFiles(deflated);
await page.waitForTimeout(1200);
errText = await page.locator("body").innerText();
check("compressed ZIP rejected with localized message", es ? /compres/i.test(errText) : /compress/i.test(errText));
check("no confirm dialog for rejected files", dialogs.length === 1, `dialogs: ${dialogs.length}`);
check("no page errors", errors.length === 0, errors.join(" | ").slice(0, 200));

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed (${lang}, pro backup)`);
process.exit(failed ? 1 : 0);
