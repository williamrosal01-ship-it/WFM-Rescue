"use client";
// On each page load: restores the uploaded dataset saved in this browser (IndexedDB).
// If nothing is saved, loads the demo data so the screens are not empty.
import { useEffect } from "react";
import { useWfmStore } from "@/lib/store";
import { loadDataset } from "@/lib/local-data";
import { analyzeDataHealth } from "@/lib/data-health";
import { runDiagnostics } from "@/lib/diagnostics";
import { useI18n } from "@/lib/i18n";

export function DataRestore() {
  const { locale } = useI18n();
  useEffect(() => {
    let cancelled = false;
    const restoreOrDemo = async () => {
      let saved = null;
      try {
        saved = await loadDataset();
      } catch {
        saved = null;
      }
      if (cancelled) return;
      const st = useWfmStore.getState();
      if (st.intervals.length > 0) return;
      if (saved && saved.rows.length > 0) {
        useWfmStore.setState({
          intervals: saved.rows,
          datasetName: saved.name,
          datasetIsDemo: false,
          datasetStage: "ready",
        });
        const now = useWfmStore.getState();
        now.setDataHealth(analyzeDataHealth(saved.rows));
        now.setDiagnostics(runDiagnostics({ intervals: saved.rows, locale }));
      } else {
        st.loadDemoData();
      }
    };
    void restoreOrDemo();
    return () => {
      cancelled = true;
    };
    // Runs once per page load; the locale only affects diagnostic text generated here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
