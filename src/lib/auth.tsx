"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, authConfigured } from "@/lib/supabase";
import { useWfmStore } from "@/lib/store";

type AuthState = { session: Session | null; loading: boolean; configured: boolean };
const AuthContext = createContext<AuthState>({ session: null, loading: false, configured: false });

/** Identity shown in the app shell when nobody is signed in (the open demo). */
const DEMO_IDENTITY = {
  orgName: "WFM Rescue Demo",
  userEmail: "demo@wfmrescue.app",
  userName: "Alex Manager",
  userRole: "manager" as const,
};

/** Database role (profiles.role) -> role label used by the app shell. */
const ROLE_MAP: Record<string, "analyst" | "manager" | "admin"> = {
  wfm_analyst: "analyst",
  wfm_supervisor: "manager",
  operations_manager: "manager",
  admin: "admin",
};

type ProfileRow = {
  full_name: string | null;
  role: string | null;
  organizations: { name: string } | { name: string }[] | null;
};

/**
 * Copies the signed-in account into the app shell (name, organization, role).
 * The data itself stays in this browser; the account only supplies identity and role.
 */
async function syncAccount(session: Session | null) {
  if (!session || !supabase) {
    useWfmStore.setState({ ...DEMO_IDENTITY, orgPlan: "demo" });
    return;
  }
  const email = session.user.email ?? "";
  const meta = (session.user.user_metadata ?? {}) as { full_name?: string; workspace_name?: string };
  let profile: ProfileRow | null = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, role, organizations(name)")
      .eq("id", session.user.id)
      .maybeSingle();
    profile = (data as ProfileRow | null) ?? null;
  } catch {
    profile = null;
  }
  const org = Array.isArray(profile?.organizations) ? profile?.organizations[0] : profile?.organizations;
  // Plan real de la organización. Si la función falla o no hay fila, queda en demo.
  let orgPlan: "demo" | "pro" = "demo";
  try {
    const { data } = await supabase.rpc("get_org_seats");
    const row = (Array.isArray(data) ? data[0] : data) as { plan_name?: string } | null;
    if (row?.plan_name === "pro") orgPlan = "pro";
  } catch {
    orgPlan = "demo";
  }
  useWfmStore.setState({
    orgPlan,
    userEmail: email,
    userName: profile?.full_name || meta.full_name || email.split("@")[0],
    orgName: org?.name || meta.workspace_name || email.split("@")[0],
    userRole: ROLE_MAP[profile?.role ?? ""] ?? "analyst",
  });
}

/** Session state for the whole app. The /app pages stay open (demo); accounts unlock Pro later. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(authConfigured);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
      void syncAccount(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      void syncAccount(s);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ session, loading, configured: authConfigured }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
