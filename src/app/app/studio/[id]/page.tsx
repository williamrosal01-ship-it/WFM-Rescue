"use client";
import { useEffect, useMemo, useState } from "react";
import { ExportMenu } from "@/components/export-menu";
import type { ExportSection } from "@/lib/export";
import type { ChartSpec, KpiCard } from "@/lib/pdf-report";
import { CHART } from "@/lib/chart-palette";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTx } from "@/lib/tx";
import { useI18n } from "@/lib/i18n";
import { useWfmStore, selectFilteredIntervals } from "@/lib/store";
import { useStudio } from "@/lib/studio-store";
import { Card, Button, Chip, EmptyState, Input, Select } from "@/components/ui";
import { useToast } from "@/components/toast";
import { StudioWidgetView } from "@/components/studio-widget";
import {
  CHART_KINDS,
  DIMENSIONS,
  METRICS,
  METRIC_BY_ID,
  AGG_LABEL,
  computeWidget,
  formatValue as formatStudioValue,
  type ValueFormat,
  emptyWidget,
  resolveText,
  widgetToCsv,
  type Agg,
  type ChartKind,
  type Dimension,
  type Locale,
  type MetricId,
  type Widget,
} from "@/lib/studio-core";
import { ArrowLeft, ArrowUp, ArrowDown, Download, Copy, Printer, Save, Trash2, Plus, X, Edit3, Maximize2 } from "lucide-react";

