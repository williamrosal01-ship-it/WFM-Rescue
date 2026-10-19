// Billing models used in contact-center / BPO contracts, and the editable rules behind them.
// A rule answers two questions per activity: is the agent PAID for it, and is it BILLED to the client
// (or included in the fee, depending on the model). Defaults come from each model; the user can edit them.
import type { AgentIntervalRecord } from "./types";

export type Bilingual = { es: string; en: string };

export type ActivityKey =
  | "productive"
  | "breaks"
  | "lunch"
  | "training"
  | "coaching"
  | "meetings"
  | "absence"
  | "aux";

export type ActivityRule = { paid: boolean; billed: boolean };
export type BillingRules = Record<ActivityKey, ActivityRule>;

export type BillingModelId = "hourly_productive" | "hourly_paid" | "fte_dedicated" | "per_contact" | "hybrid_sla";

export const ACTIVITY_ORDER: ActivityKey[] = ["productive", "breaks", "lunch", "training", "coaching", "meetings", "absence", "aux"];

export const ACTIVITY_LABEL: Record<ActivityKey, Bilingual> = {
  productive: { es: "Atención (productivo)", en: "Handling (productive)" },
  breaks: { es: "Pausas cortas", en: "Short breaks" },
  lunch: { es: "Almuerzo", en: "Lunch" },
  training: { es: "Capacitación", en: "Training" },
  coaching: { es: "Coaching", en: "Coaching" },
  meetings: { es: "Reuniones", en: "Meetings" },
  absence: { es: "Ausencias (vacaciones, incapacidad)", en: "Absence (PTO, sick leave)" },
  aux: { es: "AUX no productivo en turno", en: "Non-productive AUX on shift" },
};

export type ModelDef = {
  id: BillingModelId;
  name: Bilingual;
  /** One line shown on the option card. */
  choose: Bilingual;
  /** Short explanation of what is paid and billed. */
  summary: Bilingual;
  /** What "billed" means for this model (the billed column is read with this note). */
  billedMeaning: Bilingual;
  rules: BillingRules;
};

const r = (paid: boolean, billed: boolean): ActivityRule => ({ paid, billed });

export const BILLING_MODELS: ModelDef[] = [
  {
    id: "hourly_productive",
    name: { es: "Por hora productiva", en: "Per productive hour" },
    choose: { es: "Cobras solo las horas en que el agente atiende.", en: "You bill only the hours agents handle contacts." },
    summary: {
      es: "El agente se paga todo su turno, pero al cliente solo se le factura el tiempo productivo. Pausas, capacitación, coaching y reuniones son costo tuyo.",
      en: "Agents are paid their full shift, but the client is billed only productive time. Breaks, training, coaching and meetings are your cost.",
    },
    billedMeaning: { es: "Se factura al cliente por hora", en: "Billed to the client per hour" },
    rules: {
      productive: r(true, true),
      breaks: r(true, false),
      lunch: r(false, false),
      training: r(true, false),
      coaching: r(true, false),
      meetings: r(true, false),
      absence: r(true, false),
      aux: r(true, false),
    },
  },
  {
    id: "hourly_paid",
    name: { es: "Por hora pagada (todo el turno)", en: "Per paid hour (full shift)" },
    choose: { es: "Cobras cada hora pagada del agente, incluidas pausas y capacitación.", en: "You bill every paid hour, including breaks and training." },
    summary: {
      es: "Se factura todo el tiempo pagado del agente: pausas pagadas, capacitación, coaching y reuniones. El almuerzo no pagado y las ausencias no se cobran.",
      en: "All paid agent time is billed: paid breaks, training, coaching and meetings. Unpaid lunch and absences are not billed.",
    },
    billedMeaning: { es: "Se factura al cliente por hora", en: "Billed to the client per hour" },
    rules: {
      productive: r(true, true),
      breaks: r(true, true),
      lunch: r(false, false),
      training: r(true, true),
      coaching: r(true, true),
      meetings: r(true, true),
      absence: r(true, false),
      aux: r(true, true),
    },
  },
  {
    id: "fte_dedicated",
    name: { es: "FTE dedicado (tarifa mensual fija)", en: "Dedicated FTE (fixed monthly rate)" },
    choose: { es: "Pagas una tarifa mensual fija por cada agente dedicado.", en: "You pay a fixed monthly rate per dedicated agent." },
    summary: {
      es: "La tarifa mensual cubre el tiempo de trabajo del agente, incluidos pausas, capacitación y coaching. Las ausencias las absorbe el proveedor. Si el volumen baja, el costo fijo sigue igual.",
      en: "The monthly rate covers the agent's working time, including breaks, training and coaching. The provider absorbs absences. If volume drops, the fixed cost stays the same.",
    },
    billedMeaning: { es: "Incluido en la tarifa mensual", en: "Included in the monthly rate" },
    rules: {
      productive: r(true, true),
      breaks: r(true, true),
      lunch: r(false, false),
      training: r(true, true),
      coaching: r(true, true),
      meetings: r(true, true),
      absence: r(true, false),
      aux: r(true, true),
    },
  },
  {
    id: "per_contact",
    name: { es: "Por contacto atendido", en: "Per contact handled" },
    choose: { es: "Cobras por cada llamada, chat o ticket resuelto.", en: "You bill per call, chat or ticket handled." },
    summary: {
      es: "El cobro depende del volumen atendido, no de las horas. Pausas, capacitación, coaching y reuniones no se facturan, aunque sí se pagan al agente.",
      en: "Billing depends on handled volume, not hours. Breaks, training, coaching and meetings are not billed, although the agent is paid for them.",
    },
    billedMeaning: { es: "Se factura por contacto (el tiempo no se cobra)", en: "Billed per contact (time is not billed)" },
    rules: {
      productive: r(true, true),
      breaks: r(true, false),
      lunch: r(false, false),
      training: r(true, false),
      coaching: r(true, false),
      meetings: r(true, false),
      absence: r(false, false),
      aux: r(true, false),
    },
  },
  {
    id: "hybrid_sla",
    name: { es: "Híbrido: base fija + bono o penalidad por SLA", en: "Hybrid: fixed base + SLA bonus or penalty" },
    choose: { es: "Base mensual fija más un bono o penalidad según el nivel de servicio.", en: "Fixed monthly base plus a bonus or penalty based on service level." },
    summary: {
      es: "La base cubre la dotación como en el FTE dedicado. Una parte del pago depende del cumplimiento de SLA o CSAT: si lo cumples recibes bono, si no, penalidad. Las reglas de horas son las del FTE.",
      en: "The base covers headcount as in dedicated FTE. Part of the payment depends on meeting SLA or CSAT: a bonus if you meet it, a penalty if you do not. Hour rules follow the FTE model.",
    },
    billedMeaning: { es: "Incluido en la base; el bono o penalidad va aparte", en: "Included in the base; bonus or penalty is separate" },
    rules: {
      productive: r(true, true),
      breaks: r(true, true),
      lunch: r(false, false),
      training: r(true, true),
      coaching: r(true, true),
      meetings: r(true, true),
      absence: r(true, false),
      aux: r(true, true),
    },
  },
];

