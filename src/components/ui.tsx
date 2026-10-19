"use client";
import { useI18n } from "@/lib/i18n";
import { tl } from "@/lib/texts-en";
import { useTx } from "@/lib/tx";
import { type ReactNode, type ButtonHTMLAttributes, type SelectHTMLAttributes, type InputHTMLAttributes, type HTMLAttributes, useEffect } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  ChevronDown,
  Loader2,
} from "lucide-react";

// -------------------- Button --------------------
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}
export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  leadingIcon,
  trailingIcon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const variantClass = {
    primary: "btn-primary",
    accent: "btn-accent",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
    danger: "btn-danger",
  }[variant];
  const sizeClass = {
    sm: "text-xs px-2.5 py-1.5",
    md: "text-sm px-3.5 py-2",
    lg: "text-base px-4.5 py-2.5",
  }[size];
  return (
    <button
      className={clsx("btn", variantClass, sizeClass, className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}

// -------------------- Badge / Chip --------------------
type ChipVariant = "success" | "warning" | "danger" | "info" | "neutral" | "accent";
export function Chip({
  variant = "neutral",
  children,
  className,
}: {
  variant?: ChipVariant;
  children: ReactNode;
  className?: string;
}) {
  return <span className={clsx("chip", `chip-${variant}`, className)}>{children}</span>;
}

// -------------------- Severity badge for diagnostics --------------------
export function SeverityBadge({ severity }: { severity: "critical" | "high" | "medium" | "low" | "info" }) {
  const { locale } = useI18n();
  const map: Record<string, { label: string; cls: string; icon: ReactNode }> = {
    critical: { label: "Crítico", cls: "sev-critical", icon: <XCircle className="h-3 w-3" /> },
    high: { label: "Alto", cls: "sev-high", icon: <AlertTriangle className="h-3 w-3" /> },
    medium: { label: "Medio", cls: "sev-medium", icon: <AlertTriangle className="h-3 w-3" /> },
    low: { label: "Bajo", cls: "sev-low", icon: <Info className="h-3 w-3" /> },
    info: { label: "Info", cls: "sev-info", icon: <Info className="h-3 w-3" /> },
  };
  const m = map[severity];
  const label = tl(m.label, locale);
  return (
    <span className={clsx("chip border", m.cls)}>
      {m.icon}
      {label}
    </span>
  );
}

// -------------------- KPI Card --------------------
interface KpiCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  trend?: "good" | "bad" | "neutral";
  trendValue?: string;
  icon?: ReactNode;
  target?: ReactNode;
  tone?: "default" | "good" | "warn" | "bad" | "accent";
  className?: string;
}
export function KpiCard({ label, value, sub, trend, trendValue, icon, target, tone = "default", className }: KpiCardProps) {
  const tx = useTx();
  const toneBorder = {
    default: "",
    good: "border-l-[3px] border-l-[var(--success-solid)]",
    warn: "border-l-[3px] border-l-[var(--warning-solid)]",
    bad: "border-l-[3px] border-l-[var(--danger-solid)]",
    accent: "border-l-[3px] border-l-[var(--accent)]",
  }[tone];
  return (
    <div className={clsx("kpi-card animate-fade-in", toneBorder, className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="kpi-label">{label}</div>
        {icon && <div className="text-[var(--text-quaternary)]">{icon}</div>}
      </div>
      <div className="kpi-value mt-1.5">{value}</div>
      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="kpi-sub">{sub}</div>
        {trendValue && (
          <span
            className={clsx(
              "text-xs font-medium",
              trend === "good" && "delta-good",
              trend === "bad" && "delta-bad",
              trend === "neutral" && "delta-neutral",
            )}
          >
            {trendValue}
          </span>
        )}
      </div>
      {target && <div className="kpi-sub mt-0.5">{tx("Objetivo", "Target")}: {target}</div>}
    </div>
  );
}

// -------------------- Card --------------------
export function Card({
  title,
  subtitle,
  action,
  children,
  className,
  padded = true,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={clsx("card", className)}>
      {(title || action) && (
        <header
          className={clsx(
            "flex items-start justify-between gap-4 border-b border-[var(--border-subtle)]",
            padded ? "px-5 py-3.5" : "px-4 py-3",
          )}
        >
          <div>
            {title && <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>}
            {subtitle && <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

// -------------------- Input / Select / Textarea --------------------
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx("input", className)} {...rest} />;
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={clsx("input appearance-none pr-8", className)}
        style={{ backgroundImage: "none" }}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-quaternary)]" />
    </div>
  );
}

// -------------------- Status callout --------------------
interface CalloutProps {
  title?: string;
  children: ReactNode;
  variant?: "success" | "warning" | "danger" | "info";
  className?: string;
}
export function Callout({ title, children, variant = "info", className }: CalloutProps) {
  const styles = {
    success: { bg: "var(--success-bg)", border: "var(--success-border)", text: "var(--success-text)" },
    warning: { bg: "var(--warning-bg)", border: "var(--warning-border)", text: "var(--warning-text)" },
    danger: { bg: "var(--danger-bg)", border: "var(--danger-border)", text: "var(--danger-text)" },
    info: { bg: "var(--info-bg)", border: "var(--info-border)", text: "var(--info-text)" },
  }[variant];
  const Icon = variant === "success" ? CheckCircle2 : variant === "danger" ? XCircle : variant === "warning" ? AlertTriangle : Info;
  return (
    <div
      className={clsx("flex gap-3 rounded-xl border p-3.5 text-sm", className)}
      style={{ background: styles.bg, borderColor: styles.border, color: styles.text }}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="min-w-0">
        {title && <div className="font-semibold mb-0.5">{title}</div>}
        <div className="opacity-95 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

// -------------------- Empty state --------------------
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="h-12 w-12 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-quaternary)] mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      {description && <p className="text-sm text-[var(--text-tertiary)] mt-1.5 max-w-md">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// -------------------- Theme toggle (client) --------------------
export function ThemeToggle() {
  useEffect(() => {
    const saved = localStorage.getItem("wfm-theme") as "light" | "dark" | null;
    const theme = saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  }, []);
  const tx = useTx();
  const toggle = () => {
    const current = document.documentElement.getAttribute("data-theme") ?? "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("wfm-theme", next);
  };
  return (
    <button
      onClick={toggle}
      className="btn btn-ghost !px-2 !py-1.5"
      aria-label={tx("Cambiar tema", "Toggle theme")}
      title={tx("Cambiar tema", "Toggle theme")}
    >
      <span className="dark:hidden">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
      </span>
      <span className="hidden dark:inline">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
      </span>
    </button>
  );
}

// -------------------- Section header --------------------
export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-5", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-[1.625rem] font-bold text-[var(--text-primary)] tracking-tight break-words">{title}</h1>
        {description && <p className="text-sm text-[var(--text-tertiary)] mt-0.5 max-w-2xl break-words">{description}</p>}
      </div>
      {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 sm:justify-end [&>*]:max-w-full [&_a]:whitespace-nowrap [&_button]:whitespace-nowrap">{actions}</div>}
    </div>
  );
}

// -------------------- Data health score ring --------------------
export function HealthScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = score >= 85 ? "var(--success-solid)" : score >= 65 ? "var(--warning-solid)" : "var(--danger-solid)";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: "var(--border-subtle)" }} strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold" style={{ color }}>
        {score}
      </div>
    </div>
  );
}

// -------------------- Divider --------------------
export function Divider({ className, ...rest }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={clsx("border-0 border-t border-[var(--border-subtle)]", className)} {...rest} />;
}
