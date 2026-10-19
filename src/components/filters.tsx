"use client";
import { datasetLabel } from "@/lib/dataset-label";
import { useTx } from "@/lib/tx";
import { useWfmStore, selectDistinctOptions, selectFilteredIntervals } from "@/lib/store";
import { Select, Chip } from "./ui";
import { Filter, X } from "lucide-react";
import { format } from "date-fns";
import clsx from "clsx";
import { aggregateIntervals } from "@/lib/wfm";
import { fmtPct } from "@/lib/formatters";

export function FilterBar() {
  const tx = useTx();
  const { intervals, filters, setFilters, datasetIsDemo, datasetName, clearDataset, loadDemoData } = useWfmStore();
  const options = selectDistinctOptions(intervals);

  const toggleFilter = (key: "queues" | "channels" | "sites" | "skills", value: string) => {
    const current = filters[key];
    setFilters({
      [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    } as never);
  };

  const allFiltered = selectFilteredIntervals(intervals, filters);
  const kpis = aggregateIntervals(allFiltered);

  const activeFilters = [
    ...filters.queues.map((v) => ({ key: "queues" as const, value: v })),
    ...filters.channels.map((v) => ({ key: "channels" as const, value: v })),
    ...filters.sites.map((v) => ({ key: "sites" as const, value: v })),
  ];

  return (
    <div className="space-y-3 mb-5 sticky top-14 z-20 bg-[var(--bg-canvas)]/80 backdrop-blur-sm -mx-4 lg:-mx-6 px-4 lg:px-6 py-2 -mt-6 mb-4 border-b border-[var(--border-subtle)] lg:border-0 lg:static lg:bg-transparent lg:backdrop-blur-none lg:p-0 lg:mx-0 lg:mt-0">
      <div className="flex flex-wrap items-center gap-2 surface p-3">
        <Filter className="h-4 w-4 text-[var(--text-tertiary)] shrink-0" />
        <Select
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (v && !filters.queues.includes(v)) setFilters({ queues: [...filters.queues, v] });
          }}
          className="!w-auto min-w-[140px] !py-1.5 text-xs"
        >
          <option value="">{tx("Cola", "Queue")}</option>
          {options.queues.map((q) => (
            <option key={q} value={q}>{q === "All" ? tx("Todos", "All") : q}</option>
          ))}
        </Select>
        <Select
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (v && !filters.channels.includes(v)) setFilters({ channels: [...filters.channels, v] });
          }}
          className="!w-auto min-w-[120px] !py-1.5 text-xs"
        >
          <option value="">{tx("Canal", "Channel")}</option>
          {options.channels.map((c) => (
            <option key={c} value={c}>{c === "All" ? tx("Todos", "All") : c}</option>
          ))}
        </Select>
        <Select
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (v && !filters.sites.includes(v)) setFilters({ sites: [...filters.sites, v] });
          }}
          className="!w-auto min-w-[120px] !py-1.5 text-xs"
        >
          <option value="">{tx("Sitio", "Site")}</option>
          {options.sites.map((s) => (
            <option key={s} value={s}>{s === "All" ? tx("Todos", "All") : s}</option>
          ))}
        </Select>
        <div className="h-6 w-px bg-[var(--border-subtle)] mx-1" />
        <div className="text-xs text-[var(--text-tertiary)]">
          {datasetIsDemo && <Chip variant="warning" className="mr-2">{tx("DATOS DEMO", "DEMO DATA")}</Chip>}
          <span className="font-medium text-[var(--text-secondary)]">{datasetName ? datasetLabel(datasetName, tx) : tx("Sin conjunto de datos", "No dataset")}</span>
        </div>
        <div className="flex-1" />
        {activeFilters.length > 0 && (
          <button
            onClick={() => setFilters({ queues: [], channels: [], sites: [], skills: [], teams: [] })}
            className="btn btn-ghost !text-xs !px-2 !py-1"
          >
            <X className="h-3 w-3" /> Limpiar filtros
          </button>
        )}
        <button onClick={loadDemoData} className="btn btn-ghost !text-xs !px-2 !py-1" title={tx("Cargar datos demo", "Load demo data")}>
          Demo
        </button>
        <button onClick={clearDataset} className="btn btn-ghost !text-xs !px-2 !py-1 text-[var(--danger-text)]">
          {tx("Limpiar", "Clear")}
        </button>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeFilters.map((f) => (
            <button
              key={`${f.key}-${f.value}`}
              onClick={() => toggleFilter(f.key, f.value)}
              className="chip chip-neutral hover:bg-[var(--bg-active)] cursor-pointer"
            >
              {f.value} <X className="h-3 w-3 ml-0.5" />
            </button>
          ))}
        </div>
      )}

      <div className={clsx("text-xs text-[var(--text-tertiary)] flex flex-wrap gap-x-4 gap-y-1")}>
        <span>{allFiltered.length} {tx("intervalos visibles", "visible intervals")}</span>
        <span>{tx("Completitud: ", "Completeness: ")}<strong className="text-[var(--text-primary)]">{fmtPct(kpis.dataCompleteness, 0)}</strong></span>
        <span>{tx("Rango", "Range")}: {allFiltered[0]?.intervalStart ? format(allFiltered[0].intervalStart, "dd MMM HH:mm") : "—"} — {allFiltered.at(-1)?.intervalStart ? format(allFiltered.at(-1)!.intervalStart!, "dd MMM HH:mm") : "—"}</span>
      </div>
    </div>
  );
}
