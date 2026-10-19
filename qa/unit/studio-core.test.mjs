// Unit tests for src/lib/studio-core.ts. Run: node qa/unit/run-studio-tests.sh
import test from "node:test";
import assert from "node:assert/strict";
import * as C from "/tmp/studio-test/studio-core.js";

const row = (o) => ({ id: "x", intervalStart: new Date(0), intervalEnd: new Date(0), date: "2026-10-01", intervalLabel: "08:00", sourceType: "genesys", ...o });

test("aggregate: sum/avg/min/max/count ignore nulls; empty -> null", () => {
  assert.equal(C.aggregate([1, null, 3], "sum"), 4);
  assert.equal(C.aggregate([1, null, 3], "avg"), 2);
  assert.equal(C.aggregate([1, null, 3], "min"), 1);
  assert.equal(C.aggregate([1, null, 3], "max"), 3);
  assert.equal(C.aggregate([1, null, 3], "count"), 2);
  assert.equal(C.aggregate([null, null], "sum"), null);
  assert.equal(C.aggregate([], "count"), 0);
});

test("abandonRate is sum(abandoned)/sum(offered), not an average of ratios", () => {
  const rows = [row({ offered: 100, abandoned: 10 }), row({ offered: 300, abandoned: 60 })];
  const w = { id: "w", title: "t", chart: "kpi", dimension: "queue", metrics: [{ metric: "abandonRate", agg: "avg" }] };
  const r = C.computeWidget(rows, w);
  assert.ok(Math.abs(r.totals[0] - 70 / 400) < 1e-12);
});

test("staffGap is max(0, required - present) per interval", () => {
  const rows = [row({ requiredStaff: 10, actualStaff: 7 }), row({ requiredStaff: 5, actualStaff: 9 })];
  const w = { id: "w", title: "t", chart: "kpi", dimension: "queue", metrics: [{ metric: "staffGap", agg: "sum" }] };
  assert.equal(C.computeWidget(rows, w).totals[0], 3);
});

test("volumeDiff requires both actual and forecast", () => {
  const rows = [row({ actualVolume: 50, forecastVolume: 40 }), row({ actualVolume: 10 })];
  const w = { id: "w", title: "t", chart: "kpi", dimension: "queue", metrics: [{ metric: "volumeDiff", agg: "sum" }] };
  assert.equal(C.computeWidget(rows, w).totals[0], 10);
});

test("queue groups sort by first metric desc; no-value group last", () => {
  const rows = [
    row({ queue: "A", offered: 10 }), row({ queue: "B", offered: 30 }), row({ queue: "B", offered: 5 }),
    row({ offered: 999 }), row({ queue: "C", offered: 20 }),
  ];
  const w = { id: "w", title: "t", chart: "bar", dimension: "queue", metrics: [{ metric: "offered", agg: "sum" }] };
  const r = C.computeWidget(rows, w, "es");
  assert.deepEqual(r.groups.map((g) => g.key), ["B", "C", "A", C.NO_VALUE_KEY]);
  assert.equal(r.groups[0].values[0], 35);
  assert.equal(r.groups[0].rows, 2);
  assert.equal(r.groups[3].label, "(sin valor)");
  assert.equal(C.computeWidget(rows, w, "en").groups[3].label, "(no value)");
});

test("interval groups sort ascending by label", () => {
  const rows = [row({ intervalLabel: "09:00", offered: 1 }), row({ intervalLabel: "08:15", offered: 2 })];
  const w = { id: "w", title: "t", chart: "line", dimension: "interval", metrics: [{ metric: "offered", agg: "sum" }] };
  assert.deepEqual(C.computeWidget(rows, w).groups.map((g) => g.key), ["08:15", "09:00"]);
});

test("KPI totals equal the sum over all rows", () => {
  const rows = [row({ offered: 4, answered: 3 }), row({ offered: 6, answered: 5 })];
  const w = { id: "w", title: "t", chart: "kpi", dimension: "queue", metrics: [{ metric: "offered", agg: "sum" }, { metric: "answered", agg: "sum" }] };
  const r = C.computeWidget(rows, w);
  assert.deepEqual(r.totals, [10, 8]);
  assert.equal(r.groups.length, 0);
});

