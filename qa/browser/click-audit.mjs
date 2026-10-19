// Clicks every visible button/link on each route; records page errors, URL change, DOM change.
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = process.env.BASE || 'http://127.0.0.1:3100';
const lang = process.argv[2] || 'en';
const ROUTES = ['/', '/pricing', '/docs', '/app/dashboard', '/app/intraday', '/app/service-level', '/app/staffing', '/app/adherence', '/app/attendance', '/app/aux-report', '/app/capacity', '/app/occupancy', '/app/nlh', '/app/forecast', '/app/diagnostics', '/app/data-health', '/app/import', '/app/reports', '/app/settings'];
const SKIP = /logout|log out|sign out|cerrar sesi|salir|delete|eliminar|borrar|reset|descargar|download|export|exportar|csv|xlsx|pdf|mailto|checkout|pagar|pay|upload/i;
const b = await chromium.launch({ args: ['--no-sandbox'] });
const results = [];
for (const route of ROUTES) {
  const ctx = await b.newContext({ viewport: { width: 1366, height: 860 }, acceptDownloads: true });
  await ctx.addInitScript((l) => { localStorage.setItem('wfm-locale', l); localStorage.setItem('wfm-rescue-language-chosen', '1'); }, lang);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  await p.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(400);
  const count = await p.evaluate(() => [...document.querySelectorAll('button, a[href], [role="button"], select, input[type="checkbox"]')].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none'; }).length);
  for (let i = 0; i < count; i++) {
    // re-load the route each time to start from a known state
    if (i > 0) { await p.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}); await p.waitForTimeout(600); }
    const info = await p.evaluate((idx) => {
      const els = [...document.querySelectorAll('button, a[href], [role="button"], select, input[type="checkbox"]')].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none'; });
      const el = els[idx]; if (!el) return null;
      const label = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('href') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 60);
      return { label, tag: el.tagName, href: el.getAttribute('href'), disabled: el.disabled === true };
    }, i);
    if (!info) continue;
    const row = { route, lang, idx: i, label: info.label, tag: info.tag, status: null, effect: null, errors: [] };
    if (SKIP.test(info.label) || info.disabled || (info.href && /^(https?:|mailto:)/.test(info.href) && !info.href.startsWith(BASE))) { row.status = 'skipped'; results.push(row); continue; }
    const before = { url: p.url(), html: await p.evaluate(() => document.body.innerText.length) };
    const errBefore = errs.length;
    try {
      const pop = p.waitForEvent('popup', { timeout: 500 }).catch(() => null);
      await p.evaluate((idx) => { const els = [...document.querySelectorAll('button, a[href], [role="button"], select, input[type="checkbox"]')].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none'; }); els[idx]?.scrollIntoView({ block: 'center' }); }, i);
      const target = await p.evaluate((idx) => { const els = [...document.querySelectorAll('button, a[href], [role="button"], select, input[type="checkbox"]')].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none'; }); const el = els[idx]; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, i);
      await p.mouse.click(target.x, target.y, { delay: 20 });
      await p.waitForTimeout(350);
      const after = { url: p.url(), html: await p.evaluate(() => document.body.innerText.length), dialog: await p.evaluate(() => !!document.querySelector('[role="dialog"], [role="menu"], [role="listbox"]')) };
      row.effect = after.url !== before.url ? 'navigated' : (after.dialog ? 'opened-dialog' : (after.html !== before.html ? 'changed-content' : 'no-visible-change'));
      row.status = errs.length > errBefore ? 'ERROR' : 'ok';
      row.errors = errs.slice(errBefore);
      await pop.then(x => x && x.close()).catch(() => {});
    } catch (e) { row.status = 'click-failed'; row.errors = [e.message.slice(0, 120)]; }
    results.push(row);
  }
  await ctx.close();
  console.log(route, 'controls=', count, 'done');
}
fs.writeFileSync(`/home/user/wfm-rescue-web/qa/browser/click-audit-${lang}.json`, JSON.stringify(results, null, 2));
const tally = results.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {});
console.log('TALLY', JSON.stringify(tally));
const noEffect = results.filter(r => r.status === 'ok' && r.effect === 'no-visible-change');
console.log('NO VISIBLE EFFECT (ok status):', noEffect.length);
await b.close();
