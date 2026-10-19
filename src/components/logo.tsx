"use client";
import clsx from "clsx";
import { useTx } from "@/lib/tx";

export function Logo({ size = 32, showWordmark = true, className }: { size?: number; showWordmark?: boolean; className?: string }) {
  const tx = useTx();
  return (
    <div className={clsx("flex items-center gap-2.5", className)}>
      <div
        className="rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, #0f2742 0%, #1a4d5c 45%, #0ea5a4 100%)",
        }}
      >
        {/* Lucide "gauge" icon */}
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m12 14 4-4" />
          <path d="M3.34 19a10 10 0 1 1 17.32 0" />
        </svg>
      </div>
      {showWordmark && (
        <div className="min-w-0">
          <div className="text-[13px] font-bold tracking-tight text-[var(--text-primary)] leading-none">
            WFM <span className="text-[var(--accent)]">Rescue</span>
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)] mt-[2px] leading-none font-medium tracking-wide">{tx("Analítica de operaciones", "Operations analytics")}</div>
        </div>
      )}
    </div>
  );
}

export function LogoCompact({ size = 28 }: { size?: number }) {
  return <Logo size={size} showWordmark={false} />;
}
