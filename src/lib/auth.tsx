"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, authConfigured } from "@/lib/supabase";

type AuthState = { session: Session | null; loading: boolean; configured: boolean };
const AuthContext = createContext<AuthState>({ session: null, loading: false, configured: false });

/** Session state for the whole app. The /app pages stay open (demo); accounts unlock Pro later. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(authConfigured);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) { setSession(data.session); setLoading(false); }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return <AuthContext.Provider value={{ session, loading, configured: authConfigured }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
