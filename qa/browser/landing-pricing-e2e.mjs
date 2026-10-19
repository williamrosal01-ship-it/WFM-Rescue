// E2E: landing pricing toggle (monthly/yearly), yearly terms text, CTA copy; Demo hides the backup card.
// Usage: BASE=http://127.0.0.1:3100 node landing-pricing-e2e.mjs es|en [--pro]
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const lang = process.argv[2] ?? "es";
const isPro = process.argv.includes("--pro");
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript((l) => { try { localStorage.setItem("wfm-locale", l); localStorage.setItem("wfm-rescue-language-chosen", "1"); } catch {} }, lang);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const pricing = page.locator("#pricing");
const yearlyBtn = pricing.getByRole("button", { name: lang === "es" ? "Anual" : "Yearly", exact: true });
const monthlyBtn = pricing.getByRole("button", { name: lang === "es" ? "Mensual" : "Monthly", exact: true });
await pricing.getByRole("button").first().waitFor();
check("toggle buttons exist", await yearlyBtn.count() === 1 && await monthlyBtn.count() === 1);
check("monthly selected by default", (await monthlyBtn.getAttribute("aria-pressed")) === "true");
check("Pro monthly price $29", await pricing.getByText("$29", { exact: true }).count() === 1);
check("no yearly terms before selecting yearly", await pricing.getByText(/Cancel anytime|Cancela cuando quieras/).count() === 0);
await yearlyBtn.click();
check("yearly selected", (await yearlyBtn.getAttribute("aria-pressed")) === "true");
check("Pro yearly price $24", await pricing.getByText("$24", { exact: true }).count() === 1);
check("yearly savings chip shows 17%", await pricing.getByText(lang === "es" ? "Anual: 17% menos" : "Yearly: 17% off").count() === 1);
check("yearly terms text shown", await pricing.getByText(lang === "es" ? "Cancela cuando quieras" : "Cancel anytime").count() === 1);
check("yearly terms mention no refund", await pricing.getByText(lang === "es" ? "No hay reembolso" : "No refund").count() === 1);
await monthlyBtn.click();
check("back to $29 monthly", await pricing.getByText("$29", { exact: true }).count() === 1);
const bodyText = await page.locator("body").innerText();
const ctaOk = lang === "es" ? bodyText.includes("Entrar a la demo") && !bodyText.includes("carga tu CSV") : bodyText.includes("Enter the demo") && !bodyText.includes("upload your CSV");
check("final CTA copy updated (no upload promise)", ctaOk);
check("no page errors on landing", errors.length === 0, errors.join(" | ").slice(0, 200));

// Settings: backup card visible only in Pro
errors.length = 0;
await page.goto(`${BASE}/app/settings`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const settingsText = await page.locator("body").innerText();
const hasBackup = settingsText.includes(lang === "es" ? "Descargar respaldo" : "Download backup");
check(isPro ? "Pro: backup card shown" : "Demo: backup card hidden", isPro ? hasBackup : !hasBackup);
check("no page errors on settings", errors.length === 0, errors.join(" | ").slice(0, 200));

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed (${lang}${isPro ? ", pro" : ", demo"})`);
process.exit(failed ? 1 : 0);
