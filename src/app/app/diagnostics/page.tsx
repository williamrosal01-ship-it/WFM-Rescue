"use client";
import { IntervalExport } from "@/components/interval-export";
import { useTx } from "@/lib/tx";
import { useI18n } from "@/lib/i18n";
import { useWfmStore, selectFilteredIntervals } from "@/lib/store";
import { SectionHeader, Card, Button, Chip, SeverityBadge, EmptyState, Callout } from "@/components/ui";
import { FilterBar } from "@/components/filters";
import { runDiagnostics, DEFAULT_LOADED_COST } from "@/lib/diagnostics";
import { loadLoadedCost, saveLoadedCost } from "@/lib/cost-settings";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Play,
  RefreshCw,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/toast";
import { useEffect, useMemo, useState } from "react";
import { fmtCurrency, fmtInt, fmtPct, fmtSec } from "@/lib/formatters";

export default function DiagnosticsPage() {
  const tx = useTx();
  const { showToast } = useToast();
  const { intervals, filters, diagnostics, setDiagnostics, agentIntervals } = useWfmStore();
  const [loadedCost, setLoadedCostState] = useState(DEFAULT_LOADED_COST);
  useEffect(() => { setLoadedCostState(loadLoadedCost()); }, []);
  const setLoadedCost = (v: number) => { setLoadedCostState(v); saveLoadedCost(v); };
  const rows = useMemo(() => selectFilteredIntervals(intervals, filters), [intervals, filters]);

  const { locale } = useI18n();
  // Computed in the active locale so findings never mix languages.
  const findings = useMemo(
    () => runDiagnostics({ intervals: rows, agentIntervals, loadedHourlyCost: loadedCost, locale }),
    [rows, agentIntervals, loadedCost, locale]
  );

  const rerun = () => setDiagnostics(runDiagnostics({ intervals: rows, agentIntervals, loadedHourlyCost: loadedCost, locale }));

  const byCategory: Record<string, typeof findings> = {};
  for (const f of findings) {
    byCategory[f.category] = byCategory[f.category] ?? [];
    byCategory[f.category].push(f);
  }

  const totalFinancial = findings
    .filter((f) => f.financialImpact?.value != null)
    .reduce<number>((acc, f) => acc + (f.financialImpact?.value ?? 0), 0);

  return (
    <div>
      <SectionHeader
        title={tx("Diagnóstico operativo", "Operational diagnostics")}
        description={tx("No mostramos solo métricas. Identificamos problemas concretos, cuantificamos el impacto y recomendamos acciones priorizadas.", "We don't just show metrics. We identify concrete problems, quantify their impact and recommend prioritized actions.")}
        actions={<div className="flex flex-wrap items-center justify-end gap-2"><IntervalExport rows={rows} name="diagnostics" />{
          <>
            <Button variant="secondary" size="sm" onClick={rerun}>
              <RefreshCw className="h-3.5 w-3.5" /> {tx("Re-ejecutar", "Re-run")}
            </Button>
            <Button variant="accent" size="sm" onClick={()=>{ const blob=new Blob([`# WFM Rescue - Diagnostic Report\nGenerated: ${new Date().toLocaleString()}\n\n` + findings.map(f=>`## ${f.title} [${f.severity}]\n${f.description}\nImpact: ${f.impact}\n`).join("\n\n")],{type:"text/markdown"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`wfm-diagnostics-${new Date().toISOString().slice(0,10)}.md`; a.click(); URL.revokeObjectURL(url); }}>
              <Download className="h-3.5 w-3.5" /> {tx("Exportar informe", "Export report")}
            </Button>
          </>
        }</div>}
      />

      <FilterBar />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<AlertTriangle className="h-5 w-5" />}
            title={tx("No hay datos para diagnosticar", "No data to diagnose")}
            description={tx("Importa datos o carga el conjunto de datos demo para que el motor de diagnóstico analice la operación.", "Import data or load the demo dataset so the diagnostics engine can analyze the operation.")}
            action={<Link href="/app/import"><Button variant="accent">{tx("Importar datos", "Import data")}</Button></Link>}
          />
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="grid md:grid-cols-4 gap-3 mb-5">
            <Card padded={false} className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[var(--danger-bg)] flex items-center justify-center text-[var(--danger-solid)]">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-2xl font-bold tabular-nums">{findings.filter((f) => f.severity === "critical" || f.severity === "high").length}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)]">{tx("Hallazgos críticos/altos", "Critical/high findings")}</div>
                </div>
              </div>
            </Card>
            <Card padded={false} className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[var(--warning-bg)] flex items-center justify-center text-[var(--warning-solid)]">
                  <Clock className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-2xl font-bold tabular-nums">{findings.filter((f) => f.severity === "medium").length}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)]">{tx("Medios", "Medium")}</div>
                </div>
              </div>
            </Card>
            <Card padded={false} className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[var(--success-bg)] flex items-center justify-center text-[var(--success-solid)]">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-2xl font-bold tabular-nums">{findings.filter((f) => f.severity === "low" || f.severity === "info").length}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)]">{tx("Bajos / informativos", "Low / info")}</div>
                </div>
              </div>
            </Card>
            <Card padded={false} className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-strong)]">
                  <DollarSign className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-2xl font-bold tabular-nums">{fmtCurrency(totalFinancial)}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)]">{tx("Impacto estimado (asunciones)", "Estimated impact (assumptions)")}</div>
                </div>
              </div>
            </Card>
          </div>

          <Callout variant="info" title={tx("Cómo leer estos hallazgos", "How to read these findings")} className="mb-4">
            {tx("Cada hallazgo incluye evidencia concreta (colas, intervalos, métricas), impacto estimado y acciones con prioridad sugerida.", "Each finding includes concrete evidence (queues, intervals, metrics), estimated impact and actions with a suggested priority.")}
            {tx("Las estimaciones en USD usan un costo cargado de ", "Estimates in USD use a loaded cost of ")}<strong>${loadedCost}{tx("/hora", "/hour")}</strong>{tx(" por agente; puedes ajustar este valor según tu operación.", " per agent; you can adjust this value to fit your operation.")}
          </Callout>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              {findings.length === 0 ? (
                <Card>
                  <div className="py-10 text-center">
                    <CheckCircle2 className="h-10 w-10 mx-auto text-[var(--success-solid)] mb-3" />
                    <h3 className="font-semibold text-base">{tx("No se detectaron problemas materiales", "No material issues detected")}</h3>
                    <p className="text-sm text-[var(--text-tertiary)] mt-1">{tx("El motor no encontró desviaciones significativas. Sigue monitoreando.", "The engine found no significant deviations. Keep monitoring.")}</p>
                  </div>
                </Card>
              ) : (
                findings.map((f) => (
                  <Card key={f.id} padded={false}>
                    <div className="p-5">
                      <div className="flex items-start gap-3">
                        <SeverityBadge severity={f.severity} />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-[var(--text-primary)]">{f.title}</h3>
                          <p className="text-sm text-[var(--text-secondary)] mt-1">{f.description}</p>
                        </div>
                        {f.financialImpact?.value != null && (
                          <div className="text-right shrink-0 ml-4">
                            <div className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-tertiary)]">{tx("Impacto", "Impact")}</div>
                            <div className="text-lg font-bold tabular-nums text-[var(--danger-solid)]">{fmtCurrency(f.financialImpact.value)}</div>
                          </div>
                        )}
                      </div>

                      {f.impact && (
                        <div className="mt-3 text-sm text-[var(--text-secondary)] bg-[var(--bg-subtle)] rounded-lg px-3 py-2">
                          <strong className="text-[var(--text-primary)]">{tx("Impacto:", "Impact:")}</strong> {f.impact}
                        </div>
                      )}

                      {f.evidence.length > 0 && (
                        <div className="mt-3">
                          <div className="text-[11px] uppercase font-semibold tracking-wider text-[var(--text-tertiary)] mb-1.5">{tx("Evidencia", "Evidence")}</div>
                          <ul className="space-y-1">
                            {f.evidence.map((e, i) => (
                              <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-2 font-mono">
                                <span className="text-[var(--text-quaternary)]">#{i + 1}</span>
                                <span>{e}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {f.recommendedActions.length > 0 && (
                        <div className="mt-4">
                          <div className="text-[11px] uppercase font-semibold tracking-wider text-[var(--text-tertiary)] mb-2">{tx("Acciones recomendadas", "Recommended actions")}</div>
                          <div className="space-y-2">
                            {f.recommendedActions.map((a, i) => {
                              const prioMeta = {
                                immediate: { label: "Inmediato", cls: "danger", icon: <Play className="h-3 w-3" /> },
                                today: { label: tx("Hoy", "Today"), cls: "warning", icon: <Clock className="h-3 w-3" /> },
                                this_week: { label: tx("Esta semana", "This week"), cls: "info", icon: <Target className="h-3 w-3" /> },
                              }[a.priority];
                              return (
                                <div key={i} className="flex items-start gap-3 rounded-lg border border-[var(--border-subtle)] p-2.5 bg-[var(--bg-surface-2)]">
                                  <div className="mt-0.5">
                                    <Chip variant={prioMeta.cls as never} className="!text-[10px]">
                                      {prioMeta.icon} {prioMeta.label}
                                    </Chip>
                                  </div>
                                  <div className="flex-1 text-sm text-[var(--text-primary)]">
                                    {a.label}
                                    {a.owner && <span className="text-xs text-[var(--text-tertiary)] ml-1">— {a.owner}</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {f.financialImpact?.note && (
                        <div className="mt-3 text-[11px] text-[var(--text-tertiary)] italic flex items-start gap-1.5">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {f.financialImpact.note}
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>

            <div className="space-y-4">
              <Card title={tx("Parámetros del modelo", "Model parameters")} subtitle={tx("Ajusta los supuestos para tu operación", "Adjust the assumptions for your operation")}>
                <label className="label">{tx("Costo cargado por hora/agente (USD)", "Loaded cost per hour/agent (USD)")}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="input"
                    value={loadedCost}
                    onChange={(e) => setLoadedCost(parseFloat(e.target.value) || DEFAULT_LOADED_COST)}
                    min={10}
                    max={100}
                  />
                  <Button variant="secondary" size="sm" onClick={rerun} aria-label={tx("Re-ejecutar diagnósticos", "Re-run diagnostics")} title={tx("Re-ejecutar diagnósticos", "Re-run diagnostics")}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-2">
                  {tx("Incluye salario bruto + cargas + beneficios + overhead. Usa el valor real de tu operación para estimaciones precisas.", "Includes gross salary + payroll taxes + benefits + overhead. Use your operation's actual value for accurate estimates.")}
                </p>
              </Card>

              <Card title={tx("Próximos pasos", "Next steps")}>
                <ul className="space-y-2.5 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--success-solid)] mt-0.5 shrink-0" />
                    <span>{tx("Exporta el informe ejecutivo para el comité de operaciones", "Export the executive report for the operations review")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--success-solid)] mt-0.5 shrink-0" />
                    <span>{tx("Asigna las acciones inmediatas a los supervisores de cola", "Assign immediate actions to the queue supervisors")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-[var(--info-solid)] mt-0.5 shrink-0" />
                    <span>{tx("Compara con el día de la semana anterior para detectar patrones", "Compare with the same weekday last week to detect patterns")}</span>
                  </li>
                </ul>
                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
                  <Link href="/app/intraday" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-strong)] hover:underline">
                    {tx("Ir a la vista intradía", "Go to the intraday view")} <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
