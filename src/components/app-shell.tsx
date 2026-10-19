"use client";
import { datasetLabel } from "@/lib/dataset-label";
import { useTx } from "@/lib/tx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Upload,
  Activity,
  LineChart,
  UserCheck,
  AlertTriangle,
  FileBarChart,
  Settings,
  Menu,
  ChevronRight,
  Database,
  BookOpen,
  Bell,
  Search,
  LogOut,
  X,
  Users,
  Clock,
  Gauge,
  LayoutTemplate,
  BarChart3,
  Layers,
  Timer,
  CalendarCheck,
  ShieldCheck,
  Phone,
  UserX,
  LogIn,
  Globe,
  ChevronDown,
  Check,
  Table2,
  Share2,
} from "lucide-react";
import { useWfmStore } from "@/lib/store";
import { APP_VERSION } from "@/lib/config";
import { ThemeToggle } from "./ui";
import { Logo } from "./logo";
import { useI18n } from "@/lib/i18n";
import type { ReactNode } from "react";
import { useEffect, useState, useRef } from "react";

const NAV_CONFIG = [
  { href: "/app/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, sectionKey: "nav.operations" },
  { href: "/app/intraday", labelKey: "nav.intraday", icon: Activity, sectionKey: "nav.operations" },
  { href: "/app/diagnostics", labelKey: "nav.diagnostics", icon: AlertTriangle, sectionKey: "nav.operations" },
  { href: "/app/staffing", labelKey: "nav.staffing", icon: Users, sectionKey: "nav.analytics" },
  { href: "/app/capacity", labelKey: "nav.capacity", icon: Layers, sectionKey: "nav.analytics" },
  { href: "/app/forecast", labelKey: "nav.forecast", icon: LineChart, sectionKey: "nav.analytics" },
  { href: "/app/service-level", labelKey: "nav.servicelevel", icon: Phone, sectionKey: "nav.analytics" },
  { href: "/app/occupancy", labelKey: "nav.occupancy", icon: Gauge, sectionKey: "nav.analytics" },
  { href: "/app/nlh", labelKey: "nav.nlh", icon: Timer, sectionKey: "nav.analytics" },
  { href: "/app/aux-report", labelKey: "nav.aux", icon: ShieldCheck, sectionKey: "nav.analytics" },
  { href: "/app/attendance", labelKey: "nav.attendance", icon: CalendarCheck, sectionKey: "nav.analytics" },
  { href: "/app/adherence", labelKey: "nav.adherence", icon: UserCheck, sectionKey: "nav.analytics" },
  { href: "/app/reports", labelKey: "nav.reports", icon: FileBarChart, sectionKey: "nav.analytics" },
  { href: "/app/studio", labelKey: "nav.studio", icon: LayoutTemplate, sectionKey: "nav.analytics" },
  { href: "/app/shared", labelKey: "nav.shared", icon: Share2, sectionKey: "nav.admin" },
  { href: "/app/import", labelKey: "nav.import", icon: Upload, sectionKey: "nav.data" },
  { href: "/app/explorer", labelKey: "nav.explorer", icon: Table2, sectionKey: "nav.data" },
  { href: "/app/data-health", labelKey: "nav.datahealth", icon: Database, sectionKey: "nav.data" },
  { href: "/app/settings", labelKey: "nav.settings", icon: Settings, sectionKey: "nav.admin" },
];

interface Notification {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
  href: string;
}

export function AppShell({ children }: { children: ReactNode }) {
  const tx = useTx();
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, toggleSidebar, datasetName, datasetIsDemo, dataHealth, orgName, userName, userEmail, userRole, intervals, loadDemoData, filters } = useWfmStore();
  const { t, locale } = useI18n();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([
    { id: "1", title: t("notif.n1_title"), desc: t("notif.n1_desc"), time: "hace 12 min", read: false, href: "/app/diagnostics" },
    { id: "2", title: t("notif.n2_title"), desc: t("notif.n2_desc"), time: "hace 34 min", read: false, href: "/app/forecast" },
    { id: "3", title: t("notif.n3_title"), desc: t("notif.n3_desc"), time: "hace 1 h", read: false, href: "/app/adherence" },
    { id: "4", title: t("notif.n4_title"), desc: t("notif.n4_desc"), time: "hace 2 h", read: true, href: "/app/data-health" },
  ]);

  // Keep translations fresh when locale changes
  useEffect(() => {
    setNotifications((prev) =>
      prev.map((n, i) => {
        const keys = [
          ["notif.n1_title", "notif.n1_desc"],
          ["notif.n2_title", "notif.n2_desc"],
          ["notif.n3_title", "notif.n3_desc"],
          ["notif.n4_title", "notif.n4_desc"],
        ];
        const k = keys[i];
        if (!k) return n;
        return { ...n, title: t(k[0]), desc: t(k[1]) };
      })
    );
  }, [locale, t]);

  // Demo data is loaded by DataRestore (after it checks for a saved dataset), not here.

  // Close mobile on route change
  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setNotifOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNotifOpen(false);
        setUserMenuOpen(false);
        setLogoutConfirm(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const markOneRead = (id: string) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const currentPage = NAV_CONFIG.find((n) => pathname === n.href || (n.href !== "/app/dashboard" && pathname?.startsWith(n.href)));

  // Search results
  const searchResults = (() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: Array<{ label: string; href: string; desc: string }> = [];
    // Search in NAV
    for (const n of NAV_CONFIG) {
      const label = t(n.labelKey);
      if (label.toLowerCase().includes(q)) {
        results.push({ label, href: n.href, desc: t(n.sectionKey) });
      }
    }
    // Search in intervals data
    if (intervals.length > 0) {
      const queues = Array.from(new Set(intervals.map((r) => r.queue).filter(Boolean) as string[]));
      for (const qu of queues) {
        if (qu.toLowerCase().includes(q)) {
          results.push({ label: qu, href: `/app/dashboard`, desc: "Queue · Dashboard" });
        }
      }
      const channels = Array.from(new Set(intervals.map((r) => r.channel).filter(Boolean) as string[]));
      for (const ch of channels) {
        if (ch.toLowerCase().includes(q)) {
          results.push({ label: ch, href: `/app/dashboard`, desc: "Channel · Dashboard" });
        }
      }
      // Interval search
      const intervalsLabels = Array.from(new Set(intervals.map((r) => r.intervalLabel)));
      for (const iv of intervalsLabels) {
        if (iv.includes(q)) {
          results.push({ label: `Interval ${iv}`, href: `/app/intraday`, desc: "Intraday interval" });
        }
      }
    }
    return results.slice(0, 8);
  })();

  const handleLogout = () => {
    setLogoutConfirm(false);
    setUserMenuOpen(false);
    // In MVP: just redirect to landing, keep data
    router.push("/");
  };

  // Group nav by section
  const sections = Array.from(new Set(NAV_CONFIG.map((n) => n.sectionKey)));

  const SidebarContent = (
    <>
      {/* Brand */}
      <div className="flex items-center gap-2.5 h-14 px-4 border-b border-[var(--border-subtle)] shrink-0">
        <Link href="/app/dashboard" className="flex items-center gap-2.5">
          <Logo size={32} />
        </Link>
        <button
          onClick={() => {
            if (typeof window !== "undefined" && window.innerWidth < 1024) setMobileOpen(false);
            else toggleSidebar();
          }}
          className="ml-auto btn btn-ghost !p-1.5 hidden lg:inline-flex"
          aria-label={tx("Mostrar u ocultar menú", "Toggle sidebar")}
        >
          <Menu className="h-4 w-4" />
        </button>
        {/* Mobile close */}
        <button onClick={() => setMobileOpen(false)} className="ml-auto btn btn-ghost !p-1.5 lg:hidden" aria-label={tx("Cerrar menú", "Close menu")}>
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Org label */}
      {(sidebarOpen || mobileOpen) && (
        <div className="px-3 py-2.5 border-b border-[var(--border-subtle)] shrink-0">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--bg-subtle)] text-xs">
            <div className="h-6 w-6 rounded-md bg-[var(--accent)] text-white flex items-center justify-center text-[10px] font-bold">
              {orgName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[var(--text-primary)] truncate">{orgName}</div>
              <div className="text-[10px] text-[var(--text-tertiary)] capitalize">{userRole}</div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {sections.map((sectionKey) => (
          <div key={sectionKey} className="mb-3">
            {(sidebarOpen || mobileOpen) && (
              <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-quaternary)]">
                {t(sectionKey)}
              </div>
            )}
            {NAV_CONFIG.filter((n) => n.sectionKey === sectionKey).map((item) => {
              const active = pathname === item.href || (item.href !== "/app/dashboard" && pathname?.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors mb-0.5",
                    active
                      ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  )}
                  title={!sidebarOpen && !mobileOpen ? t(item.labelKey) : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                  {(sidebarOpen || mobileOpen) && <span className="truncate text-[13px]">{t(item.labelKey)}</span>}
                  {active && (sidebarOpen || mobileOpen) && <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-60" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom: dataset status */}
      {(sidebarOpen || mobileOpen) && (
        <div className="border-t border-[var(--border-subtle)] p-3 shrink-0">
          <div className="rounded-lg bg-[var(--bg-subtle)] p-2.5">
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{t("common.dataset_active")}</div>
            </div>
            {datasetName ? (
              <>
                <div className="mt-1.5 text-xs font-medium text-[var(--text-primary)] truncate">{datasetLabel(datasetName, tx)}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  {datasetIsDemo ? (
                    <span className="chip chip-warning !text-[10px] !py-0.5 !px-1.5">{t("common.demo")}</span>
                  ) : (
                    <span className="chip chip-success !text-[10px] !py-0.5 !px-1.5">{t("common.production")}</span>
                  )}
                  {dataHealth && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {t("common.quality")} <strong className="text-[var(--text-primary)]">{dataHealth.score}</strong>
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-1.5 text-xs text-[var(--text-tertiary)]">
                {t("common.no_data")}
                <div className="mt-1">
                  <Link href="/app/import" className="text-[var(--accent-strong)] font-medium hover:underline text-[11px]">
                    {t("common.import_data")}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen bg-[var(--bg-canvas)]">
      {/* Desktop Sidebar */}
      <aside
        className={clsx(
          "hidden lg:flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0 sticky top-0 h-screen transition-all duration-200",
          sidebarOpen ? "w-64" : "w-[72px]"
        )}
      >
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 z-50 h-screen w-64 flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] lg:hidden animate-slide-in overflow-hidden">
            {SidebarContent}
          </aside>
        </>
      )}

      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar — sticky fixed */}
        <header className="sticky top-0 z-30 h-14 bg-[var(--bg-surface)]/90 backdrop-blur-md border-b border-[var(--border-subtle)] flex items-center gap-2 px-3 lg:px-6 shrink-0">
          {/* Mobile hamburger — now always visible on mobile */}
          <button
            onClick={() => setMobileOpen(true)}
            className="btn btn-ghost !p-2 lg:hidden"
            aria-label={tx("Abrir menú", "Open menu")}
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* Desktop toggle when collapsed */}
          {!sidebarOpen && (
            <button onClick={toggleSidebar} className="btn btn-ghost !p-2 hidden lg:inline-flex" aria-label="Expand sidebar">
              <Menu className="h-4 w-4" />
            </button>
          )}

          {/* Breadcrumb */}
          <div className="hidden md:flex items-center gap-1.5 text-sm min-w-0">
            <span className="text-[var(--text-quaternary)] truncate">{t("common.wfm_rescue")}</span>
            <ChevronRight className="h-3 w-3 text-[var(--text-quaternary)] shrink-0" />
            <span className="font-medium text-[var(--text-primary)] truncate">{currentPage ? t(currentPage.labelKey) : "Dashboard"}</span>
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative">
            {searchOpen ? (
              <div className="relative w-[280px] sm:w-[360px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-quaternary)]" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => {
                    // delay to allow click
                    setTimeout(() => {
                      if (!document.activeElement?.closest("[data-search-results]")) setSearchOpen(false);
                    }, 200);
                  }}
                  placeholder={t("common.search_placeholder")}
                  className="input pl-8 pr-8 py-1.5 text-sm w-full"
                />
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost !p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {/* Results dropdown */}
                {searchQuery.trim() && (
                  <div
                    data-search-results
                    className="absolute top-full mt-1.5 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-lg)] overflow-hidden z-50"
                  >
                    {searchResults.length > 0 ? (
                      <>
                        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                          {t("search.results_for")} “{searchQuery}”
                        </div>
                        <div className="max-h-72 overflow-y-auto">
                          {searchResults.map((r, i) => (
                            <Link
                              key={i}
                              href={r.href}
                              onClick={() => {
                                setSearchOpen(false);
                                setSearchQuery("");
                              }}
                              className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--bg-hover)] transition-colors"
                            >
                              <Search className="h-3.5 w-3.5 text-[var(--text-quaternary)] shrink-0" />
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-[var(--text-primary)] truncate">{r.label}</div>
                                <div className="text-xs text-[var(--text-tertiary)] truncate">{r.desc}</div>
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 text-[var(--text-quaternary)] ml-auto shrink-0" />
                            </Link>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="px-4 py-6 text-center">
                        <div className="text-sm font-medium text-[var(--text-primary)]">{t("search.no_match")}</div>
                        <div className="text-xs text-[var(--text-tertiary)] mt-1">{t("search.try_different")}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="btn btn-ghost !px-2.5 !py-1.5 text-xs text-[var(--text-tertiary)]"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden md:inline ml-1.5">{t("common.search")}</span>
                <kbd className="hidden md:inline ml-2 text-[10px] font-mono px-1 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">⌘K</kbd>
              </button>
            )}
          </div>

          {/* Docs */}
          <Link href="/docs" className="btn btn-ghost !p-2 hidden sm:inline-flex" title={t("common.docs")}>
            <BookOpen className="h-4 w-4" />
          </Link>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen((v) => !v);
                setUserMenuOpen(false);
              }}
              className="btn btn-ghost !p-2 relative"
              title={t("common.notifications")}
              aria-label={tx("Notificaciones", "Notifications")}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[var(--danger-solid)] ring-2 ring-[var(--bg-surface)]" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-[360px] max-w-[92vw] rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-xl)] overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
                  <div className="font-semibold text-sm">{t("notif.title")}</div>
                  <button onClick={markAllRead} className="text-xs font-medium text-[var(--accent-strong)] hover:underline">
                    {t("notif.mark_all_read")}
                  </button>
                </div>
                <div className="max-h-[380px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">{t("notif.empty")}</div>
                  ) : (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.href}
                        onClick={() => {
                          markOneRead(n.id);
                          setNotifOpen(false);
                        }}
                        className={clsx(
                          "flex gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border-subtle)] last:border-0",
                          !n.read && "bg-[var(--accent-soft)]/40"
                        )}
                      >
                        <div className={clsx("h-2 w-2 rounded-full mt-2 shrink-0", n.read ? "bg-transparent" : "bg-[var(--accent)]")} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[var(--text-primary)] leading-tight">{n.title}</div>
                          <div className="text-xs text-[var(--text-tertiary)] mt-1 leading-relaxed">{n.desc}</div>
                          <div className="text-[11px] text-[var(--text-quaternary)] mt-1.5">{n.time}</div>
                        </div>
                        {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] mt-2 shrink-0" />}
                      </Link>
                    ))
                  )}
                </div>
                <div className="px-4 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                  <Link href="/app/diagnostics" onClick={() => setNotifOpen(false)} className="text-xs font-medium text-[var(--accent-strong)] hover:underline">
                    {tx("Ver todos los diagnósticos →", "View all diagnostics →")}
                  </Link>
                </div>
              </div>
            )}
          </div>

          <ThemeToggle />

          <div className="h-6 w-px bg-[var(--border-subtle)] mx-1 hidden sm:block" />

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => {
                setUserMenuOpen((v) => !v);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0ea5a4] to-[#102a43] text-white flex items-center justify-center text-xs font-bold">
                {userName
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="hidden sm:block leading-tight text-left">
                <div className="text-xs font-semibold text-[var(--text-primary)]">{userName}</div>
                <div className="text-[10px] text-[var(--text-tertiary)]">{userEmail}</div>
              </div>
              <ChevronDown className={clsx("h-3.5 w-3.5 text-[var(--text-quaternary)] hidden sm:block transition-transform", userMenuOpen && "rotate-180")} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-xl)] overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{userName}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{userEmail}</div>
                  <div className="mt-1.5 inline-flex items-center gap-1.5">
                    <span className="chip chip-accent !text-[10px] !py-0.5">{userRole}</span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">{orgName}</span>
                  </div>
                </div>
                <div className="py-1.5">
                  <Link
                    href="/app/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  >
                    <Settings className="h-4 w-4" /> {t("user.settings")}
                  </Link>
                  <Link
                    href="/docs"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  >
                    <BookOpen className="h-4 w-4" /> {t("user.help")}
                  </Link>
                  <div className="my-1.5 border-t border-[var(--border-subtle)]" />
                  <button
                    onClick={() => setLogoutConfirm(true)}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                  >
                    <LogOut className="h-4 w-4" /> {t("common.logout")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Logout confirm modal */}
        {logoutConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setLogoutConfirm(false)} />
            <div className="relative w-full max-w-sm rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-[var(--shadow-xl)] p-6 animate-fade-in">
              <div className="h-10 w-10 rounded-xl bg-[var(--danger-bg)] flex items-center justify-center text-[var(--danger-text)] mb-4">
                <LogOut className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">{t("user.logout_confirm_title")}</h3>
              <p className="text-sm text-[var(--text-tertiary)] mt-1.5">{t("user.logout_confirm_desc")}</p>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setLogoutConfirm(false)} className="flex-1 btn btn-secondary">
                  {t("user.logout_confirm_no")}
                </button>
                <button onClick={handleLogout} className="flex-1 btn btn-danger">
                  {t("user.logout_confirm_yes")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Backdrop for dropdowns */}
        {(notifOpen || userMenuOpen) && (
          <div className="fixed inset-0 z-20" onClick={() => { setNotifOpen(false); setUserMenuOpen(false); }} />
        )}

        {/* Page content */}
        {/* Shown only when printing (Download > PDF): brand, organization, data source and date. */}
        <div className="print-only mb-4 flex items-end justify-between gap-4 border-b border-[var(--border-default)] pb-2 text-[11px] text-[var(--text-secondary)]">
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)]">WFM Rescue</div>
            <div>{orgName}</div>
          </div>
          <div className="text-right">
            <div>{datasetName}</div>
            {(() => {
              const parts: string[] = [];
              const add = (label: string, values: string[]) => { if (values.length) parts.push(`${label}: ${values.join(", ")}`); };
              add(tx("Colas", "Queues"), filters.queues);
              add(tx("Canales", "Channels"), filters.channels);
              add(tx("Sitios", "Sites"), filters.sites);
              add(tx("Skills", "Skills"), filters.skills);
              return <div>{tx("Filtros", "Filters")}: {parts.length ? parts.join(" · ") : tx("ninguno", "none")}</div>;
            })()}
            <div>{tx("Generado", "Generated")} {new Date().toLocaleDateString(locale === "es" ? "es-ES" : "en-US", { dateStyle: "medium" })}</div>
          </div>
        </div>
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto animate-fade-in">{children}</main>

        <footer className="px-6 py-4 text-[11px] text-[var(--text-quaternary)] border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div>
            © 2026 {t("common.wfm_rescue")}. {t("common.all_rights")} <Link href="/docs" className="text-[var(--accent-strong)] hover:underline">{t("common.view_definitions")}</Link>.
          </div>
          <div className="flex items-center gap-3">
            <span>{t("common.processed_in_browser")}</span>
            <span className="tabular-nums">v{APP_VERSION}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
