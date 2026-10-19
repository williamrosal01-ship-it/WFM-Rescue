// Browser review: language purity, page errors, button contrast in light/dark, mobile overflow.
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = process.env.BASE || 'http://127.0.0.1:3100';
const ROUTES = ['/', '/pricing', '/docs', '/app/dashboard', '/app/intraday', '/app/service-level', '/app/staffing', '/app/adherence', '/app/attendance', '/app/aux-report', '/app/capacity', '/app/occupancy', '/app/nlh', '/app/forecast', '/app/diagnostics', '/app/data-health', '/app/import', '/app/reports', '/app/settings'];
const EN_WORDS = /\b(Open|Close|Search|Total|Export|Filter|Select|Reset|View|Save|Cancel|Delete|Import|Data|Settings|Report|Show|Hide|Apply|Clear|Edit|Back|Next|Continue|Loading|No data|Your|The|and|with|from|for|Sign in|Sign up|Upload|Download|Preview|Add|Remove|Update|Create|Status|Name|Date|Time|Team|Agent|Queue|Channel|Site|Action|Target|Value|Summary|Overview)\b/;
const ES_WORDS = /\b(Limpiar|Cargar|Buscar|Guardar|Cerrar|Sin|Cola|Canal|Sitio|Abrir|Exportar|Filtrar|Seleccionar|Restablecer|Ver|Eliminar|Importar|Datos|Configuración|Informe|Mostrar|Ocultar|Aplicar|Editar|Atrás|Siguiente|Continuar|Cargando|Tu|Tus|del|los|las|con|para|desde|Estado|Nombre|Fecha|Hora|Equipo|Agente|Acción|Valor|Resumen|Detalles)\b/;
const lang = process.argv[2] || 'en';
const out = { lang, routes: {} };
const b = await chromium.launch({ args: ['--no-sandbox'] });

async function visit(p, path, theme) {
  await p.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(600);
}

const ctx = await b.newContext({ viewport: { width: 1366, height: 860 } });
await ctx.addInitScript((l) => { try { localStorage.setItem('wfm-lang', l); localStorage.setItem('wfm-locale', l); localStorage.setItem('locale', l); localStorage.setItem('wfm-rescue-language', l); localStorage.setItem('wfm-rescue-language-chosen', '1'); } catch {} }, lang);
const p = await ctx.newPage();
const pageErrors = {};
p.on('pageerror', (e) => { (pageErrors[p.url()] ??= []).push(e.message.slice(0, 160)); });

for (const r of ROUTES) {
  const res = { errors: [], wrongLang: [], lowContrast: { light: [], dark: [] }, mobileOverflow: null, buttons: 0 };
  try {
    await visit(p, r);
    res.errors = pageErrors[BASE + r] || [];
    const texts = await p.evaluate(() => { const s = new Set(); const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const t = n.textContent.trim(); if (t.length > 1 && n.parentElement && !['SCRIPT','STYLE'].includes(n.parentElement.tagName)) s.add(t); } return [...s]; });
    res.wrongLang = texts.filter(t => (lang === 'es' ? EN_WORDS.test(t) : ES_WORDS.test(t)) && !/^[A-Z0-9 .,%:/-]{1,6}$/.test(t)).slice(0, 400);
    // contrast check for visible buttons/links (text vs effective background)
    const contrastFn = () => {
      const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(',').map(x => parseFloat(x)); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
      const lum = ({ r, g, b }) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const bgOf = (el) => { let e = el; while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.5) return c; e = e.parentElement; } return { r: 255, g: 255, b: 255, a: 1 }; };
      const bad = [];
      let count = 0;
      document.querySelectorAll('button, a, [role="button"]').forEach((el) => {
        const rect = el.getBoundingClientRect(); if (rect.width < 4 || rect.height < 4) return;
        const st = getComputedStyle(el); if (st.visibility === 'hidden' || st.display === 'none' || parseFloat(st.opacity) === 0) return;
        const txt = (el.innerText || el.getAttribute('aria-label') || '').trim(); if (!txt) return;
        count++;
        const fg = parse(st.color); const bg = bgOf(el); if (!fg) return;
        const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        if (ratio < 3) bad.push(`${txt.slice(0, 30)} (${ratio.toFixed(2)})`);
      });
      return { count, bad: bad.slice(0, 15) };
    };
    const theme0 = await p.evaluate(() => document.documentElement.className + ' ' + (document.documentElement.getAttribute('data-theme') || ''));
    const lightRes = await p.evaluate(contrastFn);
    // switch to dark: toggle class/attribute used by the app
    await p.evaluate(() => { const h = document.documentElement; const dark = h.classList.contains('dark') || h.getAttribute('data-theme') === 'dark'; h.classList.toggle('dark', !dark); h.setAttribute('data-theme', dark ? 'light' : 'dark'); document.body.setAttribute('data-theme', dark ? 'light' : 'dark'); });
    await p.waitForTimeout(300);
    const darkRes = await p.evaluate(contrastFn);
    res.buttons = lightRes.count;
    res.lowContrast = { light: lightRes.bad, dark: darkRes.bad };
    res.themeHint = theme0.slice(0, 60);
    // mobile overflow
    const mp = await ctx.newPage();
    await mp.setViewportSize({ width: 390, height: 844 });
    await mp.addInitScript((l) => { try { localStorage.setItem('wfm-rescue-language', l); localStorage.setItem('wfm-rescue-language-chosen', '1'); } catch {} }, lang);
    await mp.goto(BASE + r, { waitUntil: 'networkidle', timeout: 30000 }); await mp.waitForTimeout(500);
    res.mobileOverflow = await mp.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));
    await mp.close();
  } catch (e) { res.fatal = e.message.slice(0, 160); }
  out.routes[r] = res;
  console.log(`${r} btn=${res.buttons} errs=${res.errors.length} wrongLang=${res.wrongLang.length} lowContrastLight=${res.lowContrast.light.length} dark=${res.lowContrast.dark.length} overflow=${res.mobileOverflow ? res.mobileOverflow.scrollW - res.mobileOverflow.clientW : 'n/a'} ${res.fatal ?? ''}`);
}
fs.writeFileSync(`/home/user/wfm-rescue-web/qa/browser/review-${lang}.json`, JSON.stringify(out, null, 2));
await b.close();
