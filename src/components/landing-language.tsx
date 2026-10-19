"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Globe } from "lucide-react";

const CHOSEN_KEY = "wfm-landing-lang-chosen";

/** Compact EN | ES switch for the landing header. Uses the same locale state as the app. */
export function LandingLangSwitch() {
  const { locale, setLocale } = useI18n();
  const opts: Array<{ id: "en" | "es"; label: string; aria: string }> = [
    { id: "en", label: "EN", aria: "English" },
    { id: "es", label: "ES", aria: "Español" },
  ];
  return (
    <div role="group" aria-label="Language / Idioma" className="inline-flex items-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] p-0.5 text-xs font-semibold">
      <Globe className="mx-1.5 h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-label={o.aria}
          aria-pressed={locale === o.id}
          onClick={() => {
            setLocale(o.id);
            try { localStorage.setItem(CHOSEN_KEY, "1"); } catch { /* private mode */ }
          }}
          className={`rounded-md px-2.5 py-1 transition-colors ${locale === o.id ? "bg-[var(--accent-solid)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * First visit to the landing: the buyer picks the language before reading the page.
 * Stored in localStorage, so it is shown once per browser. The switch in the header
 * remains available afterwards.
 */
export function LandingLanguageGate() {
  const { setLocale } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CHOSEN_KEY)) setOpen(true);
    } catch {
      setOpen(false);
    }
  }, []);

  if (!open) return null;

  const choose = (l: "en" | "es") => {
    setLocale(l);
    try { localStorage.setItem(CHOSEN_KEY, "1"); } catch { /* ignore */ }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="lang-gate-title">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-2xl text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-soft)]">
          <Globe className="h-5 w-5 text-[var(--accent-solid)]" aria-hidden="true" />
        </div>
        <h2 id="lang-gate-title" className="text-lg font-bold text-[var(--text-primary)]">Choose your language</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Elige tu idioma</p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => choose("en")} className="btn btn-accent justify-center !py-3 text-base">English</button>
          <button type="button" onClick={() => choose("es")} className="btn btn-accent justify-center !py-3 text-base">Español</button>
        </div>
        <p className="mt-4 text-xs text-[var(--text-tertiary)]">You can change it anytime in the top bar. · Puedes cambiarlo en cualquier momento en la barra superior.</p>
      </div>
    </div>
  );
}
