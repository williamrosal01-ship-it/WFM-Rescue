import { chromium } from 'playwright';
const routes = process.argv.slice(2);
const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => { localStorage.setItem('wfm-locale','en'); localStorage.setItem('wfm-rescue-language-chosen','1'); });
const p = await ctx.newPage();
for (const r of routes) {
  await p.goto('http://127.0.0.1:3100' + r, { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  const culprits = await p.evaluate(() => {
    const W = document.documentElement.clientWidth; const out = [];
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect(); if (r.right > W + 2 && r.width > 0) {
        // only report elements whose parent does not scroll
        let p = el.parentElement, scroll = false; while (p && p !== document.body) { const cs = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(cs.overflowX)) { scroll = true; break; } p = p.parentElement; }
        if (!scroll) out.push(`${el.tagName.toLowerCase()}.${(el.className && el.className.baseVal === undefined ? el.className : '').toString().split(' ').slice(0,3).join('.')} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
      }
    });
    return out.slice(0, 6);
  });
  console.log(r, culprits);
}
await b.close();
