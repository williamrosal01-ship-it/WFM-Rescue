"use client";
import {
  ResponsiveContainer,
  Tooltip as RTooltip,
  Legend as RLegend,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";

// Re-export for convenience
export { ResponsiveContainer, RTooltip as Tooltip, RLegend as Legend, CartesianGrid, XAxis, YAxis, ReferenceLine };

// Shared tooltip style
export const tooltipStyle = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-default)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--text-primary)",
  boxShadow: "var(--shadow-md)",
};

// Shared grid
export const gridProps = {
  strokeDasharray: "3 3",
  stroke: "var(--border-subtle)",
  vertical: false,
} as const;

// Axis tick
export const tickStyle = { fontSize: 10, fill: "var(--text-quaternary)" };

// Gradient definitions for attractive charts
export function ChartGradients() {
  return (
    <defs>
      <linearGradient id="gradTeal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.9} />
        <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.15} />
      </linearGradient>
      <linearGradient id="gradNavy" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" style={{ stopColor: "var(--c-actual)" }} stopOpacity={0.85} />
        <stop offset="100%" style={{ stopColor: "var(--c-actual)" }} stopOpacity={0.1} />
      </linearGradient>
      <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.1} />
      </linearGradient>
      <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.15} />
      </linearGradient>
      <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
        <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
      </linearGradient>
      <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.85} />
        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.1} />
      </linearGradient>
      <linearGradient id="areaTeal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.35} />
        <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="areaNavy" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" style={{ stopColor: "var(--c-actual)" }} stopOpacity={0.2} />
        <stop offset="100%" style={{ stopColor: "var(--c-actual)" }} stopOpacity={0} />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
      </filter>
    </defs>
  );
}

// Simple Gauge component for attendance, occupancy, etc.
export function GaugeChart({
  value,
  max = 1,
  label,
  sublabel,
  size = 160,
  thickness = 16,
  thresholds = { good: 0.85, warn: 0.7 },
}: {
  value: number | null;
  max?: number;
  label: string;
  sublabel?: string;
  size?: number;
  thickness?: number;
  thresholds?: { good: number; warn: number };
}) {
  const pct = value == null ? 0 : Math.max(0, Math.min(1, value / max));
  const r = (size - thickness) / 2 - 2;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const h = cy + thickness + 14;

  // Threshold color (bright tones that read well on both light and dark surfaces)
  const color = value == null ? "#94a3b8" : value >= thresholds.good ? "#10b981" : value >= thresholds.warn ? "#f59e0b" : "#f43f5e";

  const pt = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  // Arc from 180deg (left) clockwise over the top to 360deg (right)
  const arc = (fromDeg: number, toDeg: number) => {
    const s0 = pt(fromDeg);
    const e0 = pt(toDeg);
    const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
    return `M ${s0.x.toFixed(2)} ${s0.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e0.x.toFixed(2)} ${e0.y.toFixed(2)}`;
  };

  const track = arc(180, 360);
  const valueArc = value != null && pct > 0 ? arc(180, 180 + pct * 180) : "";
  const trackColor = "color-mix(in srgb, var(--text-tertiary) 30%, transparent)";

  return (
    <div className="flex flex-col items-center" style={{ width: size }} role="img" aria-label={`${label}: ${value == null ? "—" : `${Math.round(value * 100)}%`}`}>
      <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} overflow="visible">
        <path d={track} fill="none" stroke={trackColor} strokeWidth={thickness} strokeLinecap="round" />
        {valueArc && <path d={valueArc} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round" />}
        <text x={cx - r} y={cy + thickness + 8} textAnchor="middle" fontSize={11} fill="var(--text-tertiary)">0%</text>
        <text x={cx + r} y={cy + thickness + 8} textAnchor="middle" fontSize={11} fill="var(--text-tertiary)">{Math.round(max * 100)}%</text>
      </svg>
      <div className="text-center mt-1">
        <div className="text-3xl font-bold tabular-nums tracking-tight" style={{ color }}>
          {value == null ? "—" : `${Math.round(value * 100)}%`}
        </div>
        <div className="text-sm font-semibold text-[var(--text-primary)] mt-1">{label}</div>
        {sublabel && <div className="text-xs text-[var(--text-secondary)] mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
}

// Donut with center label
export function DonutCenterLabel({ value, label, size = 120 }: { value: string; label: string; size?: number }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</div>
    </div>
  );
}
