// Loaded cost per agent-hour (USD) used by Diagnostics to estimate the cost of gaps and overstaffing.
// It is an assumption typed by the user, stored in this browser only. It is NOT a price for the client
// (the billing model in billing-models.ts defines what is billed).
import { DEFAULT_LOADED_COST } from "./diagnostics";

const KEY = "wfm-loaded-cost";

export function loadLoadedCost(): number {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    const n = raw === null ? NaN : parseFloat(raw);
    return Number.isFinite(n) && n >= 1 && n <= 1000 ? n : DEFAULT_LOADED_COST;
  } catch {
    return DEFAULT_LOADED_COST;
  }
}

export function saveLoadedCost(value: number) {
  try {
    window.localStorage.setItem(KEY, String(value));
  } catch {
    /* private mode: value lasts for this page only */
  }
}
