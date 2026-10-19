"use client";

// Vista de un informe compartido (la "foto"). Se usa en /r/[token]. No necesita cuenta.
// Todo el texto sale del idioma guardado en el informe; no se mezcla con el idioma del visitante.
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GaugeChart, tooltipStyle, gridProps, tickStyle } from "@/components/charts";
import type { Fmt, Lang, ReportSnapshot, SnapChart, SnapKpi, SnapTable, Tone } from "@/lib/report-snapshot";

const TONE_COLOR: Record<Tone, string> = {
  good: "#10b981",
  warn: "#f59e0b",
  bad: "#f43f5e",
  neutral: "var(--text-primary)",
};

export function fmtValue(v: unknown, format: Fmt, lang: Lang): string {
  if (typeof v === "string") return v;
  if (v == null || typeof v !== "number" || !Number.isFinite(v)) return "—";
  const loc = lang === "es" ? "es-ES" : "en-US";
  switch (format) {
    case "pct":
      return `${(v * 100).toLocaleString(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    case "int":
      return Math.round(v).toLocaleString(loc);
    case "num":
      return v.toLocaleString(loc, { maximumFractionDigits: 1 });
    case "sec": {
      const s = Math.round(v);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      return h > 0 ? `${h} h ${m} min` : `${m} min`;
    }
    default:
      return String(v);
  }
}

function fmtDateLong(iso: string, lang: Lang) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(lang === "es" ? "es-ES" : "en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function KpiGrid({ kpis, lang }: { kpis: SnapKpi[]; lang: Lang }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((k, i) => (
        <div key={i} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{k.label}</div>
          <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color: TONE_COLOR[k.tone ?? "neutral"] }}>
            {fmtValue(k.value, k.format, lang)}
          </div>
          {k.sub ? <div className="mt-1 text-xs text-[var(--text-tertiary)]">{k.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}

function SeriesChartView({ chart, lang }: { chart: Extract<SnapChart, { type: "series" }>; lang: Lang }) {
  const fmtAxis = (v: number) => (chart.percent ? `${Math.round(v * 100)}%` : Math.round(v).toLocaleString(lang === "es" ? "es-ES" : "en-US"));
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chart.data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v) => fmtAxis(Number(v))} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => fmtValue(Number(v), chart.percent ? "pct" : "num", lang)} />
          <Legend />
          {chart.refLine != null ? (
            <ReferenceLine
              y={chart.refLine}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              label={{ value: chart.refLabel ?? "", fill: "#f43f5e", fontSize: 10, position: "insideTopRight" }}
            />
          ) : null}
          {chart.series.map((s) =>
            s.kind === "bar" ? (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[3, 3, 0, 0]} />
            ) : (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                strokeDasharray={s.dashed ? "4 3" : undefined}
                connectNulls
                type="monotone"
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function TableView({ table, lang }: { table: SnapTable; lang: Lang }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
      <div className="border-b border-[var(--border-subtle)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">{table.title}</div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            {table.columns.map((c) => (
              <th key={c.key} className={`px-3 py-2 ${c.format === "text" ? "text-left" : "text-right"}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0">
              {table.columns.map((c) => (
                <td key={c.key} className={`px-3 py-2 tabular-nums text-[var(--text-primary)] ${c.format === "text" ? "text-left" : "text-right"}`}>
                  {fmtValue(r[c.key], c.format, lang)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SnapshotView({ snapshot }: { snapshot: ReportSnapshot }) {
  const lang = snapshot.lang;
  const t = (es: string, en: string) => (lang === "es" ? es : en);
  const gauge = snapshot.charts.find((c): c is Extract<SnapChart, { type: "gauge" }> => c.type === "gauge");
  const series = snapshot.charts.filter((c): c is Extract<SnapChart, { type: "series" }> => c.type === "series");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{snapshot.reportName}</h1>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-tertiary)]">
          <span>{snapshot.orgName}</span>
          <span>{snapshot.datasetName}{snapshot.datasetIsDemo ? ` · ${t("datos demo", "demo data")}` : ""}</span>
          <span>{t("Filtros", "Filters")}: {snapshot.filtersText}</span>
          <span>{t("Generado", "Generated")} {fmtDateLong(snapshot.generatedAt, lang)}</span>
        </div>
      </div>

      <KpiGrid kpis={snapshot.kpis} lang={lang} />

      <div className="grid gap-4 lg:grid-cols-3">
        {gauge ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 lg:col-span-1">
            <div className="mb-1 text-sm font-semibold text-[var(--text-primary)]">{gauge.title}</div>
            {gauge.subtitle ? <div className="mb-2 text-xs text-[var(--text-tertiary)]">{gauge.subtitle}</div> : null}
            <GaugeChart
              value={gauge.value}
              label={gauge.label}
              sublabel={gauge.sublabel}
              size={200}
              thresholds={gauge.thresholds}
            />
          </div>
        ) : null}
        <div className={`grid gap-4 ${gauge ? "lg:col-span-2" : "lg:col-span-3"} ${series.length > 1 ? "lg:grid-cols-2" : ""}`}>
          {series.map((c, i) => (
            <div key={i} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
              <div className="text-sm font-semibold text-[var(--text-primary)]">{c.title}</div>
              {c.subtitle ? <div className="mb-2 text-xs text-[var(--text-tertiary)]">{c.subtitle}</div> : null}
              <SeriesChartView chart={c} lang={lang} />
            </div>
          ))}
        </div>
      </div>

      {snapshot.tables.map((tb, i) => (
        <TableView key={i} table={tb} lang={lang} />
      ))}

      {snapshot.note ? <p className="text-xs text-[var(--text-tertiary)]">{snapshot.note}</p> : null}
    </div>
  );
}
