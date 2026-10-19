"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useTx } from "@/lib/tx";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AuthCard, NotConfigured, translateAuthError } from "@/components/auth-card";

export default function ForgotPage() {
  const tx = useTx();
  const { configured } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/reset` });
    setBusy(false);
    if (err) setError(translateAuthError(err.message, tx));
    else setSent(true);
  };

  return (
    <AuthCard
      title={tx("Recuperar contraseña", "Reset password")}
      footer={<Link href="/auth/login" className="text-[var(--accent)] font-semibold">{tx("Volver a iniciar sesión", "Back to sign in")}</Link>}
    >
      {!configured && <NotConfigured />}
      {configured && sent && <p className="text-sm text-[var(--text-secondary)]">{tx("Si el correo existe, te enviamos un enlace para cambiar tu contraseña.", "If the email exists, we sent you a link to change your password.")}</p>}
      {configured && !sent && (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label" htmlFor="forgot-email">{tx("Correo", "Email")}</label>
            <input id="forgot-email" className="input w-full" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-[var(--danger-solid,#dc2626)]">{error}</p>}
          <button type="submit" disabled={busy} className="btn btn-accent w-full justify-center">{busy ? tx("Enviando…", "Sending…") : tx("Enviar enlace", "Send link")}</button>
        </form>
      )}
    </AuthCard>
  );
}
