// Cliente de los informes compartidos. Todo pasa por funciones SQL (RPC) con la clave publishable.
// La tabla no es accesible directamente. Ver supabase/002_informes_compartidos.sql.
import { supabase } from "./supabase";
import type { Lang, ReportSnapshot } from "./report-snapshot";

export type ShareRow = {
  share_id: string;
  share_title: string;
  share_token: string;
  share_created_at: string;
  share_expires_at: string;
  share_revoked_at: string | null;
  share_views: number;
  share_owner_name: string;
  share_is_mine: boolean;
};

export type SeatInfo = { seats_used: number; seats_limit: number; plan_name: string };

export type MemberRow = {
  member_id: string;
  member_name: string;
  member_email: string | null;
  member_role: string;
  member_status: string;
};

export type SharedView = { title: string; created_at: string; expires_at: string; payload: ReportSnapshot };

export const MANAGER_ROLES = ["wfm_supervisor", "operations_manager", "admin"] as const;

export class ShareError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

/** Convierte el código que devuelve Postgres en un mensaje que se muestra al usuario. */
export function shareErrorMessage(code: string, lang: Lang): string {
  const es: Record<string, string> = {
    not_authenticated: "Inicia sesión para compartir.",
    no_organization: "Tu cuenta aún no tiene acceso activo a una organización. Pide al administrador que la active.",
    invalid_expiry: "La caducidad debe estar entre 1 hora y 365 días.",
    share_limit_reached: "Ya tienes muchos enlaces activos en la organización. Revoca algunos para crear más.",
    shared_reports_payload_check: "El informe es demasiado grande para compartir. Usa filtros para reducirlo.",
    seat_limit_reached: "Se alcanzó el límite de editores de tu plan. Pide un editor adicional o libera una cuenta.",
    forbidden: "Tu rol no permite esta acción.",
    cannot_demote_self: "No puedes quitarte el rol de admin ni suspender tu propia cuenta.",
    invalid_role: "Rol no válido.",
    not_in_organization: "Esa cuenta no pertenece a tu organización.",
  };
  const en: Record<string, string> = {
    not_authenticated: "Sign in to share.",
    no_organization: "Your account does not have active access to an organization yet. Ask the administrator to activate it.",
    invalid_expiry: "Expiry must be between 1 hour and 365 days.",
    share_limit_reached: "Your organization has too many active links. Revoke some to create more.",
    shared_reports_payload_check: "The report is too large to share. Use filters to reduce it.",
    seat_limit_reached: "Your plan's editor limit is reached. Ask for an extra editor or free up an account.",
    forbidden: "Your role does not allow this action.",
    cannot_demote_self: "You cannot remove your own admin role or suspend your own account.",
    invalid_role: "Invalid role.",
    not_in_organization: "That account does not belong to your organization.",
  };
  const table = lang === "es" ? es : en;
  return table[code] ?? (lang === "es" ? "No se pudo completar la acción. Intenta de nuevo." : "The action could not be completed. Try again.");
}

function toCode(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  for (const code of Object.keys(shareErrorMessageKeys)) {
    if (m.includes(code)) return code;
  }
  return "unknown";
}
const shareErrorMessageKeys: Record<string, true> = {
  not_authenticated: true,
  no_organization: true,
  invalid_expiry: true,
  share_limit_reached: true,
  shared_reports_payload_check: true,
  seat_limit_reached: true,
  forbidden: true,
  cannot_demote_self: true,
  invalid_role: true,
  not_in_organization: true,
};

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new ShareError("not_configured");
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new ShareError(toCode(error.message));
  return data as T;
}

export const shareUrl = (token: string) =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/r/${token}`;

export async function createShare(title: string, payload: ReportSnapshot, expiresAt: Date) {
  const rows = await rpc<Array<{ share_id: string; share_token: string; share_expires_at: string }>>("create_shared_report", {
    p_title: title,
    p_payload: payload,
    p_expires_at: expiresAt.toISOString(),
  });
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row) throw new ShareError("unknown");
  return { id: row.share_id, token: row.share_token, expiresAt: row.share_expires_at };
}

export const listShares = () => rpc<ShareRow[]>("list_shared_reports", {});
export const revokeShare = (id: string) => rpc<boolean>("revoke_shared_report", { p_share_id: id });
export async function getSeats(): Promise<SeatInfo> {
  const rows = await rpc<SeatInfo[]>("get_org_seats", {});
  return (Array.isArray(rows) ? rows[0] : rows) as SeatInfo;
}
export const listMembers = () => rpc<MemberRow[]>("list_org_members", {});
export const setMemberAccess = (memberId: string, role: string, status: string) =>
  rpc<boolean>("set_member_access", { p_member: memberId, p_role: role, p_status: status });

/** Lo llama la página pública. Funciona sin sesión. */
export async function fetchShared(token: string): Promise<SharedView | null> {
  if (!supabase) throw new ShareError("not_configured");
  const { data, error } = await supabase.rpc("get_shared_report", { p_token: token });
  if (error) throw new ShareError(toCode(error.message));
  return (data as SharedView | null) ?? null;
}

export function isShareActive(row: Pick<ShareRow, "share_revoked_at" | "share_expires_at">, now = new Date()) {
  return !row.share_revoked_at && new Date(row.share_expires_at).getTime() > now.getTime();
}
