export const fmtPct = (v: number | null | undefined, digits = 1): string => {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
};

export const fmtInt = (v: number | null | undefined): string => {
  if (v == null || Number.isNaN(v)) return "—";
  return Math.round(v).toLocaleString("en-US");
};

export const fmtSec = (v: number | null | undefined, digits = 0): string => {
  if (v == null || Number.isNaN(v)) return "—";
  const total = Math.round(v);
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m < 60) return s > 0 && digits > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
};

export const fmtMin = (v: number | null | undefined): string => {
  if (v == null || Number.isNaN(v)) return "—";
  return `${Math.round(v)}m`;
};

export const fmtNum = (v: number | null | undefined, digits = 1): string => {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toLocaleString("en-US", {
    minimumFractionDigits: digits > 0 ? digits : 0,
    maximumFractionDigits: digits,
  });
};

export const fmtCurrency = (v: number | null | undefined, currency = "USD"): string => {
  if (v == null || Number.isNaN(v)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `$${Math.round(v).toLocaleString()}`;
  }
};

export const fmtDate = (d: Date | string | null | undefined): string => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const fmtTime = (d: Date | string | null | undefined): string => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const fmtDateTime = (d: Date | string | null | undefined): string => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const fmtIntervalLabel = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const truncate = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
