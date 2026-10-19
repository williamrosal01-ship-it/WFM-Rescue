import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => { localStorage.setItem('wfm-locale','en'); localStorage.setItem('wfm-rescue-language-chosen','1'); });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:3100/app/staffing', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
console.log(await p.evaluate(() => {
  const row = document.querySelector('div.flex.min-h-screen'); 
  const kids = [...row.children].map(c => `${c.tagName}.${String(c.className).slice(0,60)} w=${Math.round(c.getBoundingClientRect().width)} x=${Math.round(c.getBoundingClientRect().left)} cs=${getComputedStyle(c).position}`);
  const main = row.querySelector('main');
  return { viewport: innerWidth, docScroll: document.documentElement.scrollWidth, kids, main: main && Math.round(main.getBoundingClientRect().width), mainParent: main && main.parentElement.className.slice(0,80), mainMinW: main && getComputedStyle(main).minWidth };
}));
await b.close();
