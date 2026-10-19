"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, RotateCcw, X } from "lucide-react";
import { Card } from "@/components/ui";
import { useTx } from "@/lib/tx";
import { useWfmStore } from "@/lib/store";
import {
  ACTIVITY_LABEL,
  ACTIVITY_ORDER,
  BILLING_MODELS,
  billingBreakdown,
  defaultBilling,
  getModel,
  loadBilling,
  saveBilling,
  type ActivityKey,
  type BillingModelId,
  type BillingRules,
  type StoredBilling,
} from "@/lib/billing-models";

const fmtHours = (h: number) => h.toLocaleString("en-US", { maximumFractionDigits: 1 });
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

/** Settings card: current billing model, what it means for your hours, and the chooser. */
export function BillingModelSection() {
  const tx = useTx();
  const agentIntervals = useWfmStore((s) => s.agentIntervals);
  const [saved, setSaved] = useState<StoredBilling | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setSaved(loadBilling());
  }, []);

  const current = saved ?? defaultBilling();
  const model = getModel(current.model);
  const breakdown = useMemo(() => billingBreakdown(agentIntervals ?? [], current.rules), [agentIntervals, current.rules]);
  const hasDetail = (agentIntervals ?? []).length > 0 && breakdown.totalHours > 0;

  return (
    <Card title={tx("Modelo de facturación", "Billing model")} subtitle={tx("Define qué tiempo del agente se paga y qué se factura al cliente.", "Defines which agent time is paid and which is billed to the client.")}>
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-strong)]">{tx("Modelo actual", "Current model")}</div>
              <div className="mt-1 text-base font-semibold text-[var(--text-primary)]">{model.name[tx("es", "en") as "es" | "en"]}</div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{model.summary[tx("es", "en") as "es" | "en"]}</p>
              {current.edited && (
                <span className="chip mt-2 inline-flex text-[11px]">{tx("Reglas personalizadas", "Custom rules")}</span>
              )}
            </div>
            <button type="button" onClick={() => setOpen(true)} className="btn btn-accent shrink-0">
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              {tx("Elegir o editar", "Choose or edit")}
            </button>
          </div>
        </div>

        {hasDetail ? (
          <div className="space-y-2">
            <div className="text-sm text-[var(--text-secondary)]">
              {tx(
                `Con este modelo, ${pct(breakdown.unbilledShare)} de tus horas pagadas no se factura al cliente (${fmtHours(breakdown.unbilledPaidHours)} de ${fmtHours(breakdown.paidHours)} h).`,
                `With this model, ${pct(breakdown.unbilledShare)} of your paid hours are not billed to the client (${fmtHours(breakdown.unbilledPaidHours)} of ${fmtHours(breakdown.paidHours)} h).`,
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] text-left text-xs text-[var(--text-tertiary)]">
                    <th className="py-2 pr-3 font-semibold">{tx("Actividad", "Activity")}</th>
                    <th className="py-2 pr-3 text-right font-semibold">{tx("Horas en tus datos", "Hours in your data")}</th>
                    <th className="py-2 pr-3 font-semibold">{tx("Se paga al agente", "Paid to agent")}</th>
                    <th className="py-2 font-semibold">{tx("Se factura", "Billed")}</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.rows.map((row) => (
                    <tr key={row.key} className="border-b border-[var(--border-subtle)]">
                      <td className="py-2 pr-3 text-[var(--text-primary)]">{ACTIVITY_LABEL[row.key][tx("es", "en") as "es" | "en"]}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-[var(--text-primary)]">{fmtHours(row.hours)}</td>
                      <td className="py-2 pr-3"><YesNo value={row.paid} tx={tx} /></td>
                      <td className="py-2"><YesNo value={row.billed} tx={tx} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              {tx(
                "Cada intervalo de agente suma su duración. Las actividades se reconocen por su nombre en el archivo; las que no reconoce no se cuentan.",
                "Each agent interval adds its duration. Activities are recognized by their name in the file; unrecognized ones are not counted.",
              )}
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-tertiary)]">
            {tx(
              "Carga datos con detalle de agente (actividad por intervalo) para ver cuántas horas se pagan y no se facturan con este modelo.",
              "Load data with agent detail (activity per interval) to see how many paid hours are not billed under this model.",
            )}
          </p>
        )}
      </div>

      {open && (
        <BillingModelDialog
          initial={current}
          onClose={() => setOpen(false)}
          onSave={(value) => {
            saveBilling(value);
            setSaved(value);
            setOpen(false);
          }}
        />
      )}
    </Card>
  );
}

