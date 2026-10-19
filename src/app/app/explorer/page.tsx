"use client";
// Data Explorer: row-level view of the active interval dataset (ported from v281 DataExplorer).
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Download, Search, SlidersHorizontal, Database } from "lucide-react";
import { useWfmStore } from "@/lib/store";
import { useTx } from "@/lib/tx";
import { useI18n } from "@/lib/i18n";
import { SectionHeader, Card, Callout, Input, Select, Button } from "@/components/ui";
import {
  EXPLORER_COLUMNS,
  explorerCsv,
  filterExplorerColumns,
  filterExplorerRows,
  materializeIntervalRows,
  type ExplorerLang,
} from "@/lib/explorer";

const ROW_LIMITS = [100, 250, 500];

export default function ExplorerPage() {
  const tx = useTx();
  const { locale } = useI18n();
  const lang: ExplorerLang = locale === "en" ? "en" : "es";
  const intervals = useWfmStore((s) => s.intervals);
  const [query, setQuery] = useState("");
  const [columnQuery, setColumnQuery] = useState("");
  const [limit, setLimit] = useState(250);

  const columns = useMemo(() => filterExplorerColumns(EXPLORER_COLUMNS, columnQuery, lang), [columnQuery, lang]);
  const allRows = useMemo(() => materializeIntervalRows(intervals), [intervals]);
  const rows = useMemo(() => filterExplorerRows(allRows, query, limit), [allRows, query, limit]);
  const dateRange = useMemo(() => {
    const dates = intervals.map((r) => r.date).filter(Boolean).sort();
    return dates.length ? { from: dates[0]!, to: dates[dates.length - 1]! } : null;
  }, [intervals]);

  const exportRows = () => {
    if (!columns.length || !rows.length) return;
    const csv = explorerCsv(columns, rows, lang);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wfm-rescue-explorer-${lang === "es" ? "intervalos" : "intervals"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const title = tx("Explorador de datos", "Data Explorer");
  const description = tx(
    "Filas tal como quedaron después del mapeo, con búsqueda y exportación. Úsalo para verificar valores antes de leer los análisis.",
    "Rows as they are after mapping, with search and export. Use it to check values before reading the analysis.",
  );

  if (intervals.length === 0) {
    return (
      <div>
        <SectionHeader title={title} description={description} />
        <Card>
          <div className="p-12 text-center">
            <Database className="mx-auto h-8 w-8 text-[var(--text-quaternary)]" />
            <div className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
              {tx("No hay datos cargados", "No data loaded")}
            </div>
            <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-[var(--text-tertiary)]">
              {tx(
                "Carga los datos demo o importa un archivo. Las filas aparecerán aquí con sus valores y campos.",
                "Load the demo data or import a file. The rows will appear here with their values and fields.",
              )}
            </p>
            <Link href="/app/import" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)] hover:underline">
              {tx("Ir a Importar datos", "Go to Import Data")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/app/data-health" className="font-medium text-[var(--accent-strong)] hover:underline">{tx("Salud de datos", "Data Health")}</Link>
            <Link href="/app/diagnostics" className="font-medium text-[var(--accent-strong)] hover:underline">{tx("Diagnósticos", "Diagnostics")}</Link>
            <Link href="/app/studio" className="font-medium text-[var(--accent-strong)] hover:underline">{tx("Crear un informe", "Create a report")}</Link>
          </div>
        }
      />

      <div className="mb-4">
        <Callout variant="info">
          {tx(
            "Muestra las filas del conjunto activo. Para ver otra fuente, importa el archivo de nuevo desde Importar datos.",
            "Shows the rows of the active dataset. To view another source, import the file again from Import Data.",
          )}
        </Callout>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label={tx("Filas", "Rows")} value={intervals.length.toLocaleString(lang === "es" ? "es-ES" : "en-US")} />
        <Stat label={tx("Columnas", "Columns")} value={String(EXPLORER_COLUMNS.length)} />
        <Stat label={tx("Mostradas", "Displayed")} value={rows.length.toLocaleString(lang === "es" ? "es-ES" : "en-US")} />
        <Stat
          label={tx("Periodo", "Period")}
          value={dateRange ? (dateRange.from === dateRange.to ? dateRange.from : `${dateRange.from} → ${dateRange.to}`) : "—"}
        />
      </div>

      <Card>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <label className="relative flex-[3] min-w-0">
            <span className="sr-only">{tx("Buscar en todos los valores", "Search all values")}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tx("Buscar en cada fila y campo…", "Search every row and field…")}
              className="pl-9 w-full"
            />
          </label>
          <label className="relative min-w-0 md:w-56">
            <span className="sr-only">{tx("Filtrar columnas", "Filter columns")}</span>
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <Input
              value={columnQuery}
              onChange={(e) => setColumnQuery(e.target.value)}
              placeholder={tx("Filtrar columnas", "Filter columns")}
              className="pl-9 w-full"
            />
          </label>
          <div className="flex gap-2">
            <Select aria-label={tx("Límite de filas", "Row limit")} value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="md:w-28">
              {ROW_LIMITS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
            <Button variant="accent" onClick={exportRows} disabled={!rows.length || !columns.length}>
              <Download className="h-4 w-4" /> {tx("Exportar CSV", "Export CSV")}
            </Button>
          </div>
        </div>

        <div className="mt-4 max-h-[65vh] overflow-auto rounded-lg border border-[var(--border-subtle)]">
          <table className="min-w-max w-full text-xs">
            <thead className="sticky top-0 z-10 bg-[var(--bg-subtle)]">
              <tr>
                {columns.map((c) => (
                  <th key={c.id} scope="col" className="whitespace-nowrap border-b border-[var(--border-subtle)] px-3 py-2 text-left font-semibold text-[var(--text-tertiary)]">
                    {c.label[lang]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-subtle)]">
                  {columns.map((c) => (
                    <td key={c.id} className="whitespace-nowrap px-3 py-2 tabular-nums text-[var(--text-secondary)]">
                      {row[c.id] === "All" ? tx("Todos", "All") : (row[c.id] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="p-10 text-center text-sm text-[var(--text-tertiary)]">
              {tx("No hay filas que coincidan", "No matching rows")}
            </div>
          )}
        </div>
        {allRows.length > rows.length && (
          <p className="mt-2 text-xs text-[var(--text-tertiary)]">
            {tx(
              `Mostrando ${rows.length} de ${allRows.length} filas. Ajusta el límite o la búsqueda para ver más.`,
              `Showing ${rows.length} of ${allRows.length} rows. Adjust the limit or the search to see more.`,
            )}
          </p>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
      <div className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[var(--text-primary)] tabular-nums">{value}</div>
    </div>
  );
}
