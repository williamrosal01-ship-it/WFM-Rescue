"use client";
import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Card, Button, Callout } from "@/components/ui";
import { useTx } from "@/lib/tx";
import { useUploadsEnabled } from "@/lib/plan-access";
import { BackupError, readBackupZip, type BackupErrorCode } from "@/lib/backup-zip";
import { exportWorkspaceZip, restoreWorkspace } from "@/lib/workspace-backup";

// Pro only: the demo has no user data to back up.
export function BackupCard() {
  const tx = useTx();
  const USER_UPLOADS_ENABLED = useUploadsEnabled();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (!USER_UPLOADS_ENABLED) return null;

  const errorText = (code: BackupErrorCode): string => {
    const messages: Record<BackupErrorCode, string> = {
      incomplete: tx("El archivo está incompleto o dañado.", "The file is incomplete or damaged."),
      compressed: tx("El ZIP tiene compresión. Usa un respaldo exportado desde esta aplicación.", "The ZIP is compressed. Use a backup exported from this app."),
      not_backup: tx("Este archivo no es un respaldo de WFM Rescue.", "This file is not a WFM Rescue backup."),
      version: tx("La versión de este respaldo no es compatible.", "This backup version is not supported."),
      missing: tx("Al respaldo le faltan partes.", "The backup is missing parts."),
      invalid_json: tx("Una parte del respaldo está dañada.", "A part of the backup is damaged."),
      invalid_data: tx("El respaldo no tiene datos válidos.", "The backup does not contain valid data."),
    };
    return messages[code];
  };

  const download = () => {
    setError(null);
    setDone(null);
    const bytes = exportWorkspaceZip();
    const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wfm-rescue-respaldo-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setDone(tx("Respaldo descargado.", "Backup downloaded."));
  };

  const restore = async (file: File) => {
    setError(null);
    setDone(null);
    let backup;
    try {
      backup = readBackupZip(new Uint8Array(await file.arrayBuffer()));
    } catch (e) {
      setError(e instanceof BackupError ? errorText(e.code) : tx("No se pudo leer el archivo.", "The file could not be read."));
      return;
    }
    const ok = window.confirm(
      tx(
        `Restaurar "${file.name}" reemplazará los datos, perfiles y reportes actuales de este navegador. ¿Continuar?`,
        `Restoring "${file.name}" will replace the current data, profiles and reports in this browser. Continue?`
      )
    );
    if (!ok) return;
    setBusy(true);
    try {
      await restoreWorkspace(backup);
      window.location.reload();
    } catch {
      setError(tx("No se pudo restaurar el respaldo.", "The backup could not be restored."));
      setBusy(false);
    }
  };

  return (
    <Card
      title={tx("Respaldo", "Backup")}
      subtitle={tx("Descarga o restaura todo lo guardado en este navegador: datos cargados, perfiles y reportes.", "Download or restore everything stored in this browser: loaded data, profiles and reports.")}
      className="lg:col-span-2"
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          {tx(
            "El respaldo es un ZIP que generas tú. Se crea en tu navegador: no se sube a ningún servidor. Guárdalo en un lugar seguro, porque los datos viven solo en este navegador.",
            "The backup is a ZIP you generate yourself. It is created in your browser and not uploaded to any server. Keep it somewhere safe, because the data lives only in this browser."
          )}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={download} disabled={busy}>
            <Download className="h-4 w-4" /> {tx("Descargar respaldo (.zip)", "Download backup (.zip)")}
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="h-4 w-4" /> {busy ? tx("Restaurando…", "Restoring…") : tx("Restaurar respaldo", "Restore backup")}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void restore(file);
            }}
          />
        </div>
        {done && <Callout variant="success">{done}</Callout>}
        {error && <Callout variant="danger">{error}</Callout>}
      </div>
    </Card>
  );
}
