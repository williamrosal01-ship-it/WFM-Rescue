"use client";
import { useTx } from "@/lib/tx";
import { useWfmStore, selectFilteredIntervals, selectDistinctOptions } from "@/lib/store";
import { SectionHeader, Card, Button, Chip, EmptyState, Input, Select } from "@/components/ui";
import { FilterBar } from "@/components/filters";
import { aggregateIntervals } from "@/lib/wfm";
import { fmtPct, fmtInt, fmtSec, fmtCurrency } from "@/lib/formatters";
import { Download, FileBarChart, Save, Upload, Search, Table as TableIcon, LayoutTemplate } from "lucide-react";
import { useToast } from "@/components/toast";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ExportMenu } from "@/components/export-menu";
import type { ExportValue } from "@/lib/export";

type ColumnId =
  | "key" | "interval" | "queue" | "channel" | "offered" | "answered" | "abandoned"
  | "sl" | "asa" | "aht" | "occupancy"
  | "required" | "scheduled" | "actual" | "gap"
  | "forecast" | "forecastError";

const makeAllColumns = (tx: (es: string, en: string) => string): Array<{ id: ColumnId; label: string; group: string }> => [
  { id: "interval", label: tx("Intervalo", "Interval"), group: tx("Dimensión", "Dimension") },
  { id: "queue", label: tx("Cola", "Queue"), group: tx("Dimensión", "Dimension") },
  { id: "channel", label: tx("Canal", "Channel"), group: tx("Dimensión", "Dimension") },
  { id: "offered", label: tx("Ofrecidos", "Offered"), group: tx("Volumen", "Volume") },
  { id: "answered", label: tx("Atendidas", "Answered"), group: tx("Volumen", "Volume") },
  { id: "abandoned", label: tx("Abandonadas", "Abandoned"), group: tx("Volumen", "Volume") },
  { id: "sl", label: "Service Level", group: tx("Servicio", "Service") },
  { id: "asa", label: "ASA", group: tx("Servicio", "Service") },
  { id: "aht", label: "AHT", group: tx("Servicio", "Service") },
  { id: "occupancy", label: tx("Ocupación", "Occupancy"), group: tx("Servicio", "Service") },
  { id: "required", label: tx("Req.", "Req."), group: tx("Dotación", "Staffing") },
  { id: "scheduled", label: tx("Prog.", "Sched."), group: tx("Dotación", "Staffing") },
  { id: "actual", label: tx("Pres.", "Present"), group: tx("Dotación", "Staffing") },
  { id: "gap", label: "Gap", group: tx("Dotación", "Staffing") },
  { id: "forecast", label: tx("Pronóstico", "Forecast"), group: tx("Pronóstico", "Forecast") },
  { id: "forecastError", label: tx("Error %", "Error %"), group: tx("Pronóstico", "Forecast") },
];

