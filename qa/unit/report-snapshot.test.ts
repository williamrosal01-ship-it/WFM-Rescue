// Pruebas de los informes compartidos: contenido, idioma, privacidad y tamaño.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDemoData } from "../../src/lib/demo-data";
import {
  buildAttendanceContent,
  buildDashboardContent,
  buildForecastContent,
  buildAuxContent,
  filtersSummary,
  expiryFromDays,
  makeSnapshot,
  SNAPSHOT_MAX_BYTES,
} from "../../src/lib/report-snapshot";
import { aggregateIntervals } from "../../src/lib/wfm";

const data = buildDemoData();
const rows = data.intervals;
const agents = data.agentIntervals;
const ES_WORDS = /Asistencia|Ausent|Ausentes|Presentes|Cola|Pronóstico|Ofrecidas|Equipo|Código|Intervalos|Excede|Desvío/;
const EN_WORDS = /\bAttendance\b|Absenteeism|Present\b|Queue\b|Forecast\b|Offered\b|Team\b|Code\b|Intervals\b|Exceeds|Deviation/;

const allText = (c: unknown) => JSON.stringify(c);

test("demo data tiene intervalos y actividad de agentes", () => {
  assert.ok(rows.length > 100, "intervalos");
  assert.ok(agents.length > 100, "intervalos de agente");
});

test("asistencia: KPI coincide con el cálculo de la página (presentes / programados)", () => {
  const k = aggregateIntervals(rows);
  const c = buildAttendanceContent(rows, "es");
  const expected = Math.min(1, k.totalActual / k.totalScheduled);
  assert.equal(c.kpis[0].value, expected);
  assert.equal(c.kpis[0].format, "pct");
  assert.equal(c.charts[0].type, "gauge");
  assert.equal(c.charts[0].type === "gauge" ? c.charts[0].thresholds.good : 0, 0.97);
  assert.ok(c.charts.length === 3);
});

test("asistencia: sin tardanza estimada (se declara en la nota)", () => {
  const c = buildAttendanceContent(rows, "es");
  assert.ok(!c.kpis.some((k) => /tardanz|tardiness/i.test(k.label)));
  assert.ok(c.note && /tardanza/i.test(c.note));
});

test("dashboard: 6 KPIs, 3 gráficas, tabla por cola", () => {
  const c = buildDashboardContent(rows, "en");
  assert.equal(c.kpis.length, 6);
  assert.equal(c.charts.length, 3);
  assert.equal(c.tables.length, 1);
  assert.ok(c.tables[0].rows.length >= 2);
  for (const r of c.tables[0].rows) assert.ok(typeof r.offered === "number");
});

test("pronóstico: sesgo y precisión son números finitos o null", () => {
  const c = buildForecastContent(rows, "es");
  for (const k of c.kpis) {
    assert.ok(k.value === null || Number.isFinite(k.value as number), k.label);
  }
  assert.ok(c.tables[0].rows.length >= 2);
});

test("AUX: agentes anonimizados (ningún nombre real aparece)", () => {
  const names = new Set(agents.map((a) => a.agentName).filter(Boolean));
  const c = buildAuxContent(agents, "es");
  const text = allText(c);
  for (const n of names) {
    assert.ok(!text.includes(n as string), `nombre expuesto: ${n}`);
  }
  assert.ok(/Agente \d+/.test(text) || c.tables[1].rows.length === 0);
});

test("idioma: el contenido en inglés no mezcla español y viceversa", () => {
  for (const build of [buildAttendanceContent, buildDashboardContent, buildForecastContent]) {
    const en = allText(build(rows, "en"));
    const es = allText(build(rows, "es"));
    assert.ok(!ES_WORDS.test(en), `ES en contenido EN: ${en.match(ES_WORDS)?.[0]}`);
    assert.ok(!EN_WORDS.test(es), `EN en contenido ES: ${es.match(EN_WORDS)?.[0]}`);
  }
  const aux = { en: allText(buildAuxContent(agents, "en")), es: allText(buildAuxContent(agents, "es")) };
  assert.ok(!ES_WORDS.test(aux.en), `ES en AUX EN: ${aux.en.match(ES_WORDS)?.[0]}`);
  assert.ok(!EN_WORDS.test(aux.es), `EN en AUX ES: ${aux.es.match(EN_WORDS)?.[0]}`);
});

test("tamaño: los cuatro informes con datos demo caben en el límite", () => {
  const meta = {
    reportName: "Demo",
    orgName: "WFM Rescue Demo",
    datasetName: "demo",
    datasetIsDemo: true,
    filtersText: "Sin filtros",
    generatedAt: new Date().toISOString(),
    lang: "es" as const,
  };
  const built = [
    buildAttendanceContent(rows, "es"),
    buildDashboardContent(rows, "es"),
    buildForecastContent(rows, "es"),
    buildAuxContent(agents, "es"),
  ];
  for (const c of built) {
    const snap = makeSnapshot(c, meta);
    const bytes = new TextEncoder().encode(JSON.stringify(snap)).length;
    assert.ok(bytes < SNAPSHOT_MAX_BYTES, `tamaño ${bytes}`);
    assert.equal(snap.v, 1);
  }
});

test("makeSnapshot rechaza un informe demasiado grande", () => {
  const big = { kpis: [], charts: [], tables: [{ title: "x", columns: [{ key: "a", label: "a", format: "text" as const }], rows: Array.from({ length: 20000 }, () => ({ a: "xxxxxxxxxxxxxxxxxxxxxxxxxxxx" })) }] };
  assert.throws(() => makeSnapshot(big, { reportName: "x", orgName: "x", datasetName: "x", datasetIsDemo: false, filtersText: "", generatedAt: "", lang: "en" }), /snapshot_too_large/);
});

test("filtros: texto en el idioma correcto", () => {
  const none = { queues: [], channels: [], sites: [], skills: [] };
  assert.equal(filtersSummary(none, "es"), "Sin filtros");
  assert.equal(filtersSummary(none, "en"), "No filters");
  assert.equal(filtersSummary({ ...none, queues: ["Sales", "Support"] }, "en"), "Queues: Sales, Support");
  assert.equal(filtersSummary({ ...none, sites: ["Lima"] }, "es"), "Sitios: Lima");
});

test("caducidad: días acotados entre 1 y 365", () => {
  const now = new Date("2026-10-19T12:00:00Z");
  assert.equal(expiryFromDays(7, now).toISOString(), "2026-10-26T12:00:00.000Z");
  assert.equal(expiryFromDays(0, now).toISOString(), "2026-10-20T12:00:00.000Z");
  assert.equal(expiryFromDays(9999, now).toISOString(), "2027-10-19T12:00:00.000Z");
});