export default function StudioEditorPage() {
  // "view" hides every control marked .edit-only (and everything in print); "edit" shows them.
  const [mode, setMode] = useState<"edit" | "view">("view");
  const tx = useTx();
  const { locale } = useI18n();
  const loc: Locale = locale === "en" ? "en" : "es";
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { showToast } = useToast();

  const report = useStudio((s) => s.reports.find((r) => r.id === id));
  const update = useStudio((s) => s.update);
  const setWidgets = useStudio((s) => s.setWidgets);
  const updateWidget = useStudio((s) => s.updateWidget);
  const duplicate = useStudio((s) => s.duplicate);
  const remove = useStudio((s) => s.remove);
  const saveAsTemplate = useStudio((s) => s.saveAsTemplate);

  const { intervals, filters } = useWfmStore();
  const rows = useMemo(() => selectFilteredIntervals(intervals, filters), [intervals, filters]);

  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) return null;

  if (!report) {
    return (
      <Card>
        <EmptyState
          icon={<Save className="h-5 w-5" />}
          title={tx("Informe no encontrado", "Report not found")}
          description={tx("Puede que se haya eliminado o que se abra en otro navegador.", "It may have been deleted or opened in another browser.")}
          action={<Link href="/app/studio"><Button size="sm">{tx("Volver al estudio", "Back to Report Studio")}</Button></Link>}
        />
      </Card>
    );
  }

  const name = resolveText(report.name, loc);
  const description = resolveText(report.description, loc);

  const addWidget = (chart: ChartKind) => setWidgets(report.id, [...report.widgets, { ...emptyWidget(chart), chart }]);

  const move = (index: number, dir: -1 | 1) => {
    const next = [...report.widgets];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setWidgets(report.id, next);
  };

  const toggleMetric = (w: Widget, metric: MetricId) => {
    const active = w.metrics.some((m) => m.metric === metric);
    let metrics;
    if (active) {
      metrics = w.metrics.filter((m) => m.metric !== metric);
      if (metrics.length === 0) return; // keep at least one metric
    } else {
      const def = METRIC_BY_ID[metric];
      const entry = { metric, agg: def.defaultAgg };
      metrics = w.chart === "donut" ? [entry] : [...w.metrics, entry];
    }
    updateWidget(report.id, w.id, { metrics });
  };

  const setAgg = (w: Widget, metric: MetricId, agg: Agg) =>
    updateWidget(report.id, w.id, { metrics: w.metrics.map((m) => (m.metric === metric ? { ...m, agg } : m)) });

  const exportCsv = (w: Widget) => {
    const result = computeWidget(rows, w, loc);
    const dimLabel = DIMENSIONS.find((d) => d.id === w.dimension)?.label[loc] ?? "";
    const csv = widgetToCsv(result, w, loc, dimLabel);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/[^\w-]+/g, "-").toLowerCase() || "informe"}-${w.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // One sheet / table per chart, computed from the same filtered rows the charts use.
  const exportSections: ExportSection[] = report.widgets.map((w) => {
    const result = computeWidget(rows, w, loc);
    const dimLabel = DIMENSIONS.find((d) => d.id === w.dimension)?.label[loc] ?? (loc === "es" ? "Grupo" : "Group");
    const metricHeaders = w.metrics.map((m) => `${METRIC_BY_ID[m.metric]?.label[loc] ?? m.metric} (${AGG_LABEL[m.agg][loc]})`);
    const toRow = (first: string, values: Array<number | null>) =>
      Object.fromEntries([[dimLabel, first], ...metricHeaders.map((h, i) => [h, values[i] ?? ""])]) as Record<string, string | number>;
    const data = w.chart === "kpi"
      ? [toRow(loc === "es" ? "Total" : "Total", result.totals)]
      : result.groups.map((g) => toRow(g.label, g.values));
    return { name: resolveText(w.title, loc) || dimLabel, title: resolveText(w.title, loc) || dimLabel, rows: data };
  });

  // PDF content: KPI cards for KPI widgets, one chart per chart widget, tables for detail.
  const pdfKpis: KpiCard[] = [];
  const pdfCharts: ChartSpec[] = [];
  report.widgets.forEach((w) => {
    const metrics = w.metrics.filter((m) => METRIC_BY_ID[m.metric]);
    if (metrics.length === 0 || w.chart === "table") return;
    const result = computeWidget(rows, w, loc);
    const def = (i: number) => METRIC_BY_ID[metrics[i].metric];
    const aggName = (i: number) => AGG_LABEL[metrics[i].agg][loc];
    const fmt = (i: number): ValueFormat => def(i).format as ValueFormat;
    const title = resolveText(w.title, loc) || DIMENSIONS.find((d) => d.id === w.dimension)?.label[loc] || "";
    if (w.chart === "kpi") {
      metrics.forEach((_, i) => pdfKpis.push({ label: `${def(i).label[loc]} · ${aggName(i)}`, value: formatStudioValue(result.totals[i], fmt(i), loc), tone: "neutral" }));
      return;
    }
    const f = fmt(0);
    pdfCharts.push({
      title,
      subtitle: `${DIMENSIONS.find((d) => d.id === w.dimension)?.label[loc] ?? ""} · ${result.groups.length} ${loc === "es" ? "grupos" : "groups"}`,
      categories: result.groups.map((g) => g.label).slice(0, 24),
      format: f === "pct" ? "pct" : f === "num" ? "dec1" : "int",
      stacked: w.chart === "stacked",
      series: metrics.map((m, i) => ({
        name: `${def(i).label[loc]} (${aggName(i)})`,
        color: CHART.series[i % CHART.series.length],
        values: result.groups.map((g) => g.values[i]).slice(0, 24),
        kind: w.chart === "line" ? "line" : "bar",
      })),
    });
  });

  return (
    <div className={`space-y-5 ${mode === "view" ? "wr-view" : "wr-edit"}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <Link href="/app/studio" className="mb-2 inline-flex items-center gap-1 text-xs text-[var(--accent-strong)] hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> {tx("Estudio de informes", "Report Studio")}
          </Link>
          <Input
            aria-label={tx("Nombre del informe", "Report name")}
            value={name}
            onChange={(e) => update(report.id, { name: e.target.value })}
            className="!text-lg !font-bold"
          />
          <Input
            aria-label={tx("Descripción", "Description")}
            value={description}
            placeholder={tx("Descripción breve (opcional)", "Short description (optional)")}
            onChange={(e) => update(report.id, { description: e.target.value })}
            className="edit-only mt-2 !text-sm"
          />
          <p className="mt-2 text-[11px] text-[var(--text-quaternary)]">
            {tx("Se guarda automáticamente en este navegador.", "Saved automatically in this browser.")} · {rows.length.toLocaleString(loc === "es" ? "es-ES" : "en-US")} {tx("intervalos con los filtros globales", "intervals with the global filters")}
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <ExportMenu name={name} title={name} subtitle={tx(`${report.widgets.length} gráficos · ${rows.length} intervalos con filtros globales`, `${report.widgets.length} charts · ${rows.length} intervals with global filters`)} sections={exportSections} pdf={{ kpis: pdfKpis, charts: pdfCharts, sections: exportSections }} disabled={report.widgets.length === 0} />
          <Button size="sm" variant="secondary" className="edit-only" leadingIcon={<Copy className="h-3.5 w-3.5" />} onClick={() => { const nid = duplicate(report.id); if (nid) router.push(`/app/studio/${nid}`); }}>
            {tx("Duplicar", "Duplicate")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="edit-only"
            leadingIcon={<Save className="h-3.5 w-3.5" />}
            onClick={() => {
              const tplName = window.prompt(tx("Nombre de la plantilla", "Template name"), name);
              if (!tplName) return;
              saveAsTemplate(report.id, tplName);
              showToast(tx("Plantilla guardada en Mis plantillas", "Template saved to My templates"), "success");
            }}
          >
            {tx("Guardar como plantilla", "Save as template")}
          </Button>
          <Button
            size="sm"
            variant="primary"
            leadingIcon={mode === "edit" ? <Maximize2 className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
            onClick={() => {
              if (mode === "edit") { setMode("view"); document.documentElement.requestFullscreen?.().catch(() => {}); }
              else { setMode("edit"); if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); }
            }}
          >
            {mode === "edit" ? tx("Ver", "View") : tx("Editar", "Edit")}
          </Button>
          <Button size="sm" variant="secondary" leadingIcon={<Printer className="h-3.5 w-3.5" />} onClick={() => window.print()}>
            {tx("Imprimir", "Print")}
          </Button>
          <Button
            size="sm"
            variant="danger"
            className="edit-only"
            leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={() => {
              if (window.confirm(tx("¿Eliminar este informe?", "Delete this report?"))) {
                remove(report.id);
                router.push("/app/studio");
              }
            }}
          >
            {tx("Eliminar", "Delete")}
          </Button>
        </div>
      </div>

      <Card className="edit-only">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">{tx("Añadir gráfico", "Add chart")}:</span>
          {CHART_KINDS.map((k) => (
            <Button key={k.id} size="sm" variant="secondary" leadingIcon={<Plus className="h-3 w-3" />} onClick={() => addWidget(k.id)}>
              {k.label[loc]}
            </Button>
          ))}
        </div>
      </Card>

      {report.widgets.length === 0 && (
        <Card>
          <EmptyState
            icon={<Plus className="h-5 w-5" />}
            title={tx("Este informe no tiene gráficos", "This report has no charts")}
            description={tx("Elige un tipo arriba para añadir el primero.", "Pick a type above to add the first one.")}
          />
        </Card>
      )}

      {report.widgets.map((w, index) => {
        const dimDisabled = w.chart === "kpi";
        const isDonut = w.chart === "donut";
        return (
          <Card key={w.id} padded>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Input
                aria-label={tx("Título del gráfico", "Chart title")}
                value={resolveText(w.title, loc)}
                onChange={(e) => updateWidget(report.id, w.id, { title: e.target.value })}
                className="!font-semibold md:max-w-md"
              />
              <div className="edit-only flex flex-wrap items-center gap-1.5">
                <button type="button" aria-label={tx("Subir", "Move up")} disabled={index === 0} onClick={() => move(index, -1)} className="btn btn-ghost !p-1.5 disabled:opacity-40"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" aria-label={tx("Bajar", "Move down")} disabled={index === report.widgets.length - 1} onClick={() => move(index, 1)} className="btn btn-ghost !p-1.5 disabled:opacity-40"><ArrowDown className="h-3.5 w-3.5" /></button>
                <Button size="sm" variant="secondary" leadingIcon={<Download className="h-3.5 w-3.5" />} onClick={() => exportCsv(w)}>CSV</Button>
                <button
                  type="button"
                  aria-label={tx("Quitar gráfico", "Remove chart")}
                  onClick={() => setWidgets(report.id, report.widgets.filter((x) => x.id !== w.id))}
                  className="btn btn-danger !p-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="edit-only mt-3 flex flex-wrap gap-1.5">
              {CHART_KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => updateWidget(report.id, w.id, { chart: k.id })}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${w.chart === k.id ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                >
                  {k.label[loc]}
                </button>
              ))}
              <span className="self-center pl-1 text-[11px] text-[var(--text-tertiary)]">{CHART_KINDS.find((k) => k.id === w.chart)?.hint[loc]}</span>
            </div>

            <div className="edit-only mt-3 grid gap-3 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <div className="space-y-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-[var(--text-tertiary)]">{tx("Dimensión (eje)", "Dimension (axis)")}</span>
                  <Select
                    aria-label={tx("Dimensión", "Dimension")}
                    value={w.dimension}
                    disabled={dimDisabled}
                    onChange={(e) => updateWidget(report.id, w.id, { dimension: e.target.value as Dimension })}
                  >
                    {DIMENSIONS.map((d) => (
                      <option key={d.id} value={d.id}>{d.label[loc]}</option>
                    ))}
                  </Select>
                </label>
                {isDonut && <p className="text-[11px] text-[var(--text-tertiary)]">{tx("La dona usa una sola métrica.", "The donut uses one metric.")}</p>}
              </div>

              <div>
                <span className="mb-1 block text-[11px] font-medium text-[var(--text-tertiary)]">{tx("Métricas y agregación", "Metrics and aggregation")}</span>
                <div className="flex flex-wrap gap-1.5">
                  {METRICS.map((m) => {
                    const active = w.metrics.find((x) => x.metric === m.id);
                    return (
                      <div key={m.id} className={`flex items-center gap-1 rounded-md border px-1.5 py-1 text-[11px] ${active ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border-default)]"}`}>
                        <button type="button" onClick={() => toggleMetric(w, m.id)} className={`font-medium ${active ? "text-[var(--accent-strong)]" : "text-[var(--text-secondary)]"}`}>
                          {m.label[loc]}
                        </button>
                        {active && m.aggs.length > 1 && (
                          <select
                            aria-label={`${tx("Agregación", "Aggregation")}: ${m.label[loc]}`}
                            value={active.agg}
                            onChange={(e) => setAgg(w, m.id, e.target.value as Agg)}
                            className="rounded border border-[var(--border-default)] bg-[var(--bg-surface)] px-1 py-0.5 text-[10px] text-[var(--text-primary)]"
                          >
                            {m.aggs.map((a) => <option key={a} value={a}>{AGG_LABEL[a][loc]}</option>)}
                          </select>
                        )}
                        {active && m.ratio && <Chip variant="neutral" className="!text-[9px]">{tx("tasa", "rate")}</Chip>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <StudioWidgetView widget={w} rows={rows} />
            </div>
          </Card>
        );
      })}

      <p className="text-[11px] text-[var(--text-quaternary)]">
        {tx(
          "Las métricas de tasa (servicio, ocupación, AHT y ASA) se promedian por intervalo. La tasa de abandono se calcula como suma de abandonadas entre suma de ofrecidas.",
          "Rate metrics (service level, occupancy, AHT and ASA) are averaged per interval. Abandon rate is total abandoned divided by total offered.",
        )}
      </p>
    </div>
  );
}

