"use client";
import { datasetLabel } from "@/lib/dataset-label";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTx } from "@/lib/tx";
import { useI18n } from "@/lib/i18n";
import { useWfmStore } from "@/lib/store";
import { useStudio } from "@/lib/studio-store";
import { SectionHeader, Card, Button, Chip, EmptyState, Callout } from "@/components/ui";
import { useToast } from "@/components/toast";
import { TEMPLATES, CHART_KINDS, resolveText, type ChartKind, type Locale, type StudioReport } from "@/lib/studio-core";
import { FileBarChart, Copy, Trash2, Plus, LayoutTemplate } from "lucide-react";

const fmtWhen = (iso: string, loc: Locale) =>
  new Date(iso).toLocaleString(loc === "es" ? "es-ES" : "en-US", { dateStyle: "medium", timeStyle: "short" });

function ChartChips({ kinds, loc }: { kinds: ChartKind[]; loc: Locale }) {
  return (
    <div className="flex flex-wrap gap-1">
      {kinds.map((k, i) => (
        <Chip key={`${k}-${i}`} variant="neutral" className="!text-[10px]">
          {CHART_KINDS.find((c) => c.id === k)?.label[loc] ?? k}
        </Chip>
      ))}
    </div>
  );
}

export default function StudioListPage() {
  const tx = useTx();
  const { locale } = useI18n();
  const loc: Locale = locale === "en" ? "en" : "es";
  const router = useRouter();
  const { showToast } = useToast();
  const { intervals, datasetIsDemo, datasetName } = useWfmStore();
  const reports = useStudio((s) => s.reports);
  const userTemplates = useStudio((s) => s.userTemplates);
  const createBlank = useStudio((s) => s.createBlank);
  const createFromTemplate = useStudio((s) => s.createFromTemplate);
  const duplicate = useStudio((s) => s.duplicate);
  const remove = useStudio((s) => s.remove);
  const removeUserTemplate = useStudio((s) => s.removeUserTemplate);
  const createFromUserTemplate = useStudio((s) => s.createFromUserTemplate);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const openReport = (id: string) => router.push(`/app/studio/${id}`);
  const hasData = intervals.length > 0;

  return (
    <div>
      <SectionHeader
        title={tx("Estudio de informes", "Report Studio")}
        description={tx(
          "Crea informes con gráficos a partir de tus datos: cada gráfico usa la representación que mejor muestra su dato. Los informes se guardan en este navegador.",
          "Build reports with charts from your data: each chart uses the view that best shows its data. Reports are saved in this browser.",
        )}
        actions={
          <Button variant="primary" leadingIcon={<Plus className="h-4 w-4" />} onClick={() => openReport(createBlank())}>
            {tx("Informe en blanco", "Blank report")}
          </Button>
        }
      />

      {!hasData && (
        <Callout variant="warning" title={tx("No hay datos cargados", "No data loaded")} className="mb-4">
          {tx("Los gráficos se alimentan de los datos activos. ", "Charts use the active data. ")}
          <Link href="/app/import" className="underline">{tx("Ir a importar", "Go to import")}</Link>
        </Callout>
      )}
      {hasData && (
        <p className="mb-4 text-xs text-[var(--text-tertiary)]">
          {tx("Fuente activa", "Active source")}: <span className="font-medium text-[var(--text-secondary)]">{datasetLabel(datasetName, tx)}</span>
          {datasetIsDemo ? tx(" (datos de demostración)", " (demo data)") : ""} · {intervals.length.toLocaleString(loc === "es" ? "es-ES" : "en-US")} {tx("intervalos", "intervals")}
        </p>
      )}

      <div className="mb-8">
        <h2 className="mb-1 text-base font-semibold text-[var(--text-primary)]">{tx("Plantillas", "Templates")}</h2>
        <p className="mb-4 text-xs text-[var(--text-tertiary)]">{tx("Cada plantilla es un punto de partida editable. Puedes cambiar gráficos, métricas y filtros.", "Each template is an editable starting point. You can change charts, metrics and filters.")}</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {TEMPLATES.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  <LayoutTemplate className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{resolveText(t.name, loc)}</div>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{resolveText(t.description, loc)}</p>
                </div>
              </div>
              <div className="mt-3"><ChartChips kinds={t.widgets.map((w) => w.chart)} loc={loc} /></div>
              <div className="mt-4">
                <Button size="sm" variant="secondary" onClick={() => openReport(createFromTemplate(t.id))}>
                  {tx("Usar plantilla", "Use template")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-base font-semibold text-[var(--text-primary)]">{tx("Mis informes", "My reports")}</h2>
        {!ready ? null : reports.length === 0 ? (
          <Card>
            <EmptyState
              icon={<FileBarChart className="h-5 w-5" />}
              title={tx("Aún no tienes informes", "You have no reports yet")}
              description={tx("Empieza con una plantilla o con un informe en blanco.", "Start from a template or a blank report.")}
            />
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {reports.map((r: StudioReport) => (
              <Card key={r.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{resolveText(r.name, loc)}</div>
                    <p className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">{resolveText(r.description, loc) || tx("Sin descripción", "No description")}</p>
                  </div>
                  <Chip variant="neutral" className="!text-[10px] shrink-0">{r.widgets.length} {tx(r.widgets.length === 1 ? "gráfico" : "gráficos", r.widgets.length === 1 ? "chart" : "charts")}</Chip>
                </div>
                <div className="mt-2"><ChartChips kinds={r.widgets.map((w) => w.chart)} loc={loc} /></div>
                <div className="mt-2 text-[11px] text-[var(--text-quaternary)]">{tx("Actualizado", "Updated")} {ready ? fmtWhen(r.updatedAt, loc) : ""}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="primary" onClick={() => openReport(r.id)}>{tx("Abrir", "Open")}</Button>
                  <Button size="sm" variant="secondary" leadingIcon={<Copy className="h-3.5 w-3.5" />} onClick={() => { const id = duplicate(r.id); if (id) openReport(id); }}>
                    {tx("Duplicar", "Duplicate")}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => {
                      if (window.confirm(tx("¿Eliminar este informe?", "Delete this report?"))) {
                        remove(r.id);
                        showToast(tx("Informe eliminado", "Report deleted"));
                      }
                    }}
                  >
                    {tx("Eliminar", "Delete")}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {ready && userTemplates.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-[var(--text-primary)]">{tx("Mis plantillas", "My templates")}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {userTemplates.map((t) => (
              <Card key={t.id}>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{resolveText(t.name, loc)}</div>
                <div className="mt-2"><ChartChips kinds={t.widgets.map((w) => w.chart)} loc={loc} /></div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { const id = createFromUserTemplate(t.id); if (id) openReport(id); }}>{tx("Usar plantilla", "Use template")}</Button>
                  <Button size="sm" variant="danger" onClick={() => removeUserTemplate(t.id)}>{tx("Eliminar", "Delete")}</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

