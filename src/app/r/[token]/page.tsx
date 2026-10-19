"use client";

// Enlace público de un informe compartido. No pide cuenta ni muestra la aplicación.
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Gauge, Printer } from "lucide-react";
import { SnapshotView } from "@/components/snapshot-view";
import { fetchShared, shareErrorMessage, ShareError, type SharedView } from "@/lib/share-api";
import { printReport } from "@/lib/print-report";
import type { Lang } from "@/lib/report-snapshot";

type State =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; code: string }
  | { status: "ok"; view: SharedView };

// Antes de leer el informe no sabemos su idioma: usamos el del navegador.
// Se calcula después de montar (no en el servidor) para evitar diferencias de hidratación.
const browserLang = (): Lang =>
  typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";

export default function SharedReportPage() {
  const params = useParams<{ token: string }>();
  const token = String(params?.token ?? "");
  const [state, setState] = useState<State>({ status: "loading" });
  const [fallbackLang, setFallbackLang] = useState<Lang>("en");

  useEffect(() => {
    // Tema: esta ruta está fuera de /app, así que aplica su propio tema guardado (o el del sistema).
    const saved = localStorage.getItem("wfm-theme") as "light" | "dark" | null;
    const theme = saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    setFallbackLang(browserLang());
  }, []);

  useEffect(() => {
    let active = true;
    if (!token) {
      setState({ status: "missing" });
      return;
    }
    fetchShared(token)
      .then((view) => {
        if (!active) return;
        setState(view ? { status: "ok", view } : { status: "missing" });
      })
      .catch((e) => {
        if (!active) return;
        setState({ status: "error", code: e instanceof ShareError ? e.code : "unknown" });
      });
    return () => {
      active = false;
    };
  }, [token]);

  const lang: Lang = state.status === "ok" ? state.view.payload.lang : fallbackLang;
  const t = (es: string, en: string) => (lang === "es" ? es : en);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <header className="wr-print-hide flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3 lg:px-8">
        <div className="flex items-center gap-2 font-semibold">
          <Gauge className="h-5 w-5 text-[var(--accent-strong)]" aria-hidden="true" />
          WFM Rescue
          <span className="ml-2 hidden text-xs font-normal text-[var(--text-tertiary)] sm:inline">
            {t("Informe compartido · solo lectura", "Shared report · read only")}
          </span>
        </div>
        {state.status === "ok" ? (
          <button
            type="button"
            onClick={() => printReport(state.view.title)}
            className="btn btn-secondary btn-sm"
          >
            <Printer className="h-3.5 w-3.5" /> {t("Guardar como PDF", "Save as PDF")}
          </button>
        ) : null}
      </header>

      <main className="mx-auto max-w-[1400px] p-4 lg:p-8">
        {state.status === "loading" ? (
          <div className="py-20 text-center text-sm text-[var(--text-tertiary)]">{t("Cargando informe…", "Loading report…")}</div>
        ) : null}

        {state.status === "missing" ? (
          <div className="mx-auto max-w-md py-20 text-center">
            <h1 className="text-lg font-semibold">{t("Este enlace no está disponible", "This link is not available")}</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {t(
                "Puede que haya caducado, que lo hayan revocado o que la dirección esté incompleta. Pide a quien lo compartió un enlace nuevo.",
                "It may have expired, been revoked, or the address may be incomplete. Ask the person who shared it for a new link.",
              )}
            </p>
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="mx-auto max-w-md py-20 text-center">
            <h1 className="text-lg font-semibold">{t("No se pudo abrir el informe", "The report could not be opened")}</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{shareErrorMessage(state.code, lang)}</p>
          </div>
        ) : null}

        {state.status === "ok" ? (
          <>
            <SnapshotView snapshot={state.view.payload} />
            <p className="mt-6 text-center text-[11px] text-[var(--text-quaternary)]">
              {t("Vence el", "Expires on")}{" "}
              {new Date(state.view.expires_at).toLocaleDateString(lang === "es" ? "es-ES" : "en-US", { dateStyle: "medium" })}.{" "}
              {t(
                "Resumen del informe. Los datos crudos permanecen en la cuenta de origen.",
                "Report summary. Raw data stays in the source account.",
              )}
            </p>
          </>
        ) : null}
      </main>
    </div>
  );
}
