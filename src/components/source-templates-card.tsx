"use client";
// Download card for the per-source XLSX templates. The interface language and the
// template language are independent: a Spanish user can download an English template
// when the client's data comes in English.
import { useEffect, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Card, Button, Select } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import {
  TEMPLATE_SOURCES,
  TEMPLATE_ROLES,
  TEMPLATE_SHEET_NAMES,
  TEMPLATE_SOURCE_LABEL,
  TEMPLATE_SOURCE_NOTES,
  columnsForRole,
  type TemplateLang,
  type TemplateRole,
  type TemplateSource,
} from "@/lib/template-core";
import { templateFileName, templateWorkbookBytes } from "@/lib/template-xlsx";

const ROLE_TITLE: Record<TemplateLang, Record<TemplateRole, string>> = {
  es: { intervals: "Volúmenes y servicio", schedule: "Horarios", attendance: "Asistencia" },
  en: { intervals: "Volumes and service", schedule: "Schedule", attendance: "Attendance" },
};

export function SourceTemplatesCard() {
  const { locale } = useI18n();
  const isEs = locale !== "en";
  const [source, setSource] = useState<TemplateSource>("five9");
  const [tplLang, setTplLang] = useState<TemplateLang>(isEs ? "es" : "en");
  // The saved interface language is read after mount, so follow it when it arrives or changes.
  useEffect(() => {
    setTplLang(isEs ? "es" : "en");
  }, [isEs]);

  const download = () => {
    const bytes = templateWorkbookBytes(source, tplLang);
    const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = templateFileName(source, tplLang);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Card
      title={isEs ? "Plantillas por origen de datos" : "Templates by data source"}
      subtitle={isEs ? "Un archivo XLSX con 3 hojas de datos, instrucciones y diccionario" : "One XLSX with 3 data sheets, instructions and a dictionary"}
    >
      <div className="grid md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
        <div>
          <label className="label" htmlFor="template-source">{isEs ? "Origen" : "Source"}</label>
          <Select id="template-source" value={source} onChange={(e) => setSource(e.target.value as TemplateSource)}>
            {TEMPLATE_SOURCES.map((s) => (
              <option key={s} value={s}>{TEMPLATE_SOURCE_LABEL[s][isEs ? "es" : "en"]}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="label" htmlFor="template-lang">{isEs ? "Idioma de la plantilla" : "Template language"}</label>
          <Select id="template-lang" value={tplLang} onChange={(e) => setTplLang(e.target.value as TemplateLang)}>
            <option value="es">Español</option>
            <option value="en">English</option>
          </Select>
        </div>
        <Button onClick={download}>
          <Download className="h-4 w-4" /> {isEs ? "Descargar plantilla XLSX" : "Download XLSX template"}
        </Button>
      </div>
      <p className="text-xs text-[var(--text-tertiary)] mt-2">
        {isEs
          ? "El idioma de la plantilla define sus encabezados y textos. Puedes subir la plantilla en cualquier idioma: la plataforma reconoce ambos."
          : "The template language sets its headers and text. You can upload the template in either language: the platform recognizes both."}
      </p>

      <p className="text-sm text-[var(--text-secondary)] mt-4">{TEMPLATE_SOURCE_NOTES[source][tplLang]}</p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-subtle)] text-left text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
            <tr>
              <th className="px-3 py-2 font-semibold">{isEs ? "Hoja" : "Sheet"}</th>
              <th className="px-3 py-2 font-semibold">{isEs ? "Columnas (en este orden)" : "Columns (in this order)"}</th>
            </tr>
          </thead>
          <tbody>
            {TEMPLATE_ROLES.map((role) => (
              <tr key={role} className="border-t border-[var(--border-subtle)] align-top">
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="font-semibold text-[var(--text-primary)]">{TEMPLATE_SHEET_NAMES[tplLang][role]}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{ROLE_TITLE[tplLang][role]}</div>
                </td>
                <td className="px-3 py-2 text-[var(--text-secondary)]">
                  {columnsForRole(role).map((c) => (
                    <span key={c.key} className="inline-block mr-1.5 mb-1">
                      {c.header[tplLang]}
                      {c.required ? <span className="text-[var(--accent-strong)]">*</span> : null}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-[var(--text-tertiary)] flex items-center gap-1.5">
        <FileSpreadsheet className="h-3.5 w-3.5" />
        {isEs
          ? "* Obligatoria en cada hoja. Fecha, intervalo, cola y canal se usan para unir las hojas. El diccionario de la plantilla indica el campo de origen de cada columna."
          : "* Required in each sheet. Date, interval, queue and channel are used to join the sheets. The template dictionary lists the source field for each column."}
      </div>

    </Card>
  );
}