export default function ReportsPage() {
  const tx = useTx();
  const ALL_COLUMNS = makeAllColumns(tx);
  const { showToast } = useToast();
  const { intervals, filters } = useWfmStore();
  const [selectedCols, setSelectedCols] = useState<ColumnId[]>([
    "interval", "queue", "offered", "sl", "asa", "required", "actual", "gap",
  ]);
  const [sortBy, setSortBy] = useState<ColumnId | "">("interval");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<"interval" | "queue" | "channel" | "queue_channel">("queue_channel");

  const rows = useMemo(() => selectFilteredIntervals(intervals, filters), [intervals, filters]);
  const options = selectDistinctOptions(intervals);

  const aggregated = useMemo(() => {
    const buckets = new Map<string, { key: string; queue?: string; channel?: string; interval?: string; records: typeof rows }>();
    for (const r of rows) {
      let key: string;
      switch (groupBy) {
        case "interval": key = r.intervalLabel; break;
        case "queue": key = r.queue ?? "—"; break;
        case "channel": key = r.channel ?? tx("(sin canal)", "(no channel)"); break;
        case "queue_channel": key = `${r.queue ?? "?"} · ${r.channel ?? "?"}`; break;
      }
      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          queue: r.queue,
          channel: r.channel,
          interval: groupBy === "interval" ? r.intervalLabel : undefined,
          records: [],
        });
      }
      buckets.get(key)!.records.push(r);
    }
    return [...buckets.values()].map((b) => {
      const k = aggregateIntervals(b.records);
      const fctPairs = b.records.filter(
        (r) => typeof r.forecastVolume === "number" && typeof r.actualVolume === "number",
      );
      const fctErr = fctPairs.length > 0
        ? fctPairs.reduce<number>((acc, r) => acc + Math.abs((r.actualVolume ?? 0) - (r.forecastVolume ?? 0)), 0) /
          Math.max(1, fctPairs.reduce<number>((acc, r) => acc + (r.actualVolume ?? 0), 0))
        : null;
      return {
        key: b.key,
        queue: b.queue,
        channel: b.channel,
        interval: b.interval,
        offered: k.totalOffered,
        answered: k.totalAnswered,
        abandoned: k.totalAbandoned,
        sl: k.serviceLevel,
        asa: k.asa,
        aht: k.weightedAht,
        occupancy: k.occupancy,
        required: k.totalRequired,
        scheduled: k.totalScheduled,
        actual: k.totalActual,
        gap: k.staffingGap,
        forecast: k.totalForecastVolume,
        forecastError: fctErr,
        count: b.records.length,
      };
    });
  }, [rows, groupBy]);

  const toggleCol = (c: ColumnId) => {
    setSelectedCols((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const visible = aggregated
    .filter((r) => !search || r.key.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!sortBy) return 0;
      const av = (a as Record<string, unknown>)[sortBy];
      const bv = (b as Record<string, unknown>)[sortBy];
      const anv = typeof av === "number" ? av : String(av);
      const bnv = typeof bv === "number" ? bv : String(bv);
      if (anv < bnv) return sortDir === "asc" ? -1 : 1;
      if (anv > bnv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const exportRows = visible.map((r) =>
    Object.fromEntries(
      selectedCols.map((c) => [ALL_COLUMNS.find((x) => x.id === c)!.label, (r as Record<string, unknown>)[c] as ExportValue]),
    ),
  );

  const colsForGroup = selectedCols.filter((c) => {
    if (groupBy === "interval" && c === "interval") return true;
    if (groupBy === "queue" && c === "queue") return true;
    if (groupBy === "channel" && c === "channel") return true;
    if (groupBy === "queue_channel" && (c === "queue" || c === "channel")) return true;
    if (groupBy !== "interval" && c === "interval") return false;
    if (c !== "queue" && c !== "channel" && c !== "interval") return true;
    return false;
  });

  return (
    <div>
      <SectionHeader
        title={tx("Tabla de informes", "Report table")}
        description={tx("Construye informes ad-hoc: agrupa por dimensión, selecciona columnas, ordena, filtra y exporta a CSV. Sin construir consultas ni hojas.", "Build ad-hoc reports: group by dimension, select columns, sort, filter and export to CSV. No queries or sheets to build.")}
        actions={
          <>
            <Link href="/app/studio" className="btn btn-secondary btn-sm"><LayoutTemplate className="h-3.5 w-3.5" /> {tx("Estudio con gráficos", "Report Studio with charts")}</Link>
            <ExportMenu
              name="report-table"
              title={tx("Tabla de informes", "Report table")}
              subtitle={tx(`${visible.length} filas · ${selectedCols.length} columnas · filtros globales aplicados`, `${visible.length} rows · ${selectedCols.length} columns · global filters applied`)}
              sections={[{ name: tx("Informe", "Report"), title: tx("Tabla de informes", "Report table"), rows: exportRows }]}
              disabled={visible.length === 0}
            />
          </>
        }
      />
      <FilterBar />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileBarChart className="h-5 w-5" />}
            title={tx("No hay datos para reportar", "No data to report on")}
            description={tx("Importa un archivo o carga datos demo para comenzar a construir informes.", "Import a file or load the demo data to start building reports.")}
            action={<Link href="/app/import"><Button variant="accent">{tx("Importar datos", "Import data")}</Button></Link>}
          />
        </Card>
      ) : (
        <div className="grid lg:grid-cols-[260px_1fr] gap-4">
          <div className="space-y-4">
            <Card title={tx("Agrupar por", "Group by")}>
              <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}>
                <option value="queue_channel">{tx("Cola + Canal", "Queue + Channel")}</option>
                <option value="queue">{tx("Solo Cola", "Queue only")}</option>
                <option value="channel">{tx("Solo Canal", "Channel only")}</option>
                <option value="interval">{tx("Intervalo", "Interval")}</option>
              </Select>
            </Card>
            <Card title={tx("Columnas", "Columns")}>
              <div className="space-y-3">
                {Array.from(new Set(ALL_COLUMNS.map((c) => c.group))).map((g) => (
                  <div key={g}>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">{g}</div>
                    <div className="space-y-1">
                      {ALL_COLUMNS.filter((c) => c.group === g).map((c) => {
                        const isDim = c.id === "queue" || c.id === "channel" || c.id === "interval";
                        if (isDim) {
                          if (groupBy === "queue_channel" && (c.id === "queue" || c.id === "channel")) { /* always shown */ }
                          else if (groupBy === c.id) { /* always */ }
                          else return null;
                        }
                        const active = selectedCols.includes(c.id);
                        return (
                          <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer hover:text-[var(--text-primary)] text-[var(--text-secondary)]">
                            <input type="checkbox" checked={active} onChange={() => toggleCol(c.id)} className="accent-[var(--accent)]" />
                            {c.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card
            title={`${tx("Informe", "Report")} (${visible.length} ${tx("filas", "rows")})`}
            subtitle={tx("Haz clic en los encabezados para ordenar.", "Click the column headers to sort.")}
            action={
              <div className="relative w-60">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-quaternary)]" />
                <Input placeholder={tx("Buscar por clave…", "Search by key…")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 !py-1.5 text-xs" />
              </div>
            }
          >
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                    {colsForGroup.map((c) => {
                      const label = ALL_COLUMNS.find((x) => x.id === c)!.label;
                      const active = sortBy === c;
                      return (
                        <th
                          key={c}
                          className={`px-3 py-2 font-semibold ${c === "key" || c === "interval" || c === "queue" || c === "channel" ? "text-left" : "text-right"} cursor-pointer select-none hover:text-[var(--text-primary)]`}
                          onClick={() => {
                            if (sortBy === c) setSortDir(sortDir === "asc" ? "desc" : "asc");
                            else { setSortBy(c); setSortDir("desc"); }
                          }}
                        >
                          <span className="inline-flex items-center gap-1">
                            {label}
                            {active && <span className="text-[var(--accent-strong)]">{sortDir === "asc" ? "↑" : "↓"}</span>}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.key} className="tbl-row tbl-row-stripe border-b border-[var(--border-subtle)] last:border-0">
                      {colsForGroup.map((c) => {
                        const v = (r as Record<string, unknown>)[c];
                        const isNum = typeof v === "number";
                        const isLeft = c === "key" || c === "interval" || c === "queue" || c === "channel";
                        let rendered: React.ReactNode = v == null ? "—" : String(v);
                        if (c === "sl" || c === "occupancy" || c === "forecastError") {
                          rendered = isNum ? fmtPct(v as number) : "—";
                        } else if (c === "asa" || c === "aht") {
                          rendered = isNum ? fmtSec(v as number) : "—";
                        } else if (isNum) {
                          rendered = fmtInt(v as number);
                        } else if (c === "key") {
                          rendered = <span className="font-medium">{String(v)}</span>;
                        }
                        return (
                          <td key={c} className={`px-3 py-1.5 tabular-nums ${isLeft ? "text-left" : "text-right"}`}>
                            {rendered}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr><td colSpan={colsForGroup.length} className="px-3 py-8 text-center text-[var(--text-tertiary)]">{tx("Sin resultados.", "No results.")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
