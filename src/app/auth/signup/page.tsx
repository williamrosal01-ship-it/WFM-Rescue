"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useTx } from "@/lib/tx";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AuthCard, NotConfigured, translateAuthError } from "@/components/auth-card";

export default function SignupPage() {
  const tx = useTx();
  const { configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(null);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app/account`,
        data: { full_name: fullName.trim(), workspace_name: workspace.trim() },
      },
    });
    setBusy(false);
    if (err) setError(translateAuthError(err.message, tx));
    else if (data.session) window.location.href = "/app/account";
    else setSent(true);
  };

  return (
    <AuthCard
      title={tx("Crear cuenta", "Create account")}
      subtitle={tx("Tus datos se quedan en tu navegador; la cuenta solo guarda tu acceso.", "Your data stays in your browser; the account only stores your access.")}
      footer={<>{tx("¿Ya tienes cuenta?", "Already have an account?")} <Link href="/auth/login" className="text-[var(--accent)] font-semibold">{tx("Iniciar sesión", "Sign in")}</Link></>}
    >
      {!configured && <NotConfigured />}
      {configured && sent && (
        <p className="text-sm text-[var(--text-secondary)]">{tx("Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego entra con tu contraseña.", "We sent you an email to confirm your account. Open it, then sign in with your password.")}</p>
      )}
      {configured && !sent && (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label" htmlFor="signup-name">{tx("Tu nombre (opcional)", "Your name (optional)")}</label>
            <input id="signup-name" className="input w-full" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="signup-workspace">{tx("Empresa o equipo (opcional)", "Company or team (optional)")}</label>
            <input id="signup-workspace" className="input w-full" autoComplete="organization" value={workspace} onChange={(e) => setWorkspace(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="signup-email">{tx("Correo", "Email")}</label>
            <input id="signup-email" className="input w-full" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="signup-password">{tx("Contraseña (mínimo 6 caracteres)", "Password (at least 6 characters)")}</label>
            <input id="signup-password" className="input w-full" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-[var(--danger-solid,#dc2626)]">{error}</p>}
          <button type="submit" disabled={busy} className="btn btn-accent w-full justify-center">{busy ? tx("Creando…", "Creating…") : tx("Crear cuenta", "Create account")}</button>
        </form>
      )}
    </AuthCard>
  );
}
