"use client";
import { useTx } from "@/lib/tx";
import { SectionHeader, Card, Button, Input, Select, Callout } from "@/components/ui";
import { Save, Plus, Trash2, Database, Copy, Key, Globe, Moon, Sun, Languages } from "lucide-react";
import Link from "next/link";
import { loadProfiles, deleteProfile, duplicateProfile, makeSourceLabels, type ImportProfile } from "@/lib/import-profiles";
import { useState, useEffect } from "react";
import { useI18n, type Locale } from "@/lib/i18n";
import { CURRENT_PLAN } from "@/lib/config";
import { BackupCard } from "@/components/backup-card";
import { BillingModelSection } from "@/components/billing-model-section";
import { loadLoadedCost, saveLoadedCost } from "@/lib/cost-settings";

export default function SettingsPage() {
  const tx = useTx();
  const { t, locale, setLocale } = useI18n();
  const [orgName, setOrgName] = useState("WFM Rescue Demo");
  const [slTarget, setSlTarget] = useState(80);
  const [slThreshold, setSlThreshold] = useState(20);
  const [shrinkage, setShrinkage] = useState(32);
  const [loadedCost, setLoadedCost] = useState(28);
  useEffect(() => { setLoadedCost(loadLoadedCost()); }, []);
  const [intervalMin, setIntervalMin] = useState(15);
  const [saved, setSaved] = useState(false);
  const [profiles, setProfiles] = useState<ImportProfile[]>([]);
  useEffect(() => { setProfiles(loadProfiles()); }, []);
  const refreshProfiles = () => setProfiles(loadProfiles());
  const sourceLabel = (t: string) => makeSourceLabels(tx)[t as keyof ReturnType<typeof makeSourceLabels>] ?? t;

  const handleSave = () => {
    saveLoadedCost(loadedCost);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") as "light" | "dark" | null;
    if (current) setTheme(current);
  }, []);
  const toggleTheme = (newTheme: "light" | "dark") => {
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("wfm-theme", newTheme);
    setTheme(newTheme);
  };

  return (
    <div>
      <SectionHeader
        title={t("settings.title")}
        description={t("settings.desc")}
        actions={
          <Button variant="accent" size="sm" onClick={handleSave}>
            <Save className="h-3.5 w-3.5" /> {saved ? (locale === "es" ? "¡Guardado!" : "Saved!") : locale === "es" ? "Guardar cambios" : "Save changes"}
          </Button>
        }
      />

      <Callout variant="info" title={t("settings.demo_mode")} className="mb-4">
        {t("settings.demo_mode_desc")}
      </Callout>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Language & Appearance — NEW */}
        <Card title={t("settings.language")} subtitle={t("settings.language_desc")}>
          <div className="space-y-4">
            <div>
              <label className="label flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5" /> {t("settings.language")}
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => handleLocaleChange("es")}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    locale === "es"
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-default)]"
                  }`}
                >
                  <span className="text-xl">🇪🇸</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{t("settings.language_es")}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">Español</div>
                  </div>
                  {locale === "es" && <div className="h-5 w-5 rounded-full bg-[var(--accent)] flex items-center justify-center"><Save className="h-3 w-3 text-white" /></div>}
                </button>
                <button
                  onClick={() => handleLocaleChange("en")}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    locale === "en"
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-default)]"
                  }`}
                >
                  <span className="text-xl">🇺🇸</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{t("settings.language_en")}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">English</div>
                  </div>
                  {locale === "en" && <div className="h-5 w-5 rounded-full bg-[var(--accent)] flex items-center justify-center"><Save className="h-3 w-3 text-white" /></div>}
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-2">
                {locale === "es"
                  ? tx("Más idiomas (Português, Français) estarán disponibles próximamente. Tu selección se guarda automáticamente.", "More languages (Português, Français) will be available soon. Your selection is saved automatically.")
                  : "More languages (Português, Français) coming soon. Your selection is saved automatically."}
              </p>
            </div>

            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <label className="label flex items-center gap-1.5">
                {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />} {t("settings.appearance")}
              </label>
              <p className="text-xs text-[var(--text-tertiary)] mb-2">{t("settings.appearance_desc")}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => toggleTheme("light")}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    theme === "light" ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border-subtle)] hover:border-[var(--border-default)]"
                  }`}
                >
                  <Sun className="h-4 w-4" /> {t("settings.appearance_light")}
                </button>
                <button
                  onClick={() => toggleTheme("dark")}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    theme === "dark" ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border-subtle)] hover:border-[var(--border-default)]"
                  }`}
                >
                  <Moon className="h-4 w-4" /> {t("settings.appearance_dark")}
                </button>
              </div>
            </div>
          </div>
        </Card>

        <Card title={t("settings.org")} subtitle={t("settings.org_sub")}>
          <div className="space-y-3">
            <div>
              <label className="label">{tx("Nombre", "Name")}</label>
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Plan</label>
                <div className="input flex items-center text-sm text-[var(--text-primary)]">
                  {CURRENT_PLAN === "pro" ? tx("Pro (de pago)", "Pro (paid)") : tx("Demo (gratis)", "Demo (free)")}
                </div>
              </div>
              <div>
                <label className="label">{locale === "es" ? "Zona horaria" : "Timezone"}</label>
                <Select defaultValue="America/Guatemala">
                  <option value="America/Guatemala">Guatemala (UTC-6)</option>
                  <option value="America/Mexico_City">Ciudad de México · Mexico City (UTC-6)</option>
                  <option value="America/Bogota">Bogotá (UTC-5)</option>
                  <option value="America/Lima">Lima (UTC-5)</option>
                  <option value="America/Panama">Panamá · Panama (UTC-5)</option>
                  <option value="America/Costa_Rica">San José (UTC-6)</option>
                  <option value="America/El_Salvador">San Salvador (UTC-6)</option>
                  <option value="America/Tegucigalpa">Tegucigalpa (UTC-6)</option>
                  <option value="America/Managua">Managua (UTC-6)</option>
                  <option value="America/Santo_Domingo">Santo Domingo (UTC-4)</option>
                  <option value="America/Caracas">Caracas (UTC-4)</option>
                  <option value="America/Santiago">Santiago (UTC-4/-3)</option>
                  <option value="America/Argentina/Buenos_Aires">Buenos Aires (UTC-3)</option>
                  <option value="America/Sao_Paulo">São Paulo (UTC-3)</option>
                  <option value="America/Montevideo">Montevideo (UTC-3)</option>
                  <option value="America/New_York">New York (UTC-5/-4)</option>
                  <option value="America/Chicago">Chicago (UTC-6/-5)</option>
                  <option value="America/Denver">Denver (UTC-7/-6)</option>
                  <option value="America/Los_Angeles">Los Angeles (UTC-8/-7)</option>
                  <option value="America/Toronto">Toronto (UTC-5/-4)</option>
                  <option value="Europe/Madrid">Madrid (UTC+1/+2)</option>
                  <option value="Europe/London">London (UTC+0/+1)</option>
                  <option value="Europe/Lisbon">Lisbon (UTC+0/+1)</option>
                  <option value="Africa/Casablanca">Casablanca (UTC+0/+1)</option>
                  <option value="Asia/Manila">Manila (UTC+8)</option>
                  <option value="UTC">UTC</option>
                </Select>
              </div>
            </div>
            <div>
              <label className="label flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Locale / Formato regional
              </label>
              <Select defaultValue={locale}>
                <option value="es">Español</option>
                <option value="en">English</option>
              </Select>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                {locale === "es" ? "Afecta formato de fechas, números y moneda." : "Affects date, number and currency formatting."}
              </p>
            </div>
          </div>
        </Card>

        <Card title={t("settings.wfm_params")} subtitle={t("settings.wfm_params_sub")}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{locale === "es" ? "Objetivo de SL (%)" : "SL Target (%)"}</label>
              <Input type="number" min={50} max={100} value={slTarget} onChange={(e) => setSlTarget(parseInt(e.target.value) || 80)} />
            </div>
            <div>
              <label className="label">{locale === "es" ? "Umbral SL (segundos)" : "SL Threshold (seconds)"}</label>
              <Input type="number" min={5} max={120} value={slThreshold} onChange={(e) => setSlThreshold(parseInt(e.target.value) || 20)} />
            </div>
            <div>
              <label className="label">{locale === "es" ? "Shrinkage planificado (%)" : "Planned shrinkage (%)"}</label>
              <Input type="number" min={0} max={60} value={shrinkage} onChange={(e) => setShrinkage(parseInt(e.target.value) || 32)} />
              <div className="text-[10px] text-[var(--text-tertiary)] mt-1">
                {locale === "es" ? "Incluye PTO, training, breaks, reuniones." : "Includes PTO, training, breaks, meetings."}
              </div>
            </div>
            <div>
              <label className="label">{locale === "es" ? tx("Costo cargado por hora/agente (USD)", "Loaded cost per hour/agent (USD)") : "Loaded cost per agent/hour (USD)"}</label>
              <Input type="number" min={10} max={100} value={loadedCost} onChange={(e) => setLoadedCost(parseInt(e.target.value) || 28)} />
            </div>
            <div>
              <label className="label">{locale === "es" ? "Granularidad de intervalo" : "Interval granularity"}</label>
              <Select value={String(intervalMin)} onChange={(e) => setIntervalMin(parseInt(e.target.value))}>
                <option value="5">5 {locale === "es" ? "minutos" : "minutes"}</option>
                <option value="15">15 {locale === "es" ? "minutos" : "minutes"}</option>
                <option value="30">30 {locale === "es" ? "minutos" : "minutes"}</option>
                <option value="60">60 {locale === "es" ? "minutos" : "minutes"}</option>
              </Select>
            </div>
          </div>
        </Card>

        <BillingModelSection />

        <Card
          title={t("settings.profiles")}
          subtitle={t("settings.profiles_sub")}
          className="lg:col-span-2"
          action={
            <Link href="/app/import">
              <Button variant="secondary" size="sm">
                <Plus className="h-3 w-3" /> {tx("Nuevo perfil", "New profile")}
              </Button>
            </Link>
          }
        >
          <div className="space-y-2">
            {profiles.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]">
                <Database className="h-4 w-4 text-[var(--accent)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{p.name}</div>
                  <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-2 mt-0.5 flex-wrap">
                    <span>{p.sourceType ? sourceLabel(p.sourceType) : tx("Origen automático", "Automatic source")}</span>
                    <span>·</span>
                    <span>{p.dataLanguage === "en" ? tx("Datos en inglés", "English data") : tx("Datos en español", "Spanish data")}</span>
                    <span>·</span>
                    <span>{p.mappings.filter((m) => m.canonicalField).length} {tx("columnas mapeadas", "columns mapped")}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" title={tx("Duplicar", "Duplicate")} onClick={() => { duplicateProfile(p.id, tx("copia", "copy")); refreshProfiles(); }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title={tx("Eliminar", "Delete")}
                  className="text-[var(--danger-text)]"
                  onClick={() => {
                    if (confirm(tx(`¿Eliminar perfil "${p.name}"?`, `Delete profile "${p.name}"?`))) {
                      deleteProfile(p.id);
                      refreshProfiles();
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {profiles.length === 0 && (
              <div className="text-sm text-[var(--text-tertiary)] py-6 text-center italic">
                {tx("No hay perfiles guardados. Importa un archivo y guarda el mapeo.", "No saved profiles. Import a file and save the mapping.")}
              </div>
            )}
          </div>
        </Card>

        <BackupCard />
      </div>
    </div>
  );
}
