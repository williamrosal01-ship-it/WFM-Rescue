"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useTx } from "@/lib/tx";
import { Logo } from "@/components/logo";

/** Shared layout for the account screens (login, sign up, forgot and reset password). */
export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  const tx = useTx();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[var(--bg-canvas)]">
      <Link href="/" className="mb-6 inline-flex"><Logo size={40} /></Link>
      <div className="w-full max-w-md card p-6">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>}
        <div className="mt-5">{children}</div>
        {footer && <div className="mt-5 text-sm text-[var(--text-secondary)] text-center">{footer}</div>}
      </div>
      <p className="mt-6 text-xs text-[var(--text-tertiary)]">
        <Link href="/app/dashboard" className="hover:text-[var(--text-primary)]">{tx("Entrar a la demo sin cuenta →", "Enter the demo without an account →")}</Link>
      </p>
    </div>
  );
}

export function NotConfigured() {
  const tx = useTx();
  return (
    <p className="text-sm text-[var(--warning-solid,#b45309)]">
      {tx("Las cuentas no están configuradas en este despliegue (faltan variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). La demo sigue disponible.", "Accounts are not configured in this deployment (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are missing). The demo is still available.")}
    </p>
  );
}

export function translateAuthError(message: string, tx: (es: string, en: string) => string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return tx("Correo o contraseña incorrectos.", "Incorrect email or password.");
  if (m.includes("not confirmed")) return tx("Confirma tu correo antes de entrar. Revisa tu bandeja.", "Confirm your email before signing in. Check your inbox.");
  if (m.includes("already registered") || m.includes("already been registered")) return tx("Ese correo ya tiene una cuenta.", "That email already has an account.");
  if (m.includes("password should be at least") || m.includes("least 6")) return tx("La contraseña debe tener al menos 6 caracteres.", "Password must be at least 6 characters.");
  if (m.includes("rate limit") || m.includes("too many")) return tx("Demasiados intentos. Espera unos minutos.", "Too many attempts. Wait a few minutes.");
  if (m.includes("expired") || m.includes("invalid") && m.includes("token")) return tx("El enlace venció o ya se usó. Pide uno nuevo.", "The link expired or was already used. Request a new one.");
  return tx("No se pudo completar la acción. Intenta de nuevo.", "The action could not be completed. Please try again.");
}
