// ============================================================================
// Data Health engine
// Produces a 0-100 score plus actionable findings.
// Designed to NOT block the user on errors — partial data is usable, but the
// score and warnings tell the analyst which metrics to trust.
// ============================================================================
import type { DataHealthIssue, DataHealthReport, IntervalRecord, Bilingual } from "./types";

// Messages are bilingual: the page shows the one for the active locale.
const B = (es: string, en: string): Bilingual => ({ es, en });

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function analyzeDataHealth(rows: IntervalRecord[]): DataHealthReport {
  const issues: DataHealthIssue[] = [];
  if (rows.length === 0) {
    return {
      score: 0,
      totalRows: 0,
      validRows: 0,
      issues: [
        {
          severity: "error",
          code: "EMPTY_DATA",
          message: B("No hay filas válidas después del mapeo.", "No valid rows after mapping."),
          suggestion: B("Verifica el delimitador, la hoja seleccionada o el mapeo de columnas.", "Check the delimiter, the selected sheet or the column mapping."),
        },
      ],
      fieldsPresent: [],
      fieldsMissing: [],
      dateRange: null,
      intervalCount: 0,
    };
  }

  const fields: Array<keyof IntervalRecord> = [
    "intervalStart",
    "queue",
    "channel",
    "forecastVolume",
    "actualVolume",
    "offered",
    "answered",
    "abandoned",
    "actualAht",
    "forecastAht",
    "serviceLevel",
    "asa",
    "occupancy",
    "scheduledStaff",
    "actualStaff",
    "requiredStaff",
  ];

  const presentCounts: Record<string, number> = {};
  for (const f of fields) {
    presentCounts[f] = rows.filter((r) => r[f as keyof IntervalRecord] != null).length;
  }
  const fieldsPresent = fields.filter((f) => presentCounts[f] > 0).map((f) => String(f));
  const fieldsMissing = fields.filter((f) => presentCounts[f] === 0).map((f) => String(f));

  // --- Critical: intervalStart missing ---
  if (presentCounts.intervalStart === 0) {
    issues.push({
      severity: "error",
      code: "MISSING_INTERVAL",
      field: "intervalStart",
      message: B("No se detectó la columna de inicio de intervalo o fecha/hora.", "No interval start or date/time column was detected."),
      suggestion: B("Mapea la columna que contiene fecha y hora de inicio de cada intervalo.", "Map the column that holds the start date and time of each interval."),
      rowCount: rows.length,
    });
  }

  // --- Required fields for core analysis ---
  if (presentCounts.offered === 0 && presentCounts.actualVolume === 0) {
    issues.push({
      severity: "error",
      code: "NO_VOLUME",
      message: B("No hay datos de volumen (llamadas ofrecidas o volumen real).", "No volume data (offered calls or actual volume)."),
      suggestion: B("Mapea la columna de volumen (Offered, Calls, Contacts, Atendidas).", "Map the volume column (Offered, Calls, Contacts, Answered)."),
    });
  }

  if (presentCounts.requiredStaff === 0) {
    issues.push({
      severity: "warning",
      code: "NO_REQUIRED_STAFF",
      message: B("No hay datos de personal requerido. Podemos calcularlo con Erlang-C si proporcionas volumen, AHT y objetivo de SL.", "No required staffing data. We can calculate it with Erlang-C if you provide volume, AHT and an SL target."),
      suggestion: B("Añade un objetivo de SL/AHT o sube el archivo de requerimiento.", "Add an SL/AHT target or upload the requirements file."),
    });
  }

  // --- Null/blank checks ---
  for (const f of ["actualAht", "serviceLevel", "scheduledStaff"] as const) {
    if (presentCounts[f] > 0 && presentCounts[f] < rows.length) {
      issues.push({
        severity: "warning",
        code: `PARTIAL_${f.toUpperCase()}`,
        field: f,
        message: B(`La columna ${f} tiene valores nulos en ${rows.length - presentCounts[f]} de ${rows.length} filas.`, `Column ${f} has null values in ${rows.length - presentCounts[f]} of ${rows.length} rows.`),
        suggestion: B("Estos intervalos se excluirán de los promedios o agregaciones.", "These intervals will be excluded from averages or aggregations."),
        rowCount: rows.length - presentCounts[f],
      });
    }
  }

  // --- Value validity ---
  const negVolRows = rows.filter((r) => isNum(r.actualVolume) && r.actualVolume < 0).length;
  if (negVolRows > 0) {
    issues.push({
      severity: "error",
      code: "NEGATIVE_VOLUME",
      message: B(`${negVolRows} filas tienen volumen negativo.`, `${negVolRows} rows have negative volume.`),
      suggestion: B("Revisa si el archivo incluye restas o ajustes; reemplaza por valor absoluto o separa los ajustes.", "Check whether the file includes subtractions or adjustments; replace with absolute values or separate the adjustments."),
      rowCount: negVolRows,
    });
  }

  const badSl = rows.filter((r) => isNum(r.serviceLevel) && (r.serviceLevel < 0 || r.serviceLevel > 1)).length;
  if (badSl > 0) {
    issues.push({
      severity: "warning",
      code: "SL_OUT_OF_RANGE",
      message: B(`${badSl} filas tienen Service Level fuera del rango 0–1. ¿Se está usando porcentaje (0–100)?`, `${badSl} rows have Service Level outside the 0–1 range. Are you using a percentage (0–100)?`),
      suggestion: B("WFM Rescue normaliza automáticamente valores >1 dividiendo entre 100.", "WFM Rescue automatically normalizes values above 1 by dividing them by 100."),
      rowCount: badSl,
    });
  }

  // Normalize SL > 1 on the fly
  for (const r of rows) {
    if (isNum(r.serviceLevel) && r.serviceLevel > 1) {
      r.serviceLevel = r.serviceLevel / 100;
    }
    if (isNum(r.occupancy) && r.occupancy > 1) {
      r.occupancy = r.occupancy / 100;
    }
  }

  const badOcc = rows.filter((r) => isNum(r.occupancy) && (r.occupancy < 0 || r.occupancy > 1.5)).length;
  if (badOcc > 0) {
    issues.push({
      severity: "warning",
      code: "OCC_OUT_OF_RANGE",
      message: B(`${badOcc} filas tienen Occupancy anómalo (<0 o >150%).`, `${badOcc} rows have anomalous Occupancy (<0 or >150%).`),
      suggestion: B("Verifica si el tiempo logueado y el tiempo en llamada están en la misma unidad.", "Check whether logged-in time and talk time use the same unit."),
      rowCount: badOcc,
    });
  }

  // --- Suspicious AHT ---
  const lowAht = rows.filter((r) => isNum(r.actualAht) && r.actualAht > 0 && r.actualAht < 20).length;
  if (lowAht > 0) {
    issues.push({
      severity: "warning",
      code: "AHT_TOO_LOW",
      message: B(`${lowAht} filas tienen AHT < 20s. ¿Está en minutos en vez de segundos?`, `${lowAht} rows have AHT < 20s. Is it in minutes instead of seconds?`),
      suggestion: B("Verifica la unidad del campo; multiplica por 60 si está en minutos.", "Check the field unit; multiply by 60 if it is in minutes."),
      rowCount: lowAht,
    });
  }

  // --- Duplicate intervals ---
  const keys = new Map<string, number>();
  for (const r of rows) {
    const k = `${r.intervalStart?.toISOString?.() ?? "?"}|${r.queue ?? ""}|${r.channel ?? ""}`;
    keys.set(k, (keys.get(k) ?? 0) + 1);
  }
  const dupKeys = [...keys.entries()].filter(([, c]) => c > 1);
  if (dupKeys.length > 0) {
    issues.push({
      severity: "warning",
      code: "DUPLICATE_INTERVALS",
      message: B(`${dupKeys.length} combinaciones intervalo/cola/canal aparecen más de una vez. Se agregan automáticamente.`, `${dupKeys.length} interval/queue/channel combinations appear more than once. They are aggregated automatically.`),
      suggestion: B("Si cada fila es un segmento diferente (ej. skill), verifica que la dimensión esté incluida.", "If each row is a different segment (e.g. skill), check that the dimension is included."),
    });
  }

  // --- Gaps in interval coverage ---
  const sortedDates = rows
    .map((r) => r.intervalStart)
    .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  const dateRange = sortedDates.length > 0 ? { start: sortedDates[0]!, end: sortedDates[sortedDates.length - 1]! } : null;
  const expectedIntervalMinutes = guessIntervalMinutes(sortedDates);
  let missingCount = 0;
  if (dateRange && expectedIntervalMinutes) {
    for (let t = dateRange.start.getTime(); t < dateRange.end.getTime(); t += expectedIntervalMinutes * 60 * 1000) {
      const found = sortedDates.some((d) => Math.abs(d.getTime() - t) < 60 * 1000);
      if (!found) missingCount += 1;
    }
  }
  if (missingCount > 0) {
    issues.push({
      severity: "info",
      code: "INTERVAL_GAPS",
      message: B(`Se detectaron ${missingCount} intervalos faltantes dentro del rango de fechas.`, `${missingCount} missing intervals were detected within the date range.`),
      suggestion: B("Verifica si el proveedor omitió intervalos sin datos o si el horario operativo no es continuo.", "Check whether the provider left out intervals with no data or whether the operating schedule is not continuous."),
    });
  }

  // --- Scoring ---
  // Each error = -20, warning = -8, info = -2. Floored at 0, capped at 100.
  let score = 100;
  for (const i of issues) {
    if (i.severity === "error") score -= 20;
    else if (i.severity === "warning") score -= 8;
    else score -= 2;
  }
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    totalRows: rows.length,
    validRows: rows.length - negVolRows,
    issues,
    fieldsPresent,
    fieldsMissing,
    dateRange,
    intervalCount: new Set(sortedDates.map((d) => d.getTime())).size,
  };
}

