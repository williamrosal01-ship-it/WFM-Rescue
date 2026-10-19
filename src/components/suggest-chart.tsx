"use client";

import { useState, type FormEvent } from "react";
import { Lightbulb, X } from "lucide-react";
import { useTx } from "@/lib/tx";
import { useI18n } from "@/lib/i18n";

type Status = "idle" | "sending" | "sent" | "error";

/** "Suggest a new chart" from Report Studio. Sends through /api/suggest-chart (server-side recipient). */
export function SuggestChart({ reportName }: { reportName: string }) {
  const tx = useTx();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const close = () => {
    setOpen(false);
    setStatus("idle");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/suggest-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, email, report: reportName, locale }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("sent");
      setMessage("");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost text-xs">
        <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
        {tx("Sugerir un gráfico nuevo", "Suggest a new chart")}
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="suggest-title">
          <div className="w-full max-w-md">
          <div className="card p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h2 id="suggest-title" className="text-lg font-bold text-[var(--text-primary)]">
                {tx("¿Qué gráfico necesitas?", "What chart do you need?")}
              </h2>
              <button type="button" onClick={close} aria-label={tx("Cerrar", "Close")} className="btn btn-ghost !p-1.5">
                <X className="h-4 w-4" />
              </button>
            </div>

            {status === "sent" ? (
              <div className="space-y-4">
                <p className="text-sm text-[var(--text-secondary)]">
                  {tx("Gracias. Revisamos cada sugerencia y te respondemos.", "Thanks. We review every suggestion and get back to you.")}
                </p>
                <button type="button" onClick={close} className="btn btn-accent w-full justify-center">{tx("Cerrar", "Close")}</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <label className="label" htmlFor="suggest-message">{tx("Describe la métrica y cómo la quieres ver", "Describe the metric and how you want to see it")}</label>
                  <textarea
                    id="suggest-message"
                    className="input w-full min-h-28"
                    required
                    minLength={10}
                    maxLength={1500}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={tx("Ej.: Abandono por intervalo en área, separado por cola, para ver las horas pico.", "E.g.: Abandon rate by interval as an area chart, split by queue, to see the peak hours.")}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="suggest-email">{tx("Tu correo para responderte (opcional)", "Your email to reply (optional)")}</label>
                  <input id="suggest-email" type="email" className="input w-full" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                {status === "error" && (
                  <p role="alert" className="text-sm text-[var(--danger-solid)]">
                    {tx("No pudimos enviar la sugerencia ahora. Intenta más tarde.", "We could not send the suggestion right now. Please try again later.")}
                  </p>
                )}
                <button type="submit" disabled={status === "sending"} className="btn btn-accent w-full justify-center">
                  {status === "sending" ? tx("Enviando…", "Sending…") : tx("Enviar sugerencia", "Send suggestion")}
                </button>
              </form>
            )}
          </div>
          </div>
        </div>
      )}
    </>
  );
}
