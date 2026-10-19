"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Locale = "es" | "en";

type Dict = Record<string, string>;

const dictionaries: Record<Locale, Dict> = {
  es: {
    // Nav
    "nav.operations": "Operación",
    "nav.analytics": "Analítica",
    "nav.data": "Datos",
    "nav.admin": "Administración",
    "nav.dashboard": "Dashboard",
    "nav.intraday": "Intraday",
    "nav.diagnostics": "Diagnósticos",
    "nav.forecast": "Pronóstico vs Real",
    "nav.adherence": "Adherencia & AUX",
    "nav.reports": "Tabla de informes",
    "nav.shared": "Compartidos",
    "nav.studio": "Estudio de informes",
    "nav.staffing": "Staffing",
    "nav.capacity": "Capacidad",
    "nav.nlh": "NLH",
    "nav.aux": "AUX Detalle",
    "nav.attendance": "Asistencia",
    "nav.occupancy": "Ocupación",
    "nav.servicelevel": "Service Level",
    "nav.import": "Importar datos",
    "nav.explorer": "Explorador de datos",
    "nav.datahealth": "Calidad de datos",
    "nav.settings": "Configuración",

    // Common
    "common.wfm_rescue": "WFM Rescue",
    "common.operations_analytics": "Operations analytics",
    "common.dataset_active": "Conjunto de datos activo",
    "common.no_data": "No hay datos cargados.",
    "common.import_data": "Importar datos →",
    "common.demo": "DEMO",
    "common.production": "PRODUCCIÓN",
    "common.quality": "Calidad:",
    "common.search_placeholder": "Buscar cola, agente, intervalo…",
    "common.search": "Buscar…",
    "common.docs": "Documentación",
    "common.notifications": "Notificaciones",
    "common.logout": "Salir",
    "common.all_rights": "Todos los cálculos son transparentes.",
    "common.view_definitions": "Ver definiciones",
    "common.processed_in_browser": "Datos procesados y guardados en tu navegador; no se envían a un servidor.",
    "common.loading": "Cargando…",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
    "common.edit": "Editar",
    "common.export": "Exportar",
    "common.filter": "Filtrar",
    "common.clear_filters": "Limpiar filtros",
    "common.demo_btn": "Demo",
    "common.clear": "Limpiar",
    "common.visible_intervals": "intervalos visibles",
    "common.completeness": "Completitud:",
    "common.range": "Rango:",
    "common.no_results": "Sin resultados.",
    "common.coming_soon": "Próximamente",

    // Dashboard
    "dashboard.title": "Dashboard operativo",
    "dashboard.desc": "Vista consolidada del día. Todos los KPIs se calculan con las fórmulas documentadas y responden a los filtros.",
    "dashboard.intraday_view": "Vista intradía",
    "dashboard.view_diagnostics": "Ver diagnósticos",
    "dashboard.kpi_sl": "Service Level",
    "dashboard.kpi_volume": "Volumen (ofrecido)",
    "dashboard.kpi_aht": "AHT ponderado",
    "dashboard.kpi_occupancy": "Ocupación",
    "dashboard.kpi_staffing_gap": "Staffing gap (suma)",
    "dashboard.kpi_forecast_acc": "Precisión del pronóstico",
    "dashboard.chart_volume_staffing": "Volumen y dotación por intervalo",
    "dashboard.chart_volume_staffing_sub": "Agregado en 15-min. Barras = volumen ofrecido; líneas = agentes.",
    "dashboard.chart_sl": "Service Level por intervalo",
    "dashboard.chart_sl_sub": "Línea punteada = objetivo 80%",
    "dashboard.table_by_queue": "Desempeño por cola",
    "dashboard.table_by_queue_sub": "Agregado por cola para todos los filtros activos",
    "dashboard.summary": "Resumen del día",
    "dashboard.summary_sub": "Indicadores de salud operativa",

    // Intraday
    "intraday.title": "Intraday",
    "intraday.desc": "Monitoreo intervalo a intervalo. Se priorizan los intervalos con mayor impacto operativo, no solo los que tienen peor SL.",
    "intraday.no_data_title": "No hay datos para visualizar",
    "intraday.no_data_desc": "Carga datos demo o importa un archivo CSV/XLSX para comenzar el monitoreo intradía.",

    // Diagnostics
    "diagnostics.title": "Diagnóstico operativo",
    "diagnostics.desc": "No mostramos solo métricas. Identificamos problemas concretos, cuantificamos el impacto y recomendamos acciones priorizadas.",

    // Forecast
    "forecast.title": "Pronóstico vs Real",
    "forecast.desc": "Precisión por WAPE (error porcentual absoluto ponderado) y sesgo direccional. Identifica si tu pronóstico sobreestima o subestima, y en qué intervalos.",

    // Settings
    "settings.title": "Configuración",
    "settings.desc": "Preferencias de la organización, parámetros de cálculo y perfiles de importación.",
    "settings.language": "Idioma",
    "settings.language_desc": "Selecciona el idioma de la interfaz. Más idiomas estarán disponibles próximamente.",
    "settings.language_es": "Español",
    "settings.language_en": "English",
    "settings.appearance": "Apariencia",
    "settings.appearance_desc": "Tema claro u oscuro. Se guarda automáticamente.",
    "settings.appearance_light": "Claro",
    "settings.appearance_dark": "Oscuro",
    "settings.org": "Organización",
    "settings.org_sub": "Identificador usado en reportes y exports",
    "settings.wfm_params": "Parámetros WFM",
    "settings.wfm_params_sub": "Estos valores alimentan Erlang-C, SL y cálculos de impacto económico",
    "settings.profiles": "Perfiles de importación",
    "settings.profiles_sub": "Mapeos de columnas reutilizables por proveedor",
    "settings.demo_mode": "Modo demo",
    "settings.demo_mode_desc": "Este espacio es de un solo usuario. Los datos que cargues se guardan solo en este navegador (IndexedDB) y no se envían a un servidor; limpiar los datos del sitio en el navegador los borra. Las cuentas con varios usuarios y permisos por rol no están incluidas en este plan.",

    // Notifications
    "notif.title": "Notificaciones",
    "notif.mark_all_read": "Marcar todo como leído",
    "notif.empty": "No tienes notificaciones nuevas.",
    "notif.n1_title": "SL por debajo de 80% en Billing",
    "notif.n1_desc": "10:30–12:00 · Déficit de 3.4 h-agente detectado. Requiere atención inmediata.",
    "notif.n2_title": "Forecast subestima volumen real",
    "notif.n2_desc": "WAPE 18.2% en pico matutino. Considera un repronóstico intradía.",
    "notif.n3_title": "Adherencia baja en Lima",
    "notif.n3_desc": "88% vs objetivo 94%. Revisar AUX no productivo.",
    "notif.n4_title": "Calidad de datos: puntaje 78",
    "notif.n4_desc": "2 advertencias detectadas en la última importación.",

    // User menu
    "user.profile": "Perfil",
    "user.settings": "Configuración",
    "user.help": "Ayuda y documentación",
    "user.logout_confirm_title": "¿Cerrar sesión?",
    "user.logout_confirm_desc": "Saldrás del workspace actual. Tus datos demo permanecerán hasta que limpies el conjunto de datos.",
    "user.logout_confirm_yes": "Sí, cerrar sesión",
    "user.logout_confirm_no": "Cancelar",

    // Staffing
    "staffing.title": "Staffing",
    "staffing.desc": "Análisis de dotación: requerido vs programado vs presente. Identifica brechas por intervalo y cola con impacto económico.",

    // Capacity
    "capacity.title": "Capacidad",
    "capacity.desc": "Planificación de capacidad y FTE. Convierte volumen y AHT en requerimientos de personal con y sin shrinkage.",

    // NLH
    "nlh.title": "NLH — Horas netas de trabajo",
    "nlh.desc": "Horas netas productivas vs pagadas. Mide eficiencia real de tu operación por intervalo, cola y sitio.",

    // AUX
    "aux.title": "AUX — Análisis Detallado",
    "aux.desc": "Desglose de tiempo no-productivo por código AUX. Detecta excesos, compara planificado vs no-planificado.",

    // Attendance
    "attendance.title": "Asistencia",
    "attendance.desc": "Tasa de asistencia, ausentismo y tardanzas. Impacto directo en tu capacidad disponible.",

    // Occupancy
    "occupancy.title": "Ocupación",
    "occupancy.desc": "Utilización de agentes en tiempo productivo. Equilibrio entre eficiencia y riesgo de agotamiento.",

    // Service Level
    "sl.title": "Service Level — Deep Dive",
    "sl.desc": "Análisis profundo de nivel de servicio por intervalo, cola y umbral. Identifica patrones de degradación.",

    // Search
    "search.results_for": "Resultados para",
    "search.no_match": "Sin coincidencias.",
    "search.try_different": "Prueba con otro término: nombre de cola, canal o intervalo (ej. 10:30).",
  },
  en: {
    // Nav
    "nav.operations": "Operations",
    "nav.analytics": "Analytics",
    "nav.data": "Data",
    "nav.admin": "Admin",
    "nav.dashboard": "Dashboard",
    "nav.intraday": "Intraday",
    "nav.diagnostics": "Diagnostics",
    "nav.forecast": "Forecast vs Actual",
    "nav.adherence": "Adherence & AUX",
    "nav.reports": "Report table",
    "nav.shared": "Shared",
    "nav.studio": "Report Studio",
    "nav.staffing": "Staffing",
    "nav.capacity": "Capacity",
    "nav.nlh": "NLH",
    "nav.aux": "AUX Detail",
    "nav.attendance": "Attendance",
    "nav.occupancy": "Occupancy",
    "nav.servicelevel": "Service Level",
    "nav.import": "Import Data",
    "nav.explorer": "Data Explorer",
    "nav.datahealth": "Data Health",
    "nav.settings": "Settings",

    // Common
    "common.wfm_rescue": "WFM Rescue",
    "common.operations_analytics": "Operations analytics",
    "common.dataset_active": "Active dataset",
    "common.no_data": "No data loaded.",
    "common.import_data": "Import data →",
    "common.demo": "DEMO",
    "common.production": "PRODUCTION",
    "common.quality": "Quality:",
    "common.search_placeholder": "Search queue, agent, interval…",
    "common.search": "Search…",
    "common.docs": "Documentation",
    "common.notifications": "Notifications",
    "common.logout": "Sign out",
    "common.all_rights": "100% transparent calculations.",
    "common.view_definitions": "View definitions",
    "common.processed_in_browser": "Data is processed and stored in your browser; it is not sent to a server.",
    "common.loading": "Loading…",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.export": "Export",
    "common.filter": "Filter",
    "common.clear_filters": "Clear filters",
    "common.demo_btn": "Demo",
    "common.clear": "Clear",
    "common.visible_intervals": "visible intervals",
    "common.completeness": "Completeness:",
    "common.range": "Range:",
    "common.no_results": "No results.",
    "common.coming_soon": "Coming soon",

    // Dashboard
    "dashboard.title": "Operations Dashboard",
    "dashboard.desc": "Consolidated daily view. All KPIs use documented formulas and respond to filters.",
    "dashboard.intraday_view": "Intraday view",
    "dashboard.view_diagnostics": "View diagnostics",
    "dashboard.kpi_sl": "Service Level",
    "dashboard.kpi_volume": "Volume (offered)",
    "dashboard.kpi_aht": "Weighted AHT",
    "dashboard.kpi_occupancy": "Occupancy",
    "dashboard.kpi_staffing_gap": "Staffing gap (total)",
    "dashboard.kpi_forecast_acc": "Forecast accuracy",
    "dashboard.chart_volume_staffing": "Volume & staffing by interval",
    "dashboard.chart_volume_staffing_sub": "15-min aggregate. Bars = offered volume; lines = agents.",
    "dashboard.chart_sl": "Service Level by interval",
    "dashboard.chart_sl_sub": "Dashed line = 80% target",
    "dashboard.table_by_queue": "Performance by queue",
    "dashboard.table_by_queue_sub": "Aggregated by queue for all active filters",
    "dashboard.summary": "Daily summary",
    "dashboard.summary_sub": "Operational health indicators",

    // Intraday
    "intraday.title": "Intraday",
    "intraday.desc": "Interval-by-interval monitoring. We prioritize intervals with the highest operational impact, not just the worst SL.",
    "intraday.no_data_title": "No data to display",
    "intraday.no_data_desc": "Load demo data or import a CSV/XLSX file to start intraday monitoring.",

    // Diagnostics
    "diagnostics.title": "Operations Diagnostics",
    "diagnostics.desc": "We don't just show metrics. We identify specific issues, quantify impact, and recommend prioritized actions.",

    // Forecast
    "forecast.title": "Forecast vs Actual",
    "forecast.desc": "Accuracy via WAPE (Weighted Absolute Percentage Error) and directional bias. See if your forecast over- or under-estimates, and where.",

    // Settings
    "settings.title": "Settings",
    "settings.desc": "Organization preferences, calculation parameters and import profiles.",
    "settings.language": "Language",
    "settings.language_desc": "Select the interface language. More languages coming soon.",
    "settings.language_es": "Español",
    "settings.language_en": "English",
    "settings.appearance": "Appearance",
    "settings.appearance_desc": "Light or dark theme. Saved automatically.",
    "settings.appearance_light": "Light",
    "settings.appearance_dark": "Dark",
    "settings.org": "Organization",
    "settings.org_sub": "Identifier used in reports and exports",
    "settings.wfm_params": "WFM Parameters",
    "settings.wfm_params_sub": "These values feed Erlang-C, SL and economic impact calculations",
    "settings.profiles": "Import profiles",
    "settings.profiles_sub": "Reusable column mappings by vendor",
    "settings.demo_mode": "Demo mode",
    "settings.demo_mode_desc": "This workspace is single-user. Data you upload is stored only in this browser (IndexedDB) and is not sent to a server; clearing site data in the browser deletes it. Multi-user accounts with role-based permissions are not included in this plan.",

    // Notifications
    "notif.title": "Notifications",
    "notif.mark_all_read": "Mark all as read",
    "notif.empty": "You have no new notifications.",
    "notif.n1_title": "SL below 80% in Billing",
    "notif.n1_desc": "10:30–12:00 · 3.4 agent-hour deficit detected. Immediate attention required.",
    "notif.n2_title": "Forecast underestimates actual volume",
    "notif.n2_desc": "WAPE 18.2% in morning peak. Consider intraday reforecast.",
    "notif.n3_title": "Low adherence in Lima",
    "notif.n3_desc": "88% vs 94% target. Review non-productive AUX.",
    "notif.n4_title": "Data Health: score 78",
    "notif.n4_desc": "2 warnings detected in last import.",

    // User menu
    "user.profile": "Profile",
    "user.settings": "Settings",
    "user.help": "Help & documentation",
    "user.logout_confirm_title": "Sign out?",
    "user.logout_confirm_desc": "You'll leave the current workspace. Your demo data will remain until you clear the dataset.",
    "user.logout_confirm_yes": "Yes, sign out",
    "user.logout_confirm_no": "Cancel",

    // Staffing
    "staffing.title": "Staffing",
    "staffing.desc": "Staffing analysis: required vs scheduled vs actual. Identify gaps by interval and queue with economic impact.",

    // Capacity
    "capacity.title": "Capacity",
    "capacity.desc": "Capacity planning and FTE. Convert volume and AHT into staffing requirements with and without shrinkage.",

    // NLH
    "nlh.title": "NLH — Net Labor Hours",
    "nlh.desc": "Net productive hours vs paid hours. Measure real operational efficiency by interval, queue and site.",

    // AUX
    "aux.title": "AUX — Detailed Analysis",
    "aux.desc": "Breakdown of non-productive time by AUX code. Detect excesses, compare planned vs unplanned.",

    // Attendance
    "attendance.title": "Attendance",
    "attendance.desc": "Attendance rate, absenteeism and tardiness. Direct impact on your available capacity.",

    // Occupancy
    "occupancy.title": "Occupancy",
    "occupancy.desc": "Agent utilization in productive time. Balance between efficiency and burnout risk.",

    // Service Level
    "sl.title": "Service Level — Deep Dive",
    "sl.desc": "In-depth service level analysis by interval, queue and threshold. Identify degradation patterns.",

    // Search
    "search.results_for": "Results for",
    "search.no_match": "No matches.",
    "search.try_different": "Try a different term: queue name, channel or interval (e.g., 10:30).",
  },
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "es",
  setLocale: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es");

  useEffect(() => {
    const saved = localStorage.getItem("wfm-locale") as Locale | null;
    if (saved && (saved === "es" || saved === "en")) {
      setLocaleState(saved);
    } else {
      const browser = navigator.language.toLowerCase();
      if (browser.startsWith("en")) setLocaleState("en");
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("wfm-locale", l);
    document.documentElement.lang = l;
  };

  const t = (key: string): string => {
    return dictionaries[locale][key] ?? dictionaries["es"][key] ?? key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT() {
  const { t } = useContext(I18nContext);
  return t;
}