test("CSV has BOM, header, one line per group, and escapes commas", () => {
  const rows = [row({ queue: "Ventas, Norte", offered: 2 })];
  const w = { id: "w", title: "t", chart: "bar", dimension: "queue", metrics: [{ metric: "offered", agg: "sum" }] };
  const csv = C.widgetToCsv(C.computeWidget(rows, w), w, "es", "Cola");
  assert.ok(csv.startsWith("\uFEFF"));
  const lines = csv.slice(1).split("\n");
  assert.equal(lines.length, 2);
  assert.equal(lines[0], "Cola,Ofrecidas (Suma)");
  assert.equal(lines[1], "\"Ventas, Norte\",2");
});

test("normalizeWidget: donut keeps one metric, invalid agg falls back to default", () => {
  const w = C.normalizeWidget({ id: "w", title: "t", chart: "donut", dimension: "channel", metrics: [{ metric: "offered", agg: "sum" }, { metric: "answered", agg: "sum" }] });
  assert.equal(w.metrics.length, 1);
  const w2 = C.normalizeWidget({ id: "w", title: "t", chart: "bar", dimension: "queue", metrics: [{ metric: "abandonRate", agg: "sum" }] });
  assert.equal(w2.metrics[0].agg, "avg");
  const w3 = C.normalizeWidget({ id: "w", title: "t", chart: "bar", dimension: "queue", metrics: [] });
  assert.equal(w3.metrics[0].metric, "offered");
});

test("mixed formats are flagged for charts, not for tables or KPIs", () => {
  const base = { id: "w", title: "t", dimension: "queue", metrics: [{ metric: "offered", agg: "sum" }, { metric: "serviceLevel", agg: "avg" }] };
  assert.equal(C.widgetHasMixedFormats({ ...base, chart: "bar" }), true);
  assert.equal(C.widgetHasMixedFormats({ ...base, chart: "table" }), false);
  assert.equal(C.widgetHasMixedFormats({ ...base, chart: "kpi" }), false);
});

test("formatValue", () => {
  assert.equal(C.formatValue(0.8, "pct"), "80.0%");
  assert.equal(C.formatValue(null, "int"), "—");
  assert.equal(C.formatValue(12.4, "sec"), "12 s");
  assert.equal(C.formatValue(76579, "int", "en"), "76,579");
  assert.equal(C.formatValue(76579, "int", "es"), "76.579");
  assert.equal(C.formatValue(12.4, "sec", "en"), "12 sec");
});

test("every built-in template is valid and produces a report", () => {
  const kinds = new Set(["kpi", "bar", "stacked", "line", "donut", "table"]);
  const dims = new Set(["interval", "date", "queue", "channel", "site", "skill"]);
  assert.ok(C.TEMPLATES.length >= 8);
  for (const t of C.TEMPLATES) {
    const rep = C.reportFromTemplate(t.id);
    assert.equal(rep.templateId, t.id);
    assert.ok(rep.widgets.length >= 1, t.id);
    assert.deepEqual(C.validateReport(rep), [], t.id);
    for (const wd of rep.widgets) {
      assert.ok(kinds.has(wd.chart), `${t.id} chart ${wd.chart}`);
      assert.ok(dims.has(wd.dimension), `${t.id} dim ${wd.dimension}`);
      for (const m of wd.metrics) {
        const def = C.METRIC_BY_ID[m.metric];
        assert.ok(def, `${t.id} metric ${m.metric}`);
        assert.ok(def.aggs.includes(m.agg), `${t.id} agg ${m.agg} for ${m.metric}`);
      }
    }
  }
});

test("no built-in template uses area for everything: each template has a chart matched to its data", () => {
  const byId = Object.fromEntries(C.TEMPLATES.map((t) => [t.id, t.widgets.map((w) => w.chart)]));
  assert.deepEqual(byId["channel-mix"], ["donut"]);
  assert.deepEqual(byId["queue-detail-table"], ["table"]);
  assert.deepEqual(byId["kpi-summary"], ["kpi"]);
  assert.deepEqual(byId["staffing-by-interval"], ["line"]);
  assert.deepEqual(byId["service-by-queue"], ["bar"]);
});

test("resolveText picks the locale for bilingual text", () => {
  assert.equal(C.resolveText({ es: "Hola", en: "Hi" }, "en"), "Hi");
  assert.equal(C.resolveText("Mi informe", "en"), "Mi informe");
});