function YesNo({ value, tx }: { value: boolean; tx: (es: string, en: string) => string }) {
  return value ? (
    <span className="inline-flex items-center gap-1 text-[var(--success-solid)]"><Check className="h-3.5 w-3.5" aria-hidden="true" />{tx("Sí", "Yes")}</span>
  ) : (
    <span className="text-[var(--text-tertiary)]">{tx("No", "No")}</span>
  );
}

/** Pick one of the five models, read what is paid and billed, and edit the rules if needed. */
function BillingModelDialog({ initial, onClose, onSave }: { initial: StoredBilling; onClose: () => void; onSave: (v: StoredBilling) => void }) {
  const tx = useTx();
  const loc = tx("es", "en") as "es" | "en";
  const [selected, setSelected] = useState<BillingModelId>(initial.model);
  const [rules, setRules] = useState<BillingRules>(initial.rules);
  const [editing, setEditing] = useState(false);
  const model = getModel(selected);

  const pick = (id: BillingModelId) => {
    setSelected(id);
    setRules({ ...getModel(id).rules });
    setEditing(false);
  };

  const setRule = (key: ActivityKey, field: "paid" | "billed", value: boolean) => {
    setRules((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const edited = JSON.stringify(rules) !== JSON.stringify(model.rules);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="billing-title">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto card p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="billing-title" className="text-lg font-bold text-[var(--text-primary)]">{tx("Elige tu modelo de facturación", "Choose your billing model")}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{tx("Son los modelos más usados en contact centers y BPO. Puedes ajustar las reglas después.", "These are the models most used in contact centers and BPOs. You can adjust the rules afterwards.")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={tx("Cerrar", "Close")} className="btn btn-ghost !p-1.5"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {BILLING_MODELS.map((m) => {
            const active = m.id === selected;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={active}
                onClick={() => pick(m.id)}
                className={`rounded-lg border p-3 text-left transition ${active ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--accent)]"}`}
              >
                <div className="text-sm font-semibold text-[var(--text-primary)]">{m.name[loc]}</div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">{m.choose[loc]}</div>
              </button>
            );
          })}
        </div>

        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] p-4 space-y-3">
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">{tx("Qué se paga y qué se factura", "What is paid and what is billed")}</div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{model.summary[loc]}</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">{tx("Columna \"Se factura\": ", "\"Billed\" column: ")}{model.billedMeaning[loc]}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-left text-xs text-[var(--text-tertiary)]">
                  <th className="py-2 pr-3 font-semibold">{tx("Actividad", "Activity")}</th>
                  <th className="py-2 pr-3 font-semibold">{tx("Se paga al agente", "Paid to agent")}</th>
                  <th className="py-2 font-semibold">{tx("Se factura", "Billed")}</th>
                </tr>
              </thead>
              <tbody>
                {ACTIVITY_ORDER.map((key) => (
                  <tr key={key} className="border-b border-[var(--border-subtle)]">
                    <td className="py-2 pr-3 text-[var(--text-primary)]">{ACTIVITY_LABEL[key][loc]}</td>
                    <td className="py-2 pr-3">
                      {editing ? (
                        <Toggle checked={rules[key].paid} onChange={(v) => setRule(key, "paid", v)} label={`${ACTIVITY_LABEL[key][loc]} · ${tx("se paga", "paid")}`} tx={tx} />
                      ) : (
                        <YesNo value={rules[key].paid} tx={tx} />
                      )}
                    </td>
                    <td className="py-2">
                      {editing ? (
                        <Toggle checked={rules[key].billed} onChange={(v) => setRule(key, "billed", v)} label={`${ACTIVITY_LABEL[key][loc]} · ${tx("se factura", "billed")}`} tx={tx} />
                      ) : (
                        <YesNo value={rules[key].billed} tx={tx} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setEditing((v) => !v)} className="btn btn-secondary text-sm">
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              {editing ? tx("Terminar edición", "Done editing") : tx("Editar parámetros", "Edit parameters")}
            </button>
            {edited && (
              <button type="button" onClick={() => setRules({ ...model.rules })} className="btn btn-ghost text-sm">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                {tx("Restablecer valores del modelo", "Reset to model defaults")}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">{tx("Cancelar", "Cancel")}</button>
          <button
            type="button"
            onClick={() => onSave({ model: selected, rules, edited })}
            className="btn btn-accent"
          >
            {tx("Guardar elección", "Save choice")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, tx }: { checked: boolean; onChange: (v: boolean) => void; label: string; tx: (es: string, en: string) => string }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer">
      <input type="checkbox" className="h-4 w-4 accent-[var(--accent-solid)]" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span>{checked ? tx("Sí", "Yes") : tx("No", "No")}</span>
    </label>
  );
}
