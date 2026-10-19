"use client";
import { CANONICAL_FIELDS } from "@/lib/parsers";
import { useTx } from "@/lib/tx";
import { useI18n } from "@/lib/i18n";
import { tl } from "@/lib/texts-en";
import { Card, Chip, SectionHeader } from "@/components/ui";
import { KPI_DEFINITIONS } from "@/lib/wfm";
import Link from "next/link";
import { BookOpen, Database, ArrowLeft, FileText } from "lucide-react";

const makeCategories = (tx: (es: string, en: string) => string): Record<string, { label: string; color: "accent" | "info" | "warning" | "success" | "neutral" | "danger" }> => ({
  volume: { label: tx("Volumen", "Volume"), color: "accent" },
  service: { label: tx("Nivel de servicio", "Service level"), color: "info" },
  staffing: { label: tx("Dotación", "Staffing"), color: "warning" },
  occupancy: { label: tx("Ocupación", "Occupancy"), color: "success" },
  adherence: { label: tx("Adherencia", "Adherence"), color: "info" },
  attendance: { label: tx("Asistencia", "Attendance"), color: "neutral" },
  shrinkage: { label: "Shrinkage", color: "danger" },
  quality: { label: tx("Calidad", "Quality"), color: "neutral" },
});

export default function DocsPage() {
  const tx = useTx();
  const CATEGORIES = makeCategories(tx);
  const { locale } = useI18n();
  const categories = Array.from(new Set(KPI_DEFINITIONS.map((k) => k.category)));

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-[#102a43] to-[#0ea5a4] flex items-center justify-center text-white">
              <Database className="h-3.5 w-3.5" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold">WFM Rescue</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm text-[var(--text-tertiary)]">
            <Link href="/" className="hover:text-[var(--text-primary)]">{tx("Inicio", "Home")}</Link>
            <Link href="/#pricing" className="hover:text-[var(--text-primary)]">{tx("Precios", "Pricing")}</Link>
            <Link href="/docs" className="text-[var(--text-primary)] font-medium">{tx("Documentación", "Docs")}</Link>
            <Link href="/app/dashboard" className="hover:text-[var(--text-primary)]">App</Link>
          </nav>
          <div className="flex-1" />
          <Link href="/app/dashboard" className="btn btn-accent text-sm">{tx("Abrir la app", "Open the app")}</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 lg:px-8 py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-5">
          <ArrowLeft className="h-3 w-3" /> {tx("Volver al inicio", "Back to home")}
        </Link>

        <div className="flex items-start gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)] flex items-center justify-center shrink-0">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{tx("Glosario de métricas y fórmulas", "Metric and formula glossary")}</h1>
            <p className="text-[var(--text-secondary)] mt-1 max-w-2xl text-sm">
              {tx("Todas las métricas que calcula WFM Rescue están documentadas aquí: definición, fórmula, unidad, campos fuente, supuestos y limitaciones. Ninguna caja negra.", "Every metric WFM Rescue calculates is documented here: definition, formula, unit, source fields, assumptions and limitations. No black boxes.")}
            </p>
          </div>
        </div>

        <Card className="mb-6 p-5">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-[var(--accent-strong)] shrink-0 mt-0.5" />
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
              <p className="font-semibold text-[var(--text-primary)] mb-1">{tx("Transparencia antes que todo", "Transparency above all")}</p>
              <p>
                {tx("Las fórmulas documentadas aquí son las que usa el motor de cálculo real del producto. Si detectas una desviación respecto a la convención de tu ACD o proveedor, puedes ajustar los parámetros en Configuración. WFM Rescue sigue la convención más extendida en la industria pero siempre te muestra los supuestos.", "The formulas documented here are the ones the product's real calculation engine uses. If you detect a deviation from your ACD or vendor convention, you can adjust the parameters in Settings. WFM Rescue follows the most widespread industry convention but always shows you the assumptions.")}
              </p>
            </div>
          </div>
        </Card>

        {categories.map((cat) => {
          const kpis = KPI_DEFINITIONS.filter((k) => k.category === cat);
          const meta = CATEGORIES[cat];
          return (
            <section key={cat} className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-bold">{meta.label}</h2>
                <Chip variant={meta.color}>{kpis.length} {kpis.length === 1 ? tx("métrica", "metric") : tx("métricas", "metrics")}</Chip>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {kpis.map((k) => (
                  <Card key={k.id} padded={false}>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-semibold text-[var(--text-primary)]">{tl(k.name, locale)}</h3>
                        <Chip variant="neutral" className="shrink-0">{k.unit}</Chip>
                      </div>
                      <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">{tl(k.description, locale)}</p>

                      <div className="mt-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1">{tx("Fórmula", "Formula")}</div>
                        <code className="font-mono text-xs text-[var(--text-primary)] break-words">{tl(k.formula, locale)}</code>
                      </div>

                      {k.denominator && (
                        <div className="mt-2 text-xs">
                          <span className="font-semibold text-[var(--text-tertiary)]">{tx("Denominador: ", "Denominator: ")}</span>
                          <span className="text-[var(--text-secondary)]">{tl(k.denominator, locale)}</span>
                        </div>
                      )}

                      <div className="mt-3">
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1">{tx("Campos fuente", "Source fields")}</div>
                        <div className="flex flex-wrap gap-1">
                          {k.sourceFields.map((f) => (
                            <code key={f} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                              {tl(CANONICAL_FIELDS.find((x) => x.key === f)?.label ?? f, locale)}
                            </code>
                          ))}
                        </div>
                      </div>

                      {k.assumptions && k.assumptions.length > 0 && (
                        <div className="mt-3">
                          <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1">{tx("Supuestos", "Assumptions")}</div>
                          <ul className="text-xs text-[var(--text-secondary)] space-y-0.5 list-disc pl-4">
                            {k.assumptions.map((a, i) => <li key={i}>{tl(a, locale)}</li>)}
                          </ul>
                        </div>
                      )}

                      {k.limitations && k.limitations.length > 0 && (
                        <div className="mt-3">
                          <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--warning-text)] mb-1">{tx("Limitaciones conocidas", "Known limitations")}</div>
                          <ul className="text-xs text-[var(--text-secondary)] space-y-0.5 list-disc pl-4">
                            {k.limitations.map((l, i) => <li key={i}>{tl(l, locale)}</li>)}
                          </ul>
                        </div>
                      )}

                      {k.benchmark && (
                        <div className="mt-3 flex items-center gap-3 text-xs pt-3 border-t border-[var(--border-subtle)]">
                          <span className="text-[var(--text-tertiary)] font-semibold">Benchmark:</span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-[var(--success-solid)]" />
                            {k.benchmark.direction === "max" ? "≥" : "≤"}{" "}
                            {k.unit === "percent" ? `${(k.benchmark.good * 100).toFixed(0)}%` : k.benchmark.good}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-[var(--warning-solid)]" />
                            {k.benchmark.direction === "max" ? "<" : ">"}{" "}
                            {k.unit === "percent" ? `${(k.benchmark.warn * 100).toFixed(0)}%` : k.benchmark.warn}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-[var(--danger-solid)]" />
                            {k.unit === "percent" ? `${(k.benchmark.bad * 100).toFixed(0)}%` : k.benchmark.bad}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}

        <Card className="p-6 mt-6">
          <h3 className="font-semibold text-base mb-2">{tx("¿No encuentras una métrica?", "Can't find a metric?")}</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {tx("Las métricas se añaden según la demanda de los clientes. Si necesitas una métrica específica de tu operación (p. ej. SLA por skill con umbrales específicos, Net Promoter Score integrado, FCR por intervalo), abre un issue o contáctanos.", "Metrics are added based on customer demand. If you need a metric specific to your operation (e.g. SLA per skill with specific thresholds, built-in Net Promoter Score, FCR per interval), open an issue or contact us.")}
          </p>
        </Card>
      </main>
    </div>
  );
}
