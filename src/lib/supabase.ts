import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Only NEXT_PUBLIC_* variables reach the browser in Next.js. The publishable key is safe to expose
// (access is controlled by Row Level Security). Never put a secret/service_role key here.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const authConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = authConfigured
  ? createClient(url as string, key as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
