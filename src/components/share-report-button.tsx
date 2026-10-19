"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Link2, Share2, X } from "lucide-react";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { useWfmStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { authConfigured } from "@/lib/supabase";
import {
  expiryFromDays,
  filtersSummary,
  makeSnapshot,
  SHARE_DEFAULT_DAYS,
  SHARE_MAX_DAYS,
  type Lang,
  type ReportContent,
} from "@/lib/report-snapshot";
import { createShare, shareErrorMessage, shareUrl, ShareError } from "@/lib/share-api";
import { fmtDate } from "@/lib/formatters";

/**
 * "Compartir" = crear un enlace de solo lectura con un resumen (foto) de este informe.
 * El contenido se calcula al pulsar, con los filtros activos. Solo se suben KPIs, series y tablas pequeñas.
 */
export function ShareReportButton({ title, getContent }: { title: string; getContent: () => ReportContent }) {
  const { locale } = useI18n();
  const lang: Lang = locale === "es" ? "es" : "en";
  const t = (es: string, en: string) => (lang === "es" ? es : en);
  const { session, loading } = useAuth();
  const { orgName, datasetName, datasetIsDemo, filters } = useWfmStore();

  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<number>(SHARE_DEFAULT_DAYS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const close = () => {
    setOpen(false);
    setError(null);
    setResult(null);
    setCopied(false);
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const snapshot = makeSnapshot(getContent(), {
        reportName: title,
        orgName,
        datasetName: datasetName ?? "",
        datasetIsDemo: Boolean(datasetIsDemo),
        filtersText: filtersSummary(filters, lang),
        generatedAt: new Date().toISOString(),
        lang,
      });
      const res = await createShare(title, snapshot, expiryFromDays(days));
      setResult({ url: shareUrl(res.token), expiresAt: res.expiresAt });
    } catch (e) {
      if (e instanceof Error && e.message === "snapshot_too_large") {
        setError(t("El informe es demasiado grande para compartir. Usa filtros para reducirlo.", "The report is too large to share. Use filters to reduce it."));
      } else if (e instanceof ShareError && e.code === "not_configured") {
        setError(t("Compartir requiere la nube configurada en este despliegue.", "Sharing requires the cloud to be configured in this deployment."));
      } else if (e instanceof ShareError) {
        setError(shareErrorMessage(e.code, lang));
      } else {
        setError(t("No se pudo crear el enlace. Intenta de nuevo.", "The link could not be created. Try again."));
      }
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("No se pudo copiar. Selecciona el enlace y cópialo a mano.", "Could not copy. Select the link and copy it manually."));
    }
  };

  const signedIn = Boolean(session);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Share2 className="h-3.5 w-3.5" /> {t("Compartir", "Share")}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-title"
            className="w-full max-w-lg rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="share-title" className="text-base font-semibold text-[var(--text-primary)]">
                  {t("Compartir informe", "Share report")}
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{title}</p>
              </div>
              <button type="button" onClick={close} className="btn btn-ghost !px-2 !py-1" aria-label={t("Cerrar", "Close")}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              {t(
                "Crea un enlace de solo lectura con un resumen de este informe, con los filtros activos. Quien lo abra no necesita cuenta. Los datos crudos no se suben y los nombres de agentes no se incluyen.",
                "Create a read-only link with a summary of this report, using the active filters. Anyone with the link can open it without an account. Raw data is not uploaded and agent names are not included.",
              )}
            </p>

            {!authConfigured ? (
              <div className="mt-4 rounded-lg border border-[var(--border-default)] p-3 text-sm text-[var(--text-secondary)]">
                {t("Compartir requiere la nube configurada en este despliegue.", "Sharing requires the cloud to be configured in this deployment.")}
              </div>
            ) : loading ? (
              <div className="mt-4 text-sm text-[var(--text-tertiary)]">{t("Verificando tu sesión…", "Checking your session…")}</div>
            ) : !signedIn ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-[var(--border-default)] p-3 text-sm text-[var(--text-secondary)]">
                  {t("Inicia sesión para crear enlaces. Tu cuenta también define tu rol y tu organización.", "Sign in to create links. Your account also sets your role and organization.")}
                </div>
                <Link href="/auth/login" className="btn btn-accent btn-sm">
                  {t("Iniciar sesión", "Sign in")}
                </Link>
              </div>
            ) : result ? (
              <div className="mt-4 space-y-3">
                <label className="label" htmlFor="share-url">{t("Enlace para compartir", "Link to share")}</label>
                <div className="flex gap-2">
                  <input id="share-url" readOnly value={result.url} onFocus={(e) => e.currentTarget.select()} className="input flex-1 font-mono text-xs" />
                  <Button variant="accent" size="sm" onClick={copy}>
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? t("Copiado", "Copied") : t("Copiar", "Copy")}
                  </Button>
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {t("Caduca el", "Expires on")} {fmtDate(result.expiresAt)}. {t("Puedes revocarlo cuando quieras desde Compartidos.", "You can revoke it anytime from Shared.")}
                </p>
                <Link href="/app/shared" className="inline-flex items-center gap-1 text-xs text-[var(--accent-strong)] hover:underline">
                  <Link2 className="h-3.5 w-3.5" /> {t("Ver enlaces y equipo", "View links and team")}
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="label" htmlFor="share-days">{t("Caduca en (días)", "Expires in (days)")}</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[7, 30, 90].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDays(d)}
                        aria-pressed={days === d}
                        className={`btn btn-sm ${days === d ? "btn-accent" : "btn-secondary"}`}
                      >
                        {d}
                      </button>
                    ))}
                    <input
                      id="share-days"
                      type="number"
                      min={1}
                      max={SHARE_MAX_DAYS}
                      value={days}
                      onChange={(e) => setDays(Math.min(SHARE_MAX_DAYS, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="input !w-24 !py-1.5 text-sm"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                    {t(`Máximo ${SHARE_MAX_DAYS} días. Por defecto 7.`, `Maximum ${SHARE_MAX_DAYS} days. Default 7.`)}
                  </p>
                </div>
                <Button variant="accent" onClick={create} disabled={busy}>
                  <Share2 className="h-3.5 w-3.5" /> {busy ? t("Creando…", "Creating…") : t("Crear enlace", "Create link")}
                </Button>
              </div>
            )}

            {error && (
              <div role="alert" className="mt-3 rounded-lg border border-[var(--danger-border,#fecaca)] bg-[var(--danger-soft,#fff1f2)] p-3 text-sm text-[var(--danger-text,#be123c)]">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
