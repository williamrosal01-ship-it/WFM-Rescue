import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1366, height: 860 } });
await ctx.addInitScript(() => { localStorage.setItem('wfm-locale','en'); localStorage.setItem('wfm-rescue-language-chosen','1'); });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:3100/app/import', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
const r = await p.evaluate(() => {
  const notice = [...document.querySelectorAll('div')].some(d => d.innerText && d.innerText.startsWith('You are in the demo workspace'));
  const fileInputs = [...document.querySelectorAll('input[type=file]')];
  const visibleInput = fileInputs.some(i => i.offsetParent !== null);
  const drop = [...document.querySelectorAll('div')].find(d => d.innerText && d.innerText.includes('Drag your CSV or XLSX here'));
  return { notice, fileInputs: fileInputs.length, visibleInput, dropVisible: !!drop && drop.offsetParent !== null };
});
const logoPath = await p.evaluate(() => !!document.querySelector('path[d="m12 14 4-4"]'));
console.log(JSON.stringify({ ...r, gaugeLogo: logoPath, pageErrors: errs.length }));
await p.goto('http://127.0.0.1:3100/app/dashboard', { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
console.log('dashboard gauge logo:', await p.evaluate(() => !!document.querySelector('path[d="m12 14 4-4"]')));
await b.close();
