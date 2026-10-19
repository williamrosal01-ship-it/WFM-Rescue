// Browser side of the workspace backup: collects what this browser holds and restores it.
import { useWfmStore } from "@/lib/store";
import { saveDataset, clearDataset } from "@/lib/local-data";
import { PROFILES_KEY, type ImportProfile } from "@/lib/import-profiles";
import { buildBackupZip, type WorkspaceBackup } from "@/lib/backup-zip";

export const STUDIO_STORAGE_KEY = "wfm-studio-v1";

const readStorageJson = (key: string): unknown | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
};

export const collectWorkspaceBackup = (): WorkspaceBackup => {
  const state = useWfmStore.getState();
  const profiles = readStorageJson(PROFILES_KEY);
  return {
    datasetName: state.datasetName,
    intervals: state.intervals,
    profiles: Array.isArray(profiles) ? (profiles as ImportProfile[]) : [],
    studioState: readStorageJson(STUDIO_STORAGE_KEY),
    exportedAt: new Date().toISOString(),
  };
};

export const exportWorkspaceZip = (): Uint8Array => buildBackupZip(collectWorkspaceBackup());

/** Replaces this browser's data, profiles and reports with the backup. Reload afterwards so every store reads the new state. */
export const restoreWorkspace = async (backup: WorkspaceBackup): Promise<void> => {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(backup.profiles));
  if (backup.studioState !== null) localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(backup.studioState));
  if (backup.intervals.length > 0) await saveDataset(backup.datasetName || "Respaldo", backup.intervals);
  else await clearDataset();
};
