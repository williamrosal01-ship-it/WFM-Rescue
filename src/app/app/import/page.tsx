"use client";
import { useTx } from "@/lib/tx";
import { useToast } from "@/components/toast";
import { SourceTemplatesCard } from "@/components/source-templates-card";
import { useWfmStore } from "@/lib/store";
import { SectionHeader, Card, Button, Callout, Chip, Select, Input } from "@/components/ui";
import { parseCsv, parseXlsx, applyMappings, CANONICAL_FIELDS, type ParseResult, type DataLanguage } from "@/lib/parsers";
import { useEffect, useRef, useState } from "react";
import { loadProfiles, saveProfile, deleteProfile, mappingsForHeaders, makeSourceLabels, type ImportProfile } from "@/lib/import-profiles";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, Database, Save, X, Link as LinkIcon, FileUp, RefreshCw, Trash2 } from "lucide-react";
import type { ColumnMapping, DataSourceType } from "@/lib/types";
import { consolidateRows, analyzeDataHealth } from "@/lib/data-health";
import { runDiagnostics } from "@/lib/diagnostics";
import clsx from "clsx";
import { USER_UPLOADS_ENABLED, SOURCE_TEMPLATES_ENABLED } from "@/lib/config";
import { useI18n } from "@/lib/i18n";
import { tl } from "@/lib/texts-en";
import Link from "next/link";


