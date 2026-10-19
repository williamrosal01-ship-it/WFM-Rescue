"use client";
import { IntervalExport } from "@/components/interval-export";
import { useTx } from "@/lib/tx";
import { useWfmStore, selectFilteredIntervals } from "@/lib/store";
import { SectionHeader, Card, Button, Chip, HealthScoreRing, Callout, EmptyState } from "@/components/ui";
import { FilterBar } from "@/components/filters";
import { analyzeDataHealth } from "@/lib/data-health";
import { CheckCircle2, AlertTriangle, XCircle, Info, RefreshCw, Database, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { CANONICAL_FIELDS } from "@/lib/parsers";
import { tl } from "@/lib/texts-en";
import { useI18n } from "@/lib/i18n";

const SEV_META = {
  error: { icon: XCircle, label: "Errores", cls: "danger" },
  warning: { icon: AlertTriangle, label: "Advertencias", cls: "warning" },
  info: { icon: Info, label: "Info", cls: "info" },
} as const;

export default function DataHealthPage() {
  const tx = useTx();
  const { locale } = useI18n();
  const fieldName = (k: string) => { const f = CANONICAL_FIELDS.find((x) => x.key === k); return f ? tl(f.label, locale) : k; };
  const { intervals, filters, dataHealth, setDataHealth } = useWfmStore();
  const rows = useMemo(() => selectFilteredIntervals(intervals, filters), [intervals, filters]);

  // Re-run health on current filtered data
  const health = useMemo(() => dataHealth && rows.length > 0 ? dataHealth : analyzeDataHealth(rows), [rows, dataHealth]);

  const counts = {
    error: health.issues.filter((i) => i.severity === "error").length,
    warning: health.issues.filter((i) => i.severity === "warning").length,
    info: health.issues.filter((i) => i.severity === "info").length,
  };

  const rescan = () => setDataHealth(analyzeDataHealth(rows));

  return (
    <div>
      <SectionHeader
        title={tx("Salud de datos", "Data health")}
        description={tx("Auditoría automática de los datos cargados: nulos, duplicados, unidades, intervalos faltantes y más. Solo puedes confiar en los KPIs si los datos pasan este control.", "Automatic audit of the loaded data: nulls, duplicates, units, missing intervals and more. You can only trust the KPIs if the data passes this check.")}
        actions={<div className="flex flex-wrap items-center justify-end gap-2"><IntervalExport rows={rows} name="data-health" />{
          <>
            <Button variant="secondary" size="sm" onClick={rescan}><RefreshCw className="h-3.5 w-3.5" /> {tx("Re-escanear", "Rescan")}</Button>
            <Link href="/app/import"><Button variant="accent" size="sm"><Upload className="h-3.5 w-3.5" /> {tx("Importar otro", "Import another")}</Button></Link>
          </>
        }</div>}
      />

      <FilterBar />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Database className="h-5 w-5" />}
            title={tx("No hay datos cargados", "No data loaded")}
            description={tx("Importa un archivo o carga datos demo para ver la auditoría de calidad.", "Import a file or load the demo data to see the quality audit.")}
            action={<Link href="/app/import"><Button variant="accent">{tx("Importar datos", "Import data")}</Button></Link>}
          />
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-4 gap-3 mb-5">
            <Card padded={false} className="p-5">
              <div className="flex items-center gap-4">
                <HealthScoreRing score={health.score} size={64} />
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">{tx("Puntaje total", "Total score")}</div>
                  <div className="text-sm font-medium text-[var(--text-primary)] mt-0.5">
                    {health.score >= 90 ? tx("Excelente", "Excellent") : health.score >= 75 ? tx("Bueno", "Good") : health.score >= 60 ? tx("Mejorable", "Fair") : tx("Crítico", "Critical")}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{health.validRows} / {health.totalRows} {tx("filas válidas", "valid rows")}</div>
                </div>
              </div>
            </Card>
            <Card padded={false} className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[var(--danger-bg)] flex items-center justify-center text-[var(--danger-text)]">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[var(--danger-solid)] tabular-nums">{counts.error}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{tx("Errores (bloquean uso)", "Errors (block use)")}</div>
                </div>
              </div>
            </Card>
            <Card padded={false} className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[var(--warning-bg)] flex items-center justify-center text-[var(--warning-text)]">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[var(--warning-solid)] tabular-nums">{counts.warning}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{tx("Advertencias", "Warnings")}</div>
                </div>
              </div>
            </Card>
            <Card padded={false} className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[var(--info-bg)] flex items-center justify-center text-[var(--info-text)]">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[var(--info-solid)] tabular-nums">{counts.info}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{tx("Informativos", "Info")}</div>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card title={tx("Hallazgos", "Findings")} subtitle={tx("Priorizados por severidad. Cada hallazgo incluye sugerencia de corrección.", "Sorted by severity. Each finding includes a suggested fix.")}>
                {health.issues.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--success-text)] py-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {tx("No se detectaron problemas de calidad. Los datos están listos para análisis.", "No quality issues were detected. The data is ready for analysis.")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {health.issues.map((issue, i) => {
                      const meta = SEV_META[issue.severity];
                      const Icon = meta.icon;
                      return (
                        <div key={`${issue.code}-${i}`} className="rounded-lg border border-[var(--border-subtle)] p-3.5">
                          <div className="flex items-start gap-3">
                            <div className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center chip-${meta.cls}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm text-[var(--text-primary)]">{issue.message[locale]}</span>
                                    <Chip variant={meta.cls as never}>{issue.code}</Chip>
                                    {issue.rowCount != null && <Chip variant="neutral">{issue.rowCount} filas</Chip>}
                                  </div>
                                  {issue.field && (
                                    <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{tx("Campo: ", "Field: ")}<code className="font-mono text-[var(--text-secondary)]">{issue.field}</code></div>
                                  )}
                                </div>
                              </div>
                              <div className="mt-2 text-sm text-[var(--text-secondary)]">
                                <span className="font-medium text-[var(--text-primary)]">{tx("Sugerencia: ", "Suggestion: ")}</span>
                                {issue.suggestion[locale]}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-4">
              <Card title={tx("Cobertura", "Coverage")}>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-[var(--text-tertiary)]">{tx("Intervalos detectados", "Intervals detected")}</dt><dd className="font-semibold tabular-nums">{health.intervalCount}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--text-tertiary)]">{tx("Rango", "Range")}</dt><dd className="font-semibold tabular-nums text-xs">{health.dateRange ? `${health.dateRange.start.toLocaleString()} — ${health.dateRange.end.toLocaleString()}` : "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--text-tertiary)]">{tx("Filas totales", "Total rows")}</dt><dd className="font-semibold tabular-nums">{health.totalRows}</dd></div>
                </dl>
              </Card>

              <Card title={tx("Campos presentes", "Fields present")}>
                {health.fieldsPresent.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {health.fieldsPresent.map((f) => (
                      <Chip key={f} variant="success" className="!text-[10px]">{fieldName(f)}</Chip>
                    ))}
                  </div>
                ) : <div className="text-xs text-[var(--text-tertiary)] italic">{tx("No se detectaron campos canónicos.", "No canonical fields detected.")}</div>}
              </Card>

              {health.fieldsMissing.length > 0 && (
                <Card title={tx("Campos ausentes (opcionales)", "Missing fields (optional)")}>
                  <div className="flex flex-wrap gap-1">
                    {health.fieldsMissing.map((f) => (
                      <Chip key={f} variant="danger" className="!text-[10px]">{fieldName(f)}</Chip>
                    ))}
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-3">
                    {tx("Estos campos no impiden el análisis básico, pero limitan los diagnósticos disponibles.", "These fields do not block basic analysis, but they limit the available diagnostics.")}
                  </p>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
