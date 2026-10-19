"use client";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import {
  BAR_MAX_GROUPS,
  DONUT_MAX_SLICES,
  DIMENSIONS,
  METRIC_BY_ID,
  AGG_LABEL,
  computeWidget,
  formatValue,
  widgetHasMixedFormats,
  type ValueFormat,
  type Widget,
} from "@/lib/studio-core";
import type { IntervalRecord } from "@/lib/types";
import type { Locale } from "@/lib/studio-core";
import { tooltipStyle, gridProps, tickStyle } from "@/components/charts";

export const STUDIO_PALETTE = ["#14b8a6", "#818cf8", "#f59e0b", "#3b82f6", "#f43f5e", "#10b981", "#8b5cf6", "#94a3b8"];

const L = (locale: Locale, es: string, en: string) => (locale === "es" ? es : en);

export function StudioWidgetView({ widget, rows }: { widget: Widget; rows: IntervalRecord[] }) {
  const { locale } = useI18n();
  const loc: Locale = locale === "en" ? "en" : "es";
  const result = useMemo(() => computeWidget(rows, widget, loc), [rows, widget, loc]);
  const metricDefs = widget.metrics.map((m) => METRIC_BY_ID[m.metric]);
  const mixed = widgetHasMixedFormats(widget);
  const fv = (v: number | null, f: ValueFormat) => formatValue(v, f, loc);
  const dimLabel = DIMENSIONS.find((d) => d.id === widget.dimension)?.label[loc] ?? "";

  if (rows.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] text-sm text-[var(--text-tertiary)]">
        {L(loc, "Sin datos con los filtros actuales.", "No data for the current filters.")}
      </div>
    );
  }

  if (widget.chart === "kpi") {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {widget.metrics.map((m, i) => {
          const def = metricDefs[i];
          return (
            <div key={`${m.metric}-${i}`} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3">
              <div className="text-[11px] font-medium text-[var(--text-tertiary)]">{def.label[loc]}</div>
              <div className="mt-1 text-xl font-bold text-[var(--text-primary)] tabular-nums">{fv(result.totals[i], def.format)}</div>
              <div className="mt-0.5 text-[10px] text-[var(--text-quaternary)]">{def.ratio ? L(loc, "Suma abandonadas / ofrecidas", "Sum abandoned / offered") : `${L(loc, "Agregado", "Aggregate")}: ${AGG_LABEL[m.agg][loc]}`}</div>
            </div>
          );
        })}
      </div>
    );
  }

  if (widget.chart === "table") {
    return (
      <div className="overflow-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="w-full text-xs">
          <thead className="bg-[var(--bg-subtle)] text-[var(--text-tertiary)]">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">{dimLabel}</th>
              <th className="px-3 py-2 text-right font-semibold">{L(loc, "Filas", "Rows")}</th>
              {metricDefs.map((d, i) => (
                <th key={i} className="px-3 py-2 text-right font-semibold whitespace-nowrap">{d.label[loc]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.groups.map((g) => (
              <tr key={g.key} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-1.5 text-left text-[var(--text-primary)]">{g.label}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{g.rows}</td>
                {g.values.map((v, i) => (
                  <td key={i} className="px-3 py-1.5 text-right tabular-nums">{fv(v, metricDefs[i].format)}</td>
                ))}
              </tr>
            ))}
            <tr className="border-t-2 border-[var(--border-default)] font-semibold">
              <td className="px-3 py-1.5 text-left">{L(loc, "Total", "Total")}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{result.rows}</td>
              {result.totals.map((v, i) => (
                <td key={i} className="px-3 py-1.5 text-right tabular-nums">{fv(v, metricDefs[i].format)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (widget.chart === "donut") {
    const primary = metricDefs[0];
    const slices = result.groups
      .map((g, i) => ({ name: g.label, value: g.values[0] ?? 0, color: STUDIO_PALETTE[i % STUDIO_PALETTE.length] }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);
    const shown = slices.slice(0, DONUT_MAX_SLICES);
    const hidden = slices.length - shown.length;
    return (
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="h-64 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={shown} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={1} isAnimationActive={false}>
                {shown.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fv(Number(v), primary.format)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-1.5 self-center text-xs">
          {shown.map((s) => (
            <li key={s.name} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[var(--text-secondary)]"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{s.name}</span>
              <span className="tabular-nums text-[var(--text-primary)]">{fv(s.value, primary.format)}</span>
            </li>
          ))}
          {hidden > 0 && <li className="text-[10px] text-[var(--text-quaternary)]">{L(loc, `+ ${hidden} más (ver tabla)`, `+ ${hidden} more (see table)`)}</li>}
        </ul>
      </div>
    );
  }

  // bar / stacked / line share the cartesian data shape
  const groups = result.groups.slice(0, widget.chart === "line" ? result.groups.length : BAR_MAX_GROUPS);
  const data = groups.map((g) => {
    const row: Record<string, string | number | null> = { label: g.label };
    g.values.forEach((v, i) => { row[`m${i}`] = v; });
    return row;
  });
  const hiddenGroups = result.groups.length - groups.length;
  return (
    <div className="space-y-2">
      {mixed && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-600 dark:text-amber-300">
          {L(loc, "Estas métricas tienen unidades distintas: en un gráfico comparten eje. Usa tabla o un KPI por unidad.", "These metrics have different units and share one axis. Use a table or one KPI per unit.")}
        </div>
      )}
      <div className="h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          {widget.chart === "line" ? (
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" tick={tickStyle} interval="preserveStartEnd" />
              <YAxis tick={tickStyle} width={48} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [fv(Number(v), metricDefs[Number(String(name).replace("m", ""))]?.format ?? "num"), metricDefs[Number(String(name).replace("m", ""))]?.label[loc] ?? name]} />
              {metricDefs.length > 1 && <Legend formatter={(_v, entry) => metricDefs[Number(String(entry.dataKey).replace("m", ""))]?.label[loc] ?? ""} />}
              {metricDefs.map((d, i) => (
                <Line key={i} type="monotone" dataKey={`m${i}`} stroke={STUDIO_PALETTE[i % STUDIO_PALETTE.length]} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
              ))}
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" tick={tickStyle} interval={0} angle={data.length > 8 ? -35 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 60 : 30} />
              <YAxis tick={tickStyle} width={48} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [fv(Number(v), metricDefs[Number(String(name).replace("m", ""))]?.format ?? "num"), metricDefs[Number(String(name).replace("m", ""))]?.label[loc] ?? name]} />
              {metricDefs.length > 1 && <Legend formatter={(_v, entry) => metricDefs[Number(String(entry.dataKey).replace("m", ""))]?.label[loc] ?? ""} />}
              {metricDefs.map((d, i) => (
                <Bar key={i} dataKey={`m${i}`} fill={STUDIO_PALETTE[i % STUDIO_PALETTE.length]} radius={[3, 3, 0, 0]} isAnimationActive={false} stackId={widget.chart === "stacked" ? "s" : undefined} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      {hiddenGroups > 0 && (
        <p className="text-[10px] text-[var(--text-quaternary)]">{L(loc, `Mostrando ${groups.length} de ${result.groups.length} grupos. La tabla incluye todos.`, `Showing ${groups.length} of ${result.groups.length} groups. The table includes all.`)}</p>
      )}
    </div>
  );
}

