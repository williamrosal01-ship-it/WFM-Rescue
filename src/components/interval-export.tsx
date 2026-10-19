"use client";

import { useMemo } from "react";
import { ExportMenu } from "@/components/export-menu";
import type { IntervalRecord } from "@/lib/types";
import { useTx } from "@/lib/tx";
import { useI18n } from "@/lib/i18n";
import type { ExportRow, ExportValue } from "@/lib/export";
import { buildPreset } from "@/lib/report-presets";

// Human headers for the interval fields; anything else keeps its raw key.
const FIELD_LABEL: Record<string, [string, string]> = {
  date: ["Fecha", "Date"],
  intervalLabel: ["Intervalo", "Interval"],
  queue: ["Cola", "Queue"],
  skill: ["Skill", "Skill"],
  channel: ["Canal", "Channel"],
  occupancy: ["Ocupación (0-1)", "Occupancy (0-1)"],
  sourceType: ["Tipo de fuente", "Source type"],
  site: ["Sitio", "Site"],
  forecastVolume: ["Volumen pronosticado", "Forecast volume"],
  forecastAht: ["AHT pronosticado (seg)", "Forecast AHT (sec)"],
  requiredStaff: ["Personal requerido", "Required staff"],
  scheduledStaff: ["Personal programado", "Scheduled staff"],
  actualStaff: ["Personal presente", "Present staff"],
  availableStaff: ["Personal disponible", "Available staff"],
  serviceLevelTarget: ["Objetivo SL (0-1)", "SL target (0-1)"],
  serviceLevelThreshold: ["Umbral SL (seg)", "SL threshold (sec)"],
  actualVolume: ["Volumen real", "Actual volume"],
  actualAht: ["AHT real (seg)", "Actual AHT (sec)"],
  offered: ["Ofrecidas", "Offered"],
  answered: ["Atendidas", "Answered"],
  abandoned: ["Abandonadas", "Abandoned"],
  serviceLevel: ["Nivel de servicio (0-1)", "Service level (0-1)"],
  asa: ["ASA (seg)", "ASA (sec)"],
  avgSpeedAnswer: ["Velocidad de respuesta (seg)", "Speed of answer (sec)"],
  handleTime: ["Tiempo de manejo (seg)", "Handle time (sec)"],
  talkTime: ["Tiempo de conversación (seg)", "Talk time (sec)"],
};

const PAGE_TITLE: Record<string, [string, string]> = {
  dashboard: ["Panel de operaciones", "Operations dashboard"],
  intraday: ["Intradía", "Intraday"],
  "service-level": ["Nivel de servicio", "Service level"],
  staffing: ["Personal", "Staffing"],
  adherence: ["Adherencia y AUX", "Adherence & AUX"],
  attendance: ["Asistencia", "Attendance"],
  capacity: ["Capacidad", "Capacity"],
  forecast: ["Pronóstico vs real", "Forecast vs actual"],
  occupancy: ["Ocupación", "Occupancy"],
  nlh: ["NLH", "NLH"],
  diagnostics: ["Diagnósticos", "Diagnostics"],
  "data-health": ["Salud de datos", "Data health"],
};

function cell(v: unknown): ExportValue {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())} ${p(v.getHours())}:${p(v.getMinutes())}`;
  }
  if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") return v;
  return JSON.stringify(v);
}

/** Flattens interval records into export rows with localized headers (id omitted). */
export function intervalExportRows(rows: IntervalRecord[], locale: "es" | "en"): ExportRow[] {
  const idx = locale === "es" ? 0 : 1;
  return rows.map((r) => {
    const out: ExportRow = {};
    for (const [k, v] of Object.entries(r)) {
      if (k === "id" || k === "intervalStart" || k === "intervalEnd") continue;
      const header = FIELD_LABEL[k]?.[idx] ?? k;
      out[header] = cell(v);
    }
    return out;
  });
}

/** CSV / XLSX / PDF of the interval data behind a page, after the global filters. */
export function IntervalExport({ rows, name }: { rows: IntervalRecord[]; name: string }) {
  const tx = useTx();
  const title = PAGE_TITLE[name] ? tx(PAGE_TITLE[name][0], PAGE_TITLE[name][1]) : name;
  const { locale } = useI18n();
  const exportRows = useMemo(() => intervalExportRows(rows, locale), [rows, locale]);
  const preset = useMemo(() => buildPreset(name, rows, locale), [name, rows, locale]);
  return (
    <ExportMenu
      name={`wfm-${name}`}
      title={title}
      subtitle={tx(`${rows.length.toLocaleString("es-ES")} intervalos con los filtros globales aplicados`, `${rows.length.toLocaleString("en-US")} intervals with the global filters applied`)}
      sections={[{ name: tx("Intervalos", "Intervals"), title: tx("Datos del periodo filtrado", "Filtered period data"), rows: exportRows }]}
      disabled={rows.length === 0}
      pdf={preset ? { kpis: preset.kpis, charts: preset.charts, tableTitle: preset.tableTitle, table: preset.table } : undefined}
    />
  );
}
