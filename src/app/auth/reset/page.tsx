"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTx } from "@/lib/tx";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AuthCard, NotConfigured, translateAuthError } from "@/components/auth-card";

export default function ResetPage() {
  const tx = useTx();
  const router = useRouter();
  const { session, loading, configured } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) setError(translateAuthError(err.message, tx));
    else { setDone(true); setTimeout(() => router.push("/app/dashboard"), 1500); }
  };

  return (
    <AuthCard title={tx("Nueva contraseña", "New password")}>
      {!configured && <NotConfigured />}
      {configured && done && <p className="text-sm text-[var(--text-secondary)]">{tx("Contraseña actualizada. Entrando…", "Password updated. Signing in…")}</p>}
      {configured && !done && loading && <p className="text-sm text-[var(--text-tertiary)]">{tx("Verificando enlace…", "Checking link…")}</p>}
      {configured && !done && !loading && !session && (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-[var(--danger-solid,#dc2626)]">{error ?? tx("Abre el enlace del correo desde este mismo navegador.", "Open the link from the email in this same browser.")}</p>
          <Link href="/auth/forgot" className="btn btn-accent w-full justify-center">{tx("Pedir un enlace nuevo", "Request a new link")}</Link>
        </div>
      )}
      {configured && !done && !loading && session && (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label" htmlFor="reset-password">{tx("Nueva contraseña (mínimo 6 caracteres)", "New password (at least 6 characters)")}</label>
            <input id="reset-password" className="input w-full" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-[var(--danger-solid,#dc2626)]">{error}</p>}
          <button type="submit" disabled={busy} className="btn btn-accent w-full justify-center">{busy ? tx("Guardando…", "Saving…") : tx("Guardar contraseña", "Save password")}</button>
        </form>
      )}
    </AuthCard>
  );
}
