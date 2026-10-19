// Responsive + theme check for Report Studio. Usage: node studio-visual.mjs
import { chromium } from "playwright";
const BASE = process.env.BASE || "http://127.0.0.1:3100";
const out = [];
const b = await chromium.launch();
for (const theme of ["light", "dark"]) {
  for (const [label, vp] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1 });
    await ctx.addInitScript((t) => {
      localStorage.setItem("wfm-locale", "es");
      localStorage.setItem("wfm-rescue-language-chosen", "1");
      localStorage.setItem("wfm-theme", t);
      if (!sessionStorage.getItem("v")) { localStorage.removeItem("wfm-studio-v1"); sessionStorage.setItem("v", "1"); }
    }, theme);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/app/studio`, { waitUntil: "domcontentloaded" });
    await p.getByRole("button", { name: "Usar plantilla" }).first().waitFor({ timeout: 20000 });
    const list = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    await p.screenshot({ path: `/tmp/studio-list-${theme}-${label}.png`, fullPage: false });
    // open the mixed report: KPI + donut + table
    await p.getByRole("button", { name: "Usar plantilla" }).nth(0).click();
    await p.waitForURL(/\/app\/studio\/[^/]+$/);
    await p.waitForTimeout(600);
    await p.getByRole("button", { name: "Dona", exact: true }).first().click();
    await p.waitForTimeout(300);
    const ed = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    // find buttons that are visible but text-invisible (color equal to background) is hard; check visibility of chart buttons
    const btnInfo = await p.evaluate(() => [...document.querySelectorAll("button")].filter(b => b.offsetParent).slice(0, 60).map(b => { const cs = getComputedStyle(b); return { t: b.innerText.trim().slice(0, 18), c: cs.color, bg: cs.backgroundColor }; }));
    await p.screenshot({ path: `/tmp/studio-editor-${theme}-${label}.png`, fullPage: true });
    out.push({ theme, label, listOverflow: list.sw - list.iw, editorOverflow: ed.sw - ed.iw, sampleButtons: btnInfo.slice(0, 4) });
    await ctx.close();
  }
}
await b.close();
console.log(JSON.stringify(out, null, 1));
