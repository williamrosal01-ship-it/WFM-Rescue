"use client";
import { useState } from "react";
import { useTx } from "@/lib/tx";
import { PRO_PRICE_USD, PRO_YEARLY_SAVINGS_PCT } from "@/lib/config";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { LandingLangSwitch, LandingLanguageGate } from "@/components/landing-language";
import {
  Activity,
  BarChart3,
  Upload,
  Database,
  Zap,
  Shield,
  LineChart,
  Users,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Clock,
  FileSpreadsheet,
  ArrowRight,
  LifeBuoy,
  Eye,
} from "lucide-react";

export const dynamic = "force-static";


export default function LandingPage() {
  const tx = useTx();
  const features = [
    {
      icon: FileSpreadsheet,
      title: tx("Importa de cualquier fuente", "Import from any source"),
      desc: tx("CSV o XLSX de Genesys, Avaya, NICE, Five9, Zendesk, Aspect o tus propias hojas. Mapeo inteligente de alias y perfiles reutilizables.", "CSV or XLSX from Genesys, Avaya, NICE, Five9, Zendesk, Aspect or your own sheets. Smart alias mapping and reusable profiles."),
    },
    {
      icon: Database,
      title: tx("Puntaje de calidad de datos", "Data health scoring"),
      desc: tx("Cada importación es auditada: nulos, duplicados, unidades incorrectas, intervalos faltantes, SL fuera de rango. Tú sabes qué confiar.", "Every import is audited: nulls, duplicates, wrong units, missing intervals, SL out of range. You know what to trust."),
    },
    {
      icon: AlertTriangle,
      title: tx("Diagnósticos accionables", "Actionable diagnostics"),
      desc: tx("No más 'te falta personal'. Recibes las colas, los intervalos, el déficit en horas-agente, el impacto económico y acciones priorizadas.", "No more 'you are short-staffed'. You get the queues, the intervals, the agent-hour deficit, the financial impact and prioritized actions."),
    },
    {
      icon: Activity,
      title: tx("Soporte de decisiones intradía", "Intraday decision support"),
      desc: tx("Monitorea intervalo a intervalo: SL, ASA, ocupación, adherencia, AUX. Detecta desviaciones antes de que se conviertan en crisis.", "Monitor interval by interval: SL, ASA, occupancy, adherence, AUX. Catch deviations before they become crises."),
    },
    {
      icon: LineChart,
      title: tx("Pronóstico vs real", "Forecast vs Actual"),
      desc: tx("Precisión por WAPE (no MAPE), sesgo direccional, errores por intervalo y por cola. Identifica si el plan está sobreestimando o subestimando.", "Accuracy by WAPE (not MAPE), directional bias, errors by interval and by queue. Shows whether the plan is over- or under-estimating."),
    },
    {
      icon: Users,
      title: tx("Adherencia & Shrinkage", "Adherence & Shrinkage"),
      desc: tx("Distinguimos planificado vs no-planificado, adherencia vs conformidad, y los códigos AUX que más afectan la operación.", "We separate planned vs unplanned time, adherence vs conformance, and the AUX codes that affect the operation the most."),
    },
    {
      icon: Shield,
      title: tx("Trazabilidad total", "Full traceability"),
      desc: tx("Cada métrica tiene fórmula, supuestos, campos fuente y limitaciones documentadas. Nunca más un KPI 'mágico' que nadie sabe explicar.", "Every metric has a documented formula, assumptions, source fields and limitations. No more 'magic' KPI nobody can explain."),
    },
    {
      icon: Eye,
      title: tx("Vista de gerente", "Manager View"),
      desc: tx("Los ejecutivos no necesitan 40 gráficos: necesitan 5 KPIs, 3 riesgos y la acción del día. Eso es lo que entregamos.", "Executives don't need 40 charts: they need 5 KPIs, 3 risks and the action of the day. That is what we deliver."),
    },
  ];

  const stats = [
    { value: "40-60%", label: tx("menos tiempo armando reportes semanales", "less time building weekly reports") },
    { value: "15-25%", label: tx("menos sobre-dotación en horas valle", "less over-staffing in off-peak hours") },
    { value: "85%+", label: tx("precisión del pronóstico en clientes estables", "forecast accuracy for stable clients") },
    { value: "< 5 min", label: tx("en importar tu primer archivo y ver diagnósticos", "to import your first file and see diagnostics") },
  ];

  const painPoints = [
    {
      before: tx("Horas consolidando hojas de Genesys, Avaya, NICE, Excel del WFM, Excel del ACD y Excel de asistencia.", "Hours consolidating sheets from Genesys, Avaya, NICE, the WFM Excel, the ACD Excel and the attendance Excel."),
      after: tx("Importas en minutos, el sistema mapea columnas solo, consolida, corrige y audita.", "You import in minutes; the system maps columns on its own, consolidates, corrects and audits."),
    },
    {
      before: tx("Reportes semanales que muestran que 'faltó personal' sin decir cuándo, cuánto ni qué hacer.", "Weekly reports that say 'we were short-staffed' without saying when, how much or what to do."),
      after: tx("Diagnóstico por intervalo y cola, con costo estimado, acciones priorizadas y dueño sugerido.", "Diagnosis by interval and queue, with estimated cost, prioritized actions and a suggested owner."),
    },
    {
      before: tx("KPI que nadie puede explicar de dónde salió ni si incluye abandonos cortos o no.", "KPIs nobody can explain: where they came from or whether they include short abandons."),
      after: tx("Cada métrica tiene fórmula visible, supuestos, campos fuente y limitaciones.", "Every metric has a visible formula, assumptions, source fields and limitations."),
    },
    {
      before: tx("Cada semana vuelves a mapear las mismas columnas del mismo proveedor.", "Every week you map the same columns from the same vendor again."),
      after: tx("Perfiles de importación reutilizables por fuente. Tu equipo junior puede importar en dos clics.", "Reusable import profiles per source. Your junior team can import in two clicks."),
    },
  ];

  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const isYearly = billing === "yearly";
  const proPrice = isYearly ? PRO_PRICE_USD.yearlyPerMonth : PRO_PRICE_USD.monthly;

  const pricing = [
    {
      name: "Demo",
      price: tx("Gratis", "Free"),
      cadence: tx("para probar", "to try it out"),
      description: tx("Explora la plataforma completa con datos demo ilustrativos antes de decidir.", "Explore the full platform with illustrative demo data before you decide."),
      features: [
        tx("Datos demo ilustrativos (no es un feed en vivo)", "Illustrative demo data (not a live feed)"),
        tx("Dashboard, Intraday, Service Level y Diagnósticos", "Dashboard, Intraday, Service Level and Diagnostics"),
        tx("Explorador de datos y Report Studio con datos demo", "Data Explorer and Report Studio with demo data"),
        tx("Sin carga de archivos propios", "No uploads of your own files"),
      ],
      cta: tx("Probar la demo", "Try the demo"),
      featured: false,
      href: "/app/dashboard",
    },
    {
      name: "Pro",
      price: `$${proPrice}`,
      cadence: isYearly ? tx("/usuario/mes, facturado al año", "/user/month, billed yearly") : tx("/usuario/mes", "/user/month"),
      description: tx("Para equipos WFM que quieren analizar sus propios datos en su navegador.", "For WFM teams that want to analyze their own data in their browser."),
      features: [
        tx("Todo lo de la demo", "Everything in the demo"),
        tx("Carga de CSV y XLSX de tus propios datos", "Upload your own CSV and XLSX data"),
        tx("Plantillas XLSX por origen: Salesforce, Five9, Verint y otras", "XLSX templates by source: Salesforce, Five9, Verint and others"),
        tx("Hojas múltiples: intervalos, horarios y asistencia", "Multi-sheet files: intervals, schedule and attendance"),
        tx("Elige el idioma de tus datos; la plataforma sigue en tu idioma", "Choose your data language; the platform stays in your language"),
        tx("Report Studio: 9 plantillas, 6 tipos de gráfico, CSV e impresión a PDF", "Report Studio: 9 templates, 6 chart types, CSV and print to PDF"),
        tx("Perfiles de importación guardados", "Saved import profiles"),
      ],
      cta: tx("Solicitar acceso", "Request access"),
      featured: true,
      href: "#contact",
    },
  ];
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)]">
      <LandingLanguageGate />
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={34} />
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm">
            <a href="#features" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">{tx("Producto", "Product")}</a>
            <a href="#compare" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">WFM vs Excel</a>
            <a href="#pricing" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">{tx("Precios", "Pricing")}</a>
            <Link href="/docs" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">{tx("Documentación", "Docs")}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <LandingLangSwitch />
            <Link href="/auth/login" className="btn btn-secondary text-sm">
              {tx("Iniciar sesión", "Sign in")}
            </Link>
            <Link href="/app/dashboard" className="btn btn-accent text-sm hidden sm:inline-flex">
              {tx("Probar demo", "Try the demo")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(14,165,164,0.12),transparent_60%)]" />
          <div className="absolute top-40 right-0 h-[300px] w-[500px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,42,67,0.08),transparent_60%)]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 chip chip-accent mb-5">
                <Zap className="h-3 w-3" />
                {tx("Analítica WFM para decidir con números", "WFM analytics for number-driven decisions")}
              </div>
              <h1 className="text-[clamp(2.2rem,4.5vw,3.5rem)] font-bold leading-[1.05] tracking-tight text-[var(--text-primary)]">
                {tx("Deja de adivinar la dotación.", "Stop guessing your staffing.")} <span className="text-[var(--accent)]">{tx("Ve cuánto te cuesta cada intervalo", "See what every understaffed interval costs")}</span> {tx("en minutos", "in minutes")}
              </h1>
              <p className="mt-5 text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl">
                {tx("WFM Rescue unifica tus exportaciones de WFM, ACD, asistencia y adherencia; audita la calidad de los datos; y te dice qué está pasando, por qué, qué cuesta y qué hacer al respecto.", "WFM Rescue unifies your WFM, ACD, attendance and adherence exports, audits data quality, and tells you what is happening, why, what it costs and what to do about it.")}
              </p>
              <p className="mt-3 text-sm text-[var(--text-tertiary)]">
                {tx("Para analistas, supervisores, gerentes y directores de operaciones y planificación en centros de contacto y BPO.", "For analysts, supervisors, managers and directors of operations and planning at contact centers and BPOs.")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/app/dashboard" className="btn btn-accent text-base !px-5 !py-2.5">
                  {tx("Ver mi déficit de personal (demo)", "See my staffing gap (demo)")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#features" className="btn btn-secondary text-base !px-5 !py-2.5">
                  {tx("Ver funcionalidades", "See features")}
                </a>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[var(--text-tertiary)]">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[var(--success-solid)]" /> {tx("Sin tarjeta", "No card required")}</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[var(--success-solid)]" /> {tx("CSV / XLSX listo para usar", "CSV / XLSX ready to use")}</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[var(--success-solid)]" /> {tx("Datos demo incluidos", "Demo data included")}</span>
              </div>
            </div>

            {/* Hero product preview */}
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-xl)] overflow-hidden">
                <div className="h-9 border-b border-[var(--border-subtle)] flex items-center gap-1.5 px-3 bg-[var(--bg-subtle)]">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  <div className="ml-3 text-[11px] text-[var(--text-quaternary)] font-medium">{tx("WFM Rescue · Intraday · 04 mar 2026", "WFM Rescue · Intraday · 04 Mar 2026")}</div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs text-[var(--text-tertiary)]">{tx("En vivo", "Live")}</div>
                      <div className="text-base font-bold">{tx("Service Level — Hoy", "Service Level — Today")}</div>
                    </div>
                    <div className="chip chip-danger">{tx("4 intervalos críticos", "4 critical intervals")}</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[
                      { l: "SL", v: "74%", t: "warn" },
                      { l: "ASA", v: "52s", t: "warn" },
                      { l: tx("Faltantes", "Missing"), v: "-8.2", t: "bad" },
                      { l: "Aband.", v: "9.4%", t: "warn" },
                    ].map((k) => (
                      <div key={k.l} className="rounded-lg border border-[var(--border-subtle)] p-2">
                        <div className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-quaternary)]">{k.l}</div>
                        <div className={`text-lg font-bold tabular-nums ${k.t === "bad" ? "text-[var(--danger-solid)]" : k.t === "warn" ? "text-[var(--warning-solid)]" : "text-[var(--success-solid)]"}`}>{k.v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Mini chart */}
                  <MiniChart />
                  <div className="mt-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-2.5 text-xs">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-[var(--danger-solid)] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-[var(--danger-text)]">{tx("Billing & Support sub-dotadas 10:30–12:00", "Billing & Support understaffed 10:30–12:00")}</div>
                        <div className="text-[var(--danger-text)] opacity-90 mt-0.5">{tx("Déficit 3.4 h-agente. Recomendación: activar cross-skill Alpha + aprobar overtime.", "Deficit 3.4 agent-hours. Recommendation: activate cross-skill Alpha + approve overtime.")}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-3 -right-3 surface !shadow-lg px-3 py-2 text-xs font-medium hidden sm:flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[var(--accent)]" /> {tx("Actualizado hace 4 minutos", "Updated 4 minutes ago")}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-[var(--border-subtle)] bg-[var(--bg-surface-2)]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-2xl lg:text-3xl font-bold text-[var(--brand-primary)] tabular-nums">{s.value}</div>
              <div className="text-xs lg:text-sm text-[var(--text-tertiary)] mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 lg:px-8 py-16 lg:py-20">
        <div className="max-w-2xl mb-10">
          <div className="chip chip-accent mb-3"><BarChart3 className="h-3 w-3" /> {tx("Construido por y para analistas WFM", "Built by and for WFM analysts")}</div>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">{tx("No es otro dashboard bonito. Es una herramienta que te dice qué hacer.", "It is not another pretty dashboard. It is a tool that tells you what to do.")}</h2>
          <p className="mt-4 text-[var(--text-secondary)]">
            {tx("Cada visualización existe para responder una pregunta operativa real. Cada alerta viene con evidencia, impacto y recomendación.", "Every visualization answers a real operational question. Every alert comes with evidence, impact and a recommendation.")}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card p-5 hover:shadow-[var(--shadow-md)] transition-shadow">
                <div className="h-9 w-9 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)] flex items-center justify-center mb-3">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
                <p className="text-xs leading-relaxed text-[var(--text-tertiary)]">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Compare */}
      <section id="compare" className="bg-[var(--bg-surface)] border-y border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16 lg:py-20">
          <div className="max-w-2xl mb-10">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">{tx("Cómo es un día con WFM Rescue versus cómo es hoy", "What a day with WFM Rescue looks like versus today")}</h2>
            <p className="mt-3 text-[var(--text-secondary)]">
              {tx("Si tu operación aún depende de hojas de cálculo, reconoces esto.", "If your operation still depends on spreadsheets, you will recognize this.")}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {painPoints.map((p, i) => (
              <div key={i} className="card p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-6 w-6 rounded-full bg-[var(--danger-bg)] border border-[var(--danger-border)] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[var(--danger-text)] text-xs font-bold">1</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    <span className="font-medium text-[var(--danger-text)]">{tx("Hoy:", "Today:")}</span> {p.before}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-[var(--success-bg)] border border-[var(--success-border)] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success-text)]" />
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    <span className="font-medium text-[var(--success-text)]">{tx("Con WFM Rescue:", "With WFM Rescue:")}</span> {p.after}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Proof points / who it's for */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16 lg:py-20">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="h-10 w-10 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)] flex items-center justify-center mb-3">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold mb-2">{tx("Si tu WFM actual no da abasto", "If your current WFM tool can't keep up")}</h3>
            <p className="text-sm text-[var(--text-tertiary)] leading-relaxed">
              {tx("Complementa tu plataforma WFM existente con análisis flexible. Importas los reportes que ya generas, sin integraciones complejas ni consultoría.", "Complement your existing WFM platform with flexible analysis. Import the reports you already generate, with no complex integrations or consulting.")}
            </p>
          </div>
          <div className="card p-6">
            <div className="h-10 w-10 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)] flex items-center justify-center mb-3">
              <Upload className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold mb-2">{tx("Si vives en Excel", "If you live in Excel")}</h3>
            <p className="text-sm text-[var(--text-tertiary)] leading-relaxed">
              {tx("Si estás armando el reporte diario a partir de 5 CSVs distintos y tres pestañas, WFM Rescue te quita ese trabajo del día en menos de una semana.", "If you build the daily report from 5 different CSVs and three tabs, WFM Rescue removes that work from your day in less than a week.")}
            </p>
          </div>
          <div className="card p-6">
            <div className="h-10 w-10 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)] flex items-center justify-center mb-3">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold mb-2">{tx("Si eres BPO multisitio", "If you run a multi-site BPO")}</h3>
            <p className="text-sm text-[var(--text-tertiary)] leading-relaxed">
              {tx("Estandariza cómo se mide, cómo se reporta y cómo se audita entre clientes, sitios y proveedores. Perfiles por cliente, trazabilidad por archivo.", "Standardize how it is measured, reported and audited across clients, sites and vendors. Profiles per client, traceability per file.")}
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-[var(--bg-surface-2)] border-t border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16 lg:py-20">
          <div className="max-w-2xl mb-10">
            <div className="chip chip-accent mb-3">{tx("Precios transparentes", "Transparent pricing")}</div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">{tx("Paga por la decisión, no por la implementación", "Pay for the decision, not for the implementation")}</h2>
            <p className="mt-3 text-[var(--text-secondary)]">
              {tx("Sin implementaciones de 6 meses. Sin complementos ocultos. Sin sorpresas al renovar.", "No 6-month implementations. No hidden add-ons. No surprises at renewal.")}
            </p>
          </div>
          <div className="mb-6 flex flex-wrap items-center gap-3" role="group" aria-label={tx("Periodo de facturación", "Billing period")}>
            <button
              type="button"
              aria-pressed={!isYearly}
              onClick={() => setBilling("monthly")}
              className={`btn ${!isYearly ? "btn-accent" : "btn-secondary"}`}
            >
              {tx("Mensual", "Monthly")}
            </button>
            <button
              type="button"
              aria-pressed={isYearly}
              onClick={() => setBilling("yearly")}
              className={`btn ${isYearly ? "btn-accent" : "btn-secondary"}`}
            >
              {tx("Anual", "Yearly")}
            </button>
            <span className="chip chip-accent">{tx(`Anual: ${PRO_YEARLY_SAVINGS_PCT}% menos`, `Yearly: ${PRO_YEARLY_SAVINGS_PCT}% off`)}</span>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`card p-6 relative ${plan.featured ? "ring-2 ring-[var(--accent)] shadow-[var(--shadow-lg)]" : ""}`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-6">
                    <span className="chip chip-accent font-semibold">{tx("Más popular", "Most popular")}</span>
                  </div>
                )}
                <div className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{plan.name}</div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
                  <span className="text-sm text-[var(--text-tertiary)]">{plan.cadence}</span>
                </div>
                <p className="mt-2 text-sm text-[var(--text-tertiary)]">{plan.description}</p>
                {plan.name === "Pro" && isYearly && (
                  <p className="mt-3 text-xs text-[var(--text-tertiary)]">
                    {tx(
                      "Plan anual: se factura por adelantado. Cancela cuando quieras: la renovación se detiene al terminar el año. No hay reembolso del periodo ya pagado.",
                      "Yearly plan: billed in advance. Cancel anytime: renewal stops at the end of the year. No refund for the period already paid."
                    )}
                  </p>
                )}
                <ul className="mt-5 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <CheckCircle2 className="h-4 w-4 text-[var(--success-solid)] shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-6 w-full justify-center btn ${plan.featured ? "btn-accent" : "btn-secondary"}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="border-t border-[var(--border-subtle)]">
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16 lg:py-20 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
            {tx("Tu próximo comité de operaciones no tiene por qué empezar con \"armé el reporte anoche a las 11\"", "Your next operations review doesn't have to start with \"I built the report last night at 11\"")}
          </h2>
          <p className="mt-4 text-[var(--text-secondary)] max-w-2xl mx-auto">
            {tx("Abre la demo y mira los diagnósticos correr en menos de un minuto. Sin registro ni carga de archivos.", "Open the demo and see the diagnostics run in under a minute. No sign-up or file upload needed.")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/app/dashboard" className="btn btn-accent text-base !px-6 !py-2.5">
              {tx("Entrar a la demo", "Enter the demo")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/docs" className="btn btn-secondary text-base !px-6 !py-2.5">
              {tx("Ver documentación de métricas", "View metric documentation")}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[var(--text-tertiary)]">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-xl flex items-center justify-center" style={{background:"linear-gradient(135deg, #0f2742 0%, #1a4d5c 45%, #0ea5a4 100%)"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3L4 7v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V7L12 3z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" fill="white" fillOpacity="0.08"/><path d="M6 13l3-3 3 4 3-5 3 2" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
            <span>{tx("© 2026 WFM Rescue. Hecho por un equipo que pasó por las mismas trincheras.", "© 2026 WFM Rescue. Built by a team that went through the same trenches.")}</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/docs" className="hover:text-[var(--text-primary)]">{tx("Docs de métricas", "Metric docs")}</Link>
            <Link href="/pricing" className="hover:text-[var(--text-primary)]">{tx("Precios", "Pricing")}</Link>
            <span>{tx("Estado:", "Status:")} <span className="text-[var(--success-solid)] font-medium">Operativo</span></span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Simple inline SVG chart for hero
function MiniChart() {
  // Service level across intervals
  const data = [0.91, 0.88, 0.85, 0.82, 0.78, 0.72, 0.68, 0.65, 0.71, 0.78, 0.84, 0.89, 0.92, 0.9, 0.85, 0.8, 0.74, 0.7, 0.76, 0.82, 0.87, 0.9, 0.93, 0.94];
  const target = 0.8;
  const w = 480;
  const h = 80;
  const pad = 4;
  const step = (w - pad * 2) / (data.length - 1);
  const yFor = (v: number) => pad + (1 - v) * (h - pad * 2);
  const linePath = data.map((v, i) => `${i === 0 ? "M" : "L"} ${pad + i * step} ${yFor(v)}`).join(" ");
  const targetY = yFor(target);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none">
      <defs>
        <linearGradient id="heroGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0ea5a4" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0ea5a4" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Target line */}
      <line x1={pad} x2={w - pad} y1={targetY} y2={targetY} stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" />
      {/* Area */}
      <path d={`${linePath} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`} fill="url(#heroGrad)" />
      {/* Line */}
      <path d={linePath} stroke="#0ea5a4" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Below-target dots */}
      {data.map((v, i) =>
        v < target ? (
          <circle key={i} cx={pad + i * step} cy={yFor(v)} r="2" fill="#ef4444" />
        ) : null,
      )}
    </svg>
  );
}
