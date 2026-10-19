"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTx } from "@/lib/tx";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AuthCard, NotConfigured, translateAuthError } from "@/components/auth-card";

export default function LoginPage() {
  const tx = useTx();
  const router = useRouter();
  const { session, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(translateAuthError(err.message, tx));
    else router.push("/app/dashboard");
  };

  const signOut = async () => { await supabase?.auth.signOut(); };

  return (
    <AuthCard
      title={tx("Iniciar sesión", "Sign in")}
      subtitle={tx("Entra para guardar tu cuenta y acceder a Pro.", "Sign in to save your account and access Pro.")}
      footer={<>{tx("¿No tienes cuenta?", "No account yet?")} <Link href="/auth/signup" className="text-[var(--accent)] font-semibold">{tx("Crear cuenta", "Create account")}</Link></>}
    >
      {!configured && <NotConfigured />}
      {configured && session && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">{tx("Ya tienes sesión iniciada como", "You are already signed in as")} <strong>{session.user.email}</strong>.</p>
          <div className="flex gap-2">
            <Link href="/app/dashboard" className="btn btn-accent flex-1 justify-center">{tx("Ir al panel", "Go to dashboard")}</Link>
            <button type="button" onClick={signOut} className="btn btn-secondary">{tx("Cerrar sesión", "Sign out")}</button>
          </div>
        </div>
      )}
      {configured && !session && (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label" htmlFor="login-email">{tx("Correo", "Email")}</label>
            <input id="login-email" className="input w-full" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="login-password">{tx("Contraseña", "Password")}</label>
            <input id="login-password" className="input w-full" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-[var(--danger-solid,#dc2626)]">{error}</p>}
          <button type="submit" disabled={busy} className="btn btn-accent w-full justify-center">{busy ? tx("Entrando…", "Signing in…") : tx("Entrar", "Sign in")}</button>
          <div className="text-center">
            <Link href="/auth/forgot" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">{tx("Olvidé mi contraseña", "Forgot my password")}</Link>
          </div>
        </form>
      )}
    </AuthCard>
  );
}