export const DEFAULT_BILLING_MODEL: BillingModelId = "hourly_productive";
const STORAGE_KEY = "wfm-billing-model";

export function getModel(id: BillingModelId): ModelDef {
  return BILLING_MODELS.find((m) => m.id === id) ?? BILLING_MODELS[0];
}

export type StoredBilling = { model: BillingModelId; rules: BillingRules; edited: boolean };

export function defaultBilling(): StoredBilling {
  return { model: DEFAULT_BILLING_MODEL, rules: { ...getModel(DEFAULT_BILLING_MODEL).rules }, edited: false };
}

/** Reads the saved choice. Invalid or missing data falls back to the default model. */
export function loadBilling(): StoredBilling {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return defaultBilling();
    const parsed = JSON.parse(raw) as Partial<StoredBilling>;
    const model = BILLING_MODELS.some((m) => m.id === parsed.model) ? (parsed.model as BillingModelId) : DEFAULT_BILLING_MODEL;
    const rules = { ...getModel(model).rules, ...(parsed.rules ?? {}) } as BillingRules;
    return { model, rules, edited: Boolean(parsed.edited) };
  } catch {
    return defaultBilling();
  }
}

export function saveBilling(value: StoredBilling) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* private mode: the choice lasts for this page only */
  }
}

/** Maps one agent-interval record to a billing activity (or null if it is not paid time). */
export function classifyActivity(rec: AgentIntervalRecord): ActivityKey | null {
  const text = (rec.actualActivity || rec.scheduledActivity || "").toLowerCase();
  if (/off.?shift|fuera de turno|no programado/.test(text)) return null;
  if (/lunch|almuerzo|meal/.test(text)) return "lunch";
  if (/break|pausa/.test(text)) return "breaks";
  if (/train|capacit/.test(text)) return "training";
  if (/coach/.test(text)) return "coaching";
  if (/meet|reuni/.test(text)) return "meetings";
  if (/pto|vacac|absen|ausen|sick|enfermed|day off|incapac|leave/.test(text)) return "absence";
  if (rec.auxCode || /aux|off.?phone|not ready|no productivo/.test(text)) return "aux";
  if (rec.isActualProduction || /production|product|atenci|handling|talk/.test(text)) return "productive";
  return null;
}

export type BreakdownRow = { key: ActivityKey; hours: number; paid: boolean; billed: boolean };
export type Breakdown = {
  rows: BreakdownRow[];
  totalHours: number;
  paidHours: number;
  billedHours: number;
  /** Paid hours that the client does not pay for under the current rules. */
  unbilledPaidHours: number;
  /** unbilledPaidHours / paidHours, 0..1 */
  unbilledShare: number;
};

/** Hours per activity from the loaded agent data, classified with the current rules. */
export function billingBreakdown(records: AgentIntervalRecord[], rules: BillingRules): Breakdown {
  const hours: Record<ActivityKey, number> = { productive: 0, breaks: 0, lunch: 0, training: 0, coaching: 0, meetings: 0, absence: 0, aux: 0 };
  for (const rec of records) {
    const key = classifyActivity(rec);
    if (!key) continue;
    const start = rec.intervalStart instanceof Date ? rec.intervalStart.getTime() : NaN;
    const end = rec.intervalEnd instanceof Date ? rec.intervalEnd.getTime() : NaN;
    const h = Number.isFinite(start) && Number.isFinite(end) && end > start ? (end - start) / 3_600_000 : 0.25;
    hours[key] += h;
  }
  const rows = ACTIVITY_ORDER.map((key) => ({ key, hours: hours[key], paid: rules[key].paid, billed: rules[key].billed }));
  const totalHours = rows.reduce((a, x) => a + x.hours, 0);
  const paidHours = rows.filter((x) => x.paid).reduce((a, x) => a + x.hours, 0);
  const billedHours = rows.filter((x) => x.billed).reduce((a, x) => a + x.hours, 0);
  const unbilledPaidHours = rows.filter((x) => x.paid && !x.billed).reduce((a, x) => a + x.hours, 0);
  return {
    rows,
    totalHours,
    paidHours,
    billedHours,
    unbilledPaidHours,
    unbilledShare: paidHours > 0 ? unbilledPaidHours / paidHours : 0,
  };
}