export default function ImportPage() {
  const tx = useTx();
  const { showToast } = useToast();
  const SOURCE_LABELS = makeSourceLabels(tx);
  const { startImport, import: importSession, setImportMapping, setImportSourceType, applyImportMappings, loadDemoData, intervals } = useWfmStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");

  const { locale } = useI18n();
  // Language of the data file (independent of the interface language).
  const [dataLang, setDataLang] = useState<DataLanguage>("es");
  // Default follows the interface language once it is known (it is read after mount).
  useEffect(() => { setDataLang(locale === "en" ? "en" : "es"); }, [locale]);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState("");
  const sourceFileRef = useRef<File | null>(null);
  const [profiles, setProfiles] = useState<ImportProfile[]>([]);
  useEffect(() => { setProfiles(loadProfiles()); }, []);

  const changeSheet = async (name: string) => {
    const file = sourceFileRef.current;
    if (!file) return;
    setError(null);
    setParsing(true);
    try {
      const parsed = await parseXlsx(file, name);
      setActiveSheet(name);
      startImport(file.name, parsed.headers, parsed.rows, parsed.suggestedMappings, parsed.detectedType);
    } catch (e) {
      setError(e instanceof Error ? e.message : tx("No se pudo leer la hoja.", "Could not read the sheet."));
    } finally {
      setParsing(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!USER_UPLOADS_ENABLED) return;
    setError(null);
    setParsing(true);
    try {
      let parsed: ParseResult;
      const name = file.name.toLowerCase();
      if (name.endsWith(".csv") || name.endsWith(".txt")) {
        parsed = await parseCsv(file);
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        parsed = await parseXlsx(file);
      } else {
        throw new Error(tx("Formato no soportado. Usa CSV o XLSX.", "Unsupported format. Use CSV or XLSX."));
      }
      if (parsed.templateInfo) {
        const t = parsed.templateInfo;
        showToast(
          tx(
            `Plantilla multihoja: ${t.sheets.length} hojas, ${t.skipped} filas omitidas, ${t.duplicates} duplicadas.`,
            `Multi-sheet template: ${t.sheets.length} sheets, ${t.skipped} rows skipped, ${t.duplicates} duplicates.`,
          ),
          t.skipped > 0 || t.duplicates > 0 ? "warning" : "success",
        );
      }
      sourceFileRef.current = file;
      const names = parsed.templateInfo ? [] : (parsed.sheetNames ?? []);
      setSheetNames(names.length > 1 ? names : []);
      setActiveSheet(names[0] ?? "");
      startImport(file.name, parsed.headers, parsed.rows, parsed.suggestedMappings, parsed.detectedType);
    } catch (e) {
      setError(
        e instanceof Error && e.message === "TEMPLATE_NO_INTERVALS"
          ? tx("La plantilla no tiene la hoja Intervalos (o Intervals).", "The template has no Intervals sheet (or Intervalos).")
          : e instanceof Error ? e.message : tx("Error al parsear el archivo.", "Could not parse the file."),
      );
    } finally {
      setParsing(false);
    }
  };

  const handleFinalize = () => {
    if (!importSession) return;
    const records = applyMappings(importSession.rawRows as never, importSession.mappings, { dataLanguage: dataLang });
    // Demo data is replaced by the first real upload; later uploads are added to the loaded data.
    const current = useWfmStore.getState();
    const existing = current.datasetIsDemo ? [] : current.intervals;
    const merged = consolidateRows([...existing, ...records]);
    const health = analyzeDataHealth(merged);
    const diags = runDiagnostics({ intervals: merged, locale });
    applyImportMappings(merged);
    useWfmStore.getState().setDataHealth(health);
    useWfmStore.getState().setDiagnostics(diags);
  };

  if (!importSession) {
    return (
      <div>
        <SectionHeader
          title={tx("Importar datos", "Import data")}
          description={tx("Carga CSV o XLSX de cualquier sistema WFM, ACD o CCaaS. Detectamos automáticamente columnas, proponemos mapeos y auditamos la calidad.", "Load CSV or XLSX from any WFM, ACD or CCaaS system. We detect columns automatically, suggest mappings and audit quality.")}
          actions={
            <>
              <Button variant="secondary" size="sm" onClick={loadDemoData}>
                <RefreshCw className="h-3.5 w-3.5" /> {tx("Cargar datos demo", "Load demo data")}
              </Button>
            </>
          }
        />

        {intervals.length > 0 && (
          <Callout variant="info" title={tx("Ya hay un conjunto de datos activo", "There is already an active dataset")} className="mb-4">
            {tx("Importar otro archivo añadirá sus datos al conjunto actual. Si prefieres empezar de nuevo, limpia los datos desde la barra superior.", "Importing another file will add its data to the current set. To start over, clear the dataset from the top bar.")}
          </Callout>
        )}

        {!USER_UPLOADS_ENABLED && (
          <div className="mb-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 text-sm">
            <div className="font-semibold text-[var(--text-primary)]">
              {locale === "es" ? "Estás en el espacio demo" : "You are in the demo workspace"}
            </div>
            <p className="text-[var(--text-tertiary)] mt-1">
              {locale === "es"
                ? "La carga de archivos propios y las plantillas por origen están disponibles en el plan Pro. Mientras tanto, explora el análisis con los datos demo."
                : "Uploading your own files and source templates are available on the Pro plan. For now, explore the analysis with the demo data."}
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              onClick={() => USER_UPLOADS_ENABLED && fileRef.current?.click()}
              hidden={!USER_UPLOADS_ENABLED}
              className={clsx(
                "cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all",
                dragOver ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]",
                parsing && "opacity-60 pointer-events-none",
              )}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <div className="h-14 w-14 mx-auto rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)] flex items-center justify-center mb-4">
                {parsing ? <RefreshCw className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
              </div>
              <h3 className="text-base font-semibold">{parsing ? tx("Analizando archivo…", "Analyzing file…") : tx("Arrastra tu CSV o XLSX aquí", "Drag your CSV or XLSX here")}</h3>
              <p className="text-sm text-[var(--text-tertiary)] mt-1.5 max-w-sm mx-auto">
                {tx("O haz clic para seleccionar. Soportamos exportaciones de Genesys, Avaya, NICE, Five9, Aspect, Zendesk, Talkdesk y hojas de cálculo personalizadas.", "Or click to select. We support exports from Genesys, Avaya, NICE, Five9, Aspect, Zendesk, Talkdesk and custom spreadsheets.")}
              </p>
              <div className="mt-4 flex justify-center gap-2 flex-wrap">
                <Chip variant="neutral">.csv</Chip>
                <Chip variant="neutral">.xlsx</Chip>
                <Chip variant="neutral">.xls</Chip>
                <Chip variant="neutral">.txt</Chip>
              </div>
            </div>

            {error && (
              <div className="mt-4">
                <Callout variant="danger">{error}</Callout>
              </div>
            )}
          </Card>

          <Card title={tx("Cómo funciona", "How it works")} subtitle={tx("3 pasos, sin integraciones", "3 steps, no integrations")}>
            <ol className="space-y-4 text-sm">
              <li className="flex gap-3">
                <span className="h-6 w-6 shrink-0 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs font-bold">1</span>
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">{tx("Detectamos columnas", "We detect columns")}</div>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{tx("Reconocemos más de 60 alias comunes de proveedores WFM.", "We recognize more than 60 common WFM vendor aliases.")}</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="h-6 w-6 shrink-0 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs font-bold">2</span>
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">{tx("Tú ajustas el mapeo", "You adjust the mapping")}</div>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{tx("Corrige lo que no coincida; puedes guardar el perfil para la próxima semana.", "Fix anything that does not match; you can save the profile for next week.")}</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="h-6 w-6 shrink-0 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs font-bold">3</span>
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">{tx("Ves diagnósticos de inmediato", "See diagnostics right away")}</div>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{tx("Calidad de datos, intervalos problemáticos y recomendaciones en segundos.", "Data health, problem intervals and recommendations in seconds.")}</p>
                </div>
              </li>
            </ol>
            <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-2">{tx("Campos canónicos soportados", "Supported canonical fields")}</div>
              <div className="flex flex-wrap gap-1">
                {CANONICAL_FIELDS.slice(0, 18).map((f) => (
                  <Chip key={f.key} variant="neutral" className="!text-[10px]">{tl(f.label, locale).replace(/\s*\(.*\)\s*$/, "")}</Chip>
                ))}
                <Chip variant="neutral" className="!text-[10px]">+{CANONICAL_FIELDS.length - 18}</Chip>
              </div>
            </div>
          </Card>
        </div>

        {SOURCE_TEMPLATES_ENABLED && (
          <div className="mt-4">
            <SourceTemplatesCard />
          </div>
        )}
      </div>
    );
  }

  // Mapping UI
  const mappedCount = importSession.mappings.filter((m) => m.canonicalField).length;
  const requiredFields = CANONICAL_FIELDS.filter((f) => f.required);
  const missingRequired = requiredFields.filter((f) => !importSession.mappings.some((m) => m.canonicalField === f.key));
  const canProceed = missingRequired.length === 0;

  return (
    <div>
      <SectionHeader
        title={tx("Mapear columnas", "Map columns")}
        description={`${tx("Archivo:", "File:")} ${importSession.filename} · ${importSession.rawRows.length} ${tx("filas", "rows")} · ${importSession.headers.length} ${tx("columnas detectadas.", "columns detected.")}`}
        actions={
          <Button variant="ghost" size="sm" onClick={() => useWfmStore.getState().cancelImport()}>
            <X className="h-3.5 w-3.5" /> {tx("Cancelar", "Cancel")}
          </Button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card title={tx("Configuración de importación", "Import settings")}>
            <div className="grid sm:grid-cols-2 gap-4">
              {sheetNames.length > 1 && (
                <div>
                  <label className="label" htmlFor="import-sheet">{tx("Hoja del archivo", "File sheet")}</label>
                  <Select id="import-sheet" value={activeSheet} onChange={(e) => changeSheet(e.target.value)}>
                    {sheetNames.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </Select>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                    {tx("Cambiar la hoja vuelve a mapear las columnas.", "Changing the sheet maps the columns again.")}
                  </p>
                </div>
              )}
              <div>
                <label className="label" htmlFor="data-lang">{tx("Idioma de los datos", "Data language")}</label>
                <Select id="data-lang" value={dataLang} onChange={(e) => setDataLang(e.target.value as DataLanguage)}>
                  <option value="es">{tx("Español: 05/10/2026 = 5 oct · 1.234,5", "Spanish: 05/10/2026 = 5 Oct · 1.234,5")}</option>
                  <option value="en">{tx("Inglés: 05/10/2026 = 10 may · 1,234.5", "English: 05/10/2026 = May 10 · 1,234.5")}</option>
                </Select>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                  {tx("Cambia cómo se leen fechas y números. No cambia el idioma de la interfaz.", "Changes how dates and numbers are read. It does not change the interface language.")}
                </p>
              </div>
              <div>
                <label className="label">{tx("Tipo de origen", "Source type")}</label>
                <Select
                  value={importSession.sourceType ?? ""}
                  onChange={(e) => setImportSourceType(e.target.value as DataSourceType)}
                >
                  <option value="">{tx("Detectado automáticamente…", "Detected automatically…")}</option>
                  {Object.entries(SOURCE_LABELS).map(([k, l]) => (
                    <option key={k} value={k}>{l}</option>
                  ))}
                </Select>
                {importSession.sourceType && (
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                    {tx("Detectado:", "Detected:")} <strong>{SOURCE_LABELS[importSession.sourceType]}</strong>
                  </p>
                )}
              </div>
              <div>
                <label className="label">{tx("Guardar como perfil", "Save as profile")}</label>
                <Input
                  placeholder={tx("Nombre del perfil (ej. Genesys Intraday Export)", "Profile name (e.g. Genesys Intraday Export)")}
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                  {tx("La próxima semana no tendrás que volver a mapear.", "Next week you will not have to map again.")}
                </p>
              </div>
            </div>
          </Card>

          <Card
            title={`${tx("Mapeo de columnas", "Column mapping")} (${mappedCount}/${importSession.mappings.length} ${tx("mapeadas", "mapped")})`}
            subtitle={tx("Asocia cada columna del archivo a un campo canónico. Los que tienen marca de requerido son imprescindibles.", "Match each file column to a standard field. Fields marked as required are mandatory.")}
          >
            <div className="grid grid-cols-12 gap-2 px-2 mb-2 text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
              <div className="col-span-4">{tx("Columna del archivo", "File column")}</div>
              <div className="col-span-1 text-center">Req.</div>
              <div className="col-span-3">{tx("Ejemplo", "Example")}</div>
              <div className="col-span-4">{tx("Campo canónico", "Canonical field")}</div>
            </div>
            <div className="max-h-[480px] overflow-y-auto pr-1 space-y-1.5">
              {importSession.mappings.map((m) => {
                const field = CANONICAL_FIELDS.find((f) => f.key === m.canonicalField);
                const isRequired = requiredFields.some((f) => f.key === m.canonicalField);
                const isUnmappedRequired = requiredFields.some((f) => f.key === null);
                return (
                  <div key={m.fileColumn} className="grid grid-cols-12 gap-2 items-center py-1.5 px-2 rounded-lg hover:bg-[var(--bg-hover)]">
                    <div className="col-span-4">
                      <div className="text-sm font-medium text-[var(--text-primary)] truncate" title={m.fileColumn}>{m.fileColumn}</div>
                    </div>
                    <div className="col-span-1 text-center">
                      {field?.required ? (
                        <span className="inline-block h-2 w-2 rounded-full bg-[var(--danger-solid)]" title={tx("Requerido", "Required")} />
                      ) : null}
                    </div>
                    <div className="col-span-3 text-xs text-[var(--text-tertiary)] truncate" title={String(m.exampleValue ?? "")}>
                      {m.exampleValue == null || m.exampleValue === "" ? <span className="text-[var(--text-quaternary)] italic">{tx("vacío", "empty")}</span> : String(m.exampleValue).slice(0, 40)}
                    </div>
                    <div className="col-span-4">
                      <select
                        className="input !py-1 !text-xs"
                        value={m.canonicalField ?? ""}
                        onChange={(e) => setImportMapping(m.fileColumn, e.target.value || null)}
                      >
                        <option value="">{tx("— No mapear —", "— Don't map —")}</option>
                        <optgroup label={tx("Requeridos", "Required")}>
                          {CANONICAL_FIELDS.filter((f) => f.required).map((f) => (
                            <option key={f.key} value={f.key}>{tl(f.label, locale)}</option>
                          ))}
                        </optgroup>
                        <optgroup label={tx("Otros campos", "Other fields")}>
                          {CANONICAL_FIELDS.filter((f) => !f.required).map((f) => (
                            <option key={f.key} value={f.key}>{tl(f.label, locale)}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title={tx("Estado del mapeo", "Mapping status")}>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-tertiary)]">{tx("Columnas detectadas", "Detected columns")}</span>
                <strong>{importSession.mappings.length}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-tertiary)]">{tx("Mapeadas", "Mapped")}</span>
                <strong className="text-[var(--success-solid)]">{mappedCount}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-tertiary)]">{tx("Sin mapear", "Not mapped")}</span>
                <strong className="text-[var(--text-tertiary)]">{importSession.mappings.length - mappedCount}</strong>
              </div>

              {missingRequired.length > 0 ? (
                <div className="pt-3 border-t border-[var(--border-subtle)]">
                  <div className="flex items-start gap-2 text-[var(--danger-text)] mb-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span className="text-xs font-medium">{tx("Campos requeridos faltantes:", "Missing required fields:")}</span>
                  </div>
                  <ul className="space-y-1">
                    {missingRequired.map((f) => (
                      <li key={f.key} className="text-xs flex items-center gap-1.5 text-[var(--danger-text)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--danger-solid)]" />
                        {tl(f.label, locale)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="pt-3 border-t border-[var(--border-subtle)] flex items-start gap-2 text-[var(--success-text)]">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="text-xs font-medium">{tx("Todos los campos requeridos están mapeados. Listo para procesar.", "All required fields are mapped. Ready to process.")}</span>
                </div>
              )}
            </div>
          </Card>

          <Card title={tx("Guardar perfil (opcional)", "Save profile (optional)")}>
            <p className="text-xs text-[var(--text-tertiary)] mb-3">
              {tx("Guarda este mapeo como perfil para que la próxima importación del mismo proveedor no requiera configuración manual.", "Save this mapping as a profile so the next import from the same vendor needs no manual setup.")}
            </p>
            <Button
              variant="secondary"
              className="w-full"
              disabled={!profileName.trim()}
              onClick={() => {
                const p = saveProfile({
                  name: profileName,
                  sourceType: importSession.sourceType ?? null,
                  dataLanguage: dataLang,
                  mappings: importSession.mappings,
                });
                setProfiles(loadProfiles());
                setProfileName("");
                showToast(tx(`Perfil "${p.name}" guardado.`, `Profile "${p.name}" saved.`), "success");
              }}
            >
              <Save className="h-3.5 w-3.5" /> {tx("Guardar perfil", "Save profile")}
            </Button>
            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-2">{tx("Perfiles guardados", "Saved profiles")}</div>
              {profiles.length === 0 && (
                <div className="text-xs text-[var(--text-tertiary)] italic">
                  {tx("No hay perfiles guardados todavía.", "No saved profiles yet.")}
                </div>
              )}
              <div className="space-y-2">
                {profiles.map((p) => {
                  const matches = mappingsForHeaders(p, importSession.headers).length;
                  return (
                    <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg border border-[var(--border-subtle)]">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-[11px] text-[var(--text-tertiary)]">
                          {matches} {tx("columnas coinciden con este archivo", "columns match this file")}
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          if (matches === 0) {
                            showToast(tx("Ninguna columna del perfil coincide con este archivo.", "No profile column matches this file."), "warning");
                            return;
                          }
                          mappingsForHeaders(p, importSession.headers).forEach((m) => setImportMapping(m.fileColumn, m.canonicalField));
                          if (p.sourceType) setImportSourceType(p.sourceType);
                          setDataLang(p.dataLanguage);
                          showToast(tx(`Perfil "${p.name}" aplicado: ${matches} columnas.`, `Profile "${p.name}" applied: ${matches} columns.`), "success");
                        }}
                      >
                        {tx("Usar", "Use")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title={tx("Eliminar", "Delete")}
                        className="text-[var(--danger-text)]"
                        onClick={() => {
                          deleteProfile(p.id);
                          setProfiles(loadProfiles());
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          <Button variant="accent" className="w-full !py-3" disabled={!canProceed} onClick={handleFinalize}>
            <FileUp className="h-4 w-4" /> {tx("Procesar y ver diagnósticos", "Process and view diagnostics")}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Link href="/app/data-health" className="block">
            <Button variant="ghost" className="w-full">
              <Database className="h-3.5 w-3.5" /> {tx("Luego revisar calidad de datos", "Review data quality later")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
