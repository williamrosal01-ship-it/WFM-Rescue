"use client";

// Compartidos y equipo: enlaces activos, uso de editores del plan y cuentas de la organización.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Users, Link2, Ban } from "lucide-react";
import { SectionHeader, Card, Button, Chip, Callout, EmptyState } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useWfmStore } from "@/lib/store";
import { authConfigured } from "@/lib/supabase";
import {
  getSeats,
  isShareActive,
  listMembers,
  listShares,
  revokeShare,
  setMemberAccess,
  shareErrorMessage,
  shareUrl,
  ShareError,
  type MemberRow,
  type SeatInfo,
  type ShareRow,
} from "@/lib/share-api";
import { fmtDate } from "@/lib/formatters";

export default function SharedPage() {
  const { locale } = useI18n();
  const lang = locale === "es" ? "es" : "en";
  const t = (es: string, en: string) => (lang === "es" ? es : en);
  const { session, loading } = useAuth();
  const userRole = useWfmStore((s) => s.userRole);

  const [shares, setShares] = useState<ShareRow[] | null>(null);
  const [seats, setSeats] = useState<SeatInfo | null>(null);
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [membersHidden, setMembersHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const ROLE_LABEL: Record<string, string> = {
    wfm_analyst: t("Analista WFM", "WFM analyst"),
    wfm_supervisor: "Team leader",
    operations_manager: t("Gerente de operaciones", "Operations manager"),
    admin: "Admin",
  };
  const STATUS_LABEL: Record<string, string> = {
    active: t("Activa", "Active"),
    pending: t("Pendiente", "Pending"),
    suspended: t("Suspendida", "Suspended"),
  };

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [s, seat] = await Promise.all([listShares(), getSeats()]);
      setShares(s);
      setSeats(seat);
    } catch (e) {
      setError(e instanceof ShareError ? shareErrorMessage(e.code, lang) : t("No se pudo cargar.", "Could not load."));
    }
    try {
      setMembers(await listMembers());
      setMembersHidden(false);
    } catch (e) {
      // Solo admin y gerencia ven las cuentas. Para analistas la sección se oculta.
      setMembers(null);
      setMembersHidden(true);
      if (e instanceof ShareError && e.code !== "forbidden") setError(shareErrorMessage(e.code, lang));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    if (session) void refresh();
  }, [session, refresh]);

  const onRevoke = async (id: string) => {
    setError(null);
    setNotice(null);
    try {
      const ok = await revokeShare(id);
      setNotice(ok ? t("Enlace revocado.", "Link revoked.") : t("No se pudo revocar.", "Could not revoke."));
      await refresh();
    } catch (e) {
      setError(e instanceof ShareError ? shareErrorMessage(e.code, lang) : t("No se pudo revocar.", "Could not revoke."));
    }
  };

  const copyLink = async (token: string, id: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError(t("No se pudo copiar el enlace.", "Could not copy the link."));
    }
  };

  const changeMember = async (m: MemberRow, role: string, status: string) => {
    setError(null);
    setNotice(null);
    try {
      await setMemberAccess(m.member_id, role, status);
      setNotice(t("Cuenta actualizada.", "Account updated."));
      await refresh();
    } catch (e) {
      setError(e instanceof ShareError ? shareErrorMessage(e.code, lang) : t("No se pudo actualizar la cuenta.", "Could not update the account."));
      await refresh();
    }
  };

  if (!authConfigured) {
    return (
      <div>
        <SectionHeader title={t("Compartidos y equipo", "Shared and team")} description={t("Enlaces de informes y cuentas de la organización.", "Report links and organization accounts.")} />
        <Callout variant="info">{t("Esta función requiere la nube configurada en el despliegue.", "This feature requires the cloud to be configured in this deployment.")}</Callout>
      </div>
    );
  }

  if (!loading && !session) {
    return (
      <div>
        <SectionHeader title={t("Compartidos y equipo", "Shared and team")} description={t("Enlaces de informes y cuentas de la organización.", "Report links and organization accounts.")} />
        <Card>
          <EmptyState
            icon={<Link2 className="h-5 w-5" />}
            title={t("Inicia sesión para ver tus enlaces", "Sign in to see your links")}
            description={t("Los enlaces y las cuentas son de tu organización.", "Links and accounts belong to your organization.")}
            action={<Link href="/auth/login"><Button variant="accent">{t("Iniciar sesión", "Sign in")}</Button></Link>}
          />
        </Card>
      </div>
    );
  }

  const seatPct = seats && seats.seats_limit > 0 ? Math.min(1, seats.seats_used / seats.seats_limit) : 0;
  const isAdmin = userRole === "admin";

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t("Compartidos y equipo", "Shared and team")}
        description={t("Enlaces de informes, editores del plan y cuentas de la organización.", "Report links, plan editors and organization accounts.")}
        actions={<Button variant="secondary" size="sm" onClick={() => void refresh()}>{t("Actualizar", "Refresh")}</Button>}
      />

      {error ? <Callout variant="warning">{error}</Callout> : null}
      {notice ? <Callout variant="info">{notice}</Callout> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t("Editores del plan", "Plan editors")} subtitle={t("Cuentas activas de la organización", "Active accounts in the organization")} className="lg:col-span-1">
          {seats ? (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold tabular-nums">{seats.seats_used} <span className="text-base font-normal text-[var(--text-tertiary)]">/ {seats.seats_limit}</span></div>
                <Chip variant={seats.seats_used >= seats.seats_limit ? "danger" : "success"}>{seats.plan_name.toUpperCase()}</Chip>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]" aria-hidden="true">
                <div className="h-full rounded-full" style={{ width: `${seatPct * 100}%`, background: seatPct >= 1 ? "#f43f5e" : "#10b981" }} />
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">
                {t(
                  "Los viewers no cuentan: quien abre un enlace no necesita cuenta ni consume editor.",
                  "Viewers do not count: anyone who opens a link needs no account and uses no editor seat.",
                )}
              </p>
            </div>
          ) : (
            <div className="text-sm text-[var(--text-tertiary)]">{t("Cargando…", "Loading…")}</div>
          )}
        </Card>

        <Card title={t("Enlaces activos e historial", "Links and history")} subtitle={t("Lo que compartió tu organización", "What your organization shared")} className="lg:col-span-2">
          {shares === null ? (
            <div className="text-sm text-[var(--text-tertiary)]">{t("Cargando…", "Loading…")}</div>
          ) : shares.length === 0 ? (
            <EmptyState
              icon={<Link2 className="h-5 w-5" />}
              title={t("Aún no hay enlaces", "No links yet")}
              description={t("Abre un informe y pulsa Compartir.", "Open a report and press Share.")}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                    <th className="px-2 py-2 text-left">{t("Informe", "Report")}</th>
                    <th className="px-2 py-2 text-left">{t("Creado por", "Created by")}</th>
                    <th className="px-2 py-2 text-left">{t("Caduca", "Expires")}</th>
                    <th className="px-2 py-2 text-right">{t("Vistas", "Views")}</th>
                    <th className="px-2 py-2 text-left">{t("Estado", "Status")}</th>
                    <th className="px-2 py-2 text-right">{t("Acciones", "Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {shares.map((s) => {
                    const active = isShareActive(s);
                    const expired = !s.share_revoked_at && !active;
                    return (
                      <tr key={s.share_id} className="border-b border-[var(--border-subtle)] last:border-0">
                        <td className="px-2 py-2 font-medium text-[var(--text-primary)]">{s.share_title}</td>
                        <td className="px-2 py-2 text-[var(--text-secondary)]">{s.share_is_mine ? t("Tú", "You") : s.share_owner_name || "—"}</td>
                        <td className="px-2 py-2 tabular-nums text-[var(--text-secondary)]">{fmtDate(s.share_expires_at)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{s.share_views}</td>
                        <td className="px-2 py-2">
                          {s.share_revoked_at ? <Chip variant="danger">{t("Revocado", "Revoked")}</Chip> : expired ? <Chip variant="warning">{t("Caducado", "Expired")}</Chip> : <Chip variant="success">{t("Activo", "Active")}</Chip>}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex justify-end gap-1.5">
                            {active ? (
                              <>
                                <button type="button" onClick={() => void copyLink(s.share_token, s.share_id)} className="btn btn-secondary btn-sm">
                                  <Copy className="h-3 w-3" /> {copiedId === s.share_id ? t("Copiado", "Copied") : t("Copiar enlace", "Copy link")}
                                </button>
                                <button type="button" onClick={() => void onRevoke(s.share_id)} className="btn btn-ghost btn-sm text-[var(--danger-text)]">
                                  <Ban className="h-3 w-3" /> {t("Revocar", "Revoke")}
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {!membersHidden ? (
        <Card title={t("Cuentas y roles", "Accounts and roles")} subtitle={isAdmin ? t("Solo el admin cambia roles y accesos", "Only the admin changes roles and access") : t("Vista de gerencia", "Management view")}>
          {members === null ? (
            <div className="text-sm text-[var(--text-tertiary)]">{t("Cargando…", "Loading…")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                    <th className="px-2 py-2 text-left">{t("Nombre", "Name")}</th>
                    {isAdmin ? <th className="px-2 py-2 text-left">{t("Correo", "Email")}</th> : null}
                    <th className="px-2 py-2 text-left">{t("Rol", "Role")}</th>
                    <th className="px-2 py-2 text-left">{t("Acceso", "Access")}</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.member_id} className="border-b border-[var(--border-subtle)] last:border-0">
                      <td className="px-2 py-2 font-medium">{m.member_name || "—"}</td>
                      {isAdmin ? <td className="px-2 py-2 text-[var(--text-secondary)]">{m.member_email ?? "—"}</td> : null}
                      <td className="px-2 py-2">
                        {isAdmin ? (
                          <select className="input !w-auto !py-1 text-xs" value={m.member_role} onChange={(e) => void changeMember(m, e.target.value, m.member_status)}>
                            {Object.keys(ROLE_LABEL).map((r) => (
                              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                            ))}
                          </select>
                        ) : (
                          ROLE_LABEL[m.member_role] ?? m.member_role
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {isAdmin ? (
                          <select className="input !w-auto !py-1 text-xs" value={m.member_status} onChange={(e) => void changeMember(m, m.member_role, e.target.value)}>
                            {Object.keys(STATUS_LABEL).map((s) => (
                              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                            ))}
                          </select>
                        ) : (
                          STATUS_LABEL[m.member_status] ?? m.member_status
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <Users className="h-3.5 w-3.5" />
            {t("Activar una cuenta cuenta como editor. Si llegas al límite, pide un extra al plan.", "Activating an account counts as an editor. If you reach the limit, ask for an extra editor on the plan.")}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