function guessIntervalMinutes(dates: Date[]): number | null {
  if (dates.length < 2) return null;
  const diffs: Record<number, number> = {};
  for (let i = 1; i < dates.length; i += 1) {
    const diff = Math.round((dates[i]!.getTime() - dates[i - 1]!.getTime()) / 60000);
    if (diff > 0 && diff <= 60) {
      diffs[diff] = (diffs[diff] ?? 0) + 1;
    }
  }
  const entries = Object.entries(diffs).sort((a, b) => b[1] - a[1]);
  return entries.length > 0 ? parseInt(entries[0]![0], 10) : null;
}

/**
 * Merge duplicate rows by (intervalStart, queue, channel), summing numeric volume/staff
 * and averaging weighted rates where possible.
 */
export function consolidateRows(rows: IntervalRecord[]): IntervalRecord[] {
  const buckets = new Map<string, IntervalRecord[]>();
  for (const r of rows) {
    const k = `${r.intervalStart?.toISOString?.() ?? "?"}__${r.queue ?? ""}__${r.channel ?? ""}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(r);
  }
  const out: IntervalRecord[] = [];
  for (const [, group] of buckets) {
    if (group.length === 1) {
      out.push(group[0]!);
      continue;
    }
    const base = { ...group[0]! } as Record<string, unknown>;
    const sumFields: Array<keyof IntervalRecord> = [
      "forecastVolume", "actualVolume", "offered", "answered", "abandoned",
      "scheduledStaff", "actualStaff", "requiredStaff", "availableStaff",
      "productiveAgents", "nonProductiveAgents", "talkTime", "holdTime", "acwTime",
    ];
    for (const f of sumFields) {
      const vals = group.map((g) => g[f] as number | undefined).filter((v): v is number => typeof v === "number");
      if (vals.length > 0) (base as Record<string, unknown>)[f] = vals.reduce((a, b) => a + b, 0);
    }
    // Weighted AHT and SL by actual volume / offered
    const volumeWeights = group.map((g) => g.actualVolume ?? g.offered ?? 0);
    const totalWeight = volumeWeights.reduce((a, b) => a + b, 0);
    if (totalWeight > 0) {
      const ahts = group.map((g) => g.actualAht ?? g.forecastAht ?? null);
      const weightedAht = ahts.reduce<number>((acc, v, i) => acc + (v ?? 0) * (volumeWeights[i] ?? 0), 0) / totalWeight;
      (base as Record<string, unknown>).actualAht = weightedAht;
      const sls = group.map((g) => g.serviceLevel);
      const weightedSl = sls.reduce<number>((acc, v, i) => acc + (typeof v === "number" ? v * (volumeWeights[i] ?? 0) : 0), 0) / totalWeight;
      (base as Record<string, unknown>).serviceLevel = weightedSl;
    }
    out.push(base as unknown as IntervalRecord);
  }
  return out.sort((a, b) => {
    const at = a.intervalStart instanceof Date ? a.intervalStart.getTime() : 0;
    const bt = b.intervalStart instanceof Date ? b.intervalStart.getTime() : 0;
    return at - bt;
  });
}
