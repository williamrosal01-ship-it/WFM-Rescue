import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1366, height: 860 } });
await ctx.addInitScript(() => { localStorage.setItem('wfm-locale','en'); localStorage.setItem('wfm-rescue-language-chosen','1'); });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:3100/', { waitUntil: 'networkidle' });
const info = async (label) => console.log(label, await p.evaluate(() => {
  const el = [...document.querySelectorAll('button,a')].find(e => /Probar demo|Try demo/.test(e.innerText));
  if (!el) return 'not found';
  const cs = getComputedStyle(el);
  return JSON.stringify({ text: el.innerText.trim(), color: cs.color, bg: cs.backgroundColor, cls: el.className.slice(0,80), htmlTheme: document.documentElement.getAttribute('data-theme'), htmlClass: document.documentElement.className });
}));
await info('LIGHT:');
await p.evaluate(() => { document.documentElement.setAttribute('data-theme','dark'); });
await p.waitForTimeout(300);
await info('DARK:');
await b.close();
