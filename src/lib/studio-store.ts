"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  blankReport,
  newId,
  normalizeWidget,
  reportFromTemplate,
  type StudioReport,
  type Widget,
  type LocalizedText,
} from "./studio-core";

// Reports live in the browser (localStorage). Cloud sync is not part of this release.
interface StudioState {
  reports: StudioReport[];
  userTemplates: StudioReport[];
  createBlank: () => string;
  createFromTemplate: (templateId: string) => string;
  duplicate: (id: string) => string | null;
  update: (id: string, patch: Partial<Pick<StudioReport, "name" | "description">>) => void;
  setWidgets: (id: string, widgets: Widget[]) => void;
  updateWidget: (id: string, widgetId: string, patch: Partial<Widget>) => void;
  remove: (id: string) => void;
  saveAsTemplate: (id: string, name: LocalizedText) => string | null;
  removeUserTemplate: (id: string) => void;
  createFromUserTemplate: (id: string) => string | null;
}

const now = () => new Date().toISOString();

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      reports: [],
      userTemplates: [],
      createBlank: () => {
        const r = blankReport(now());
        set({ reports: [r, ...get().reports] });
        return r.id;
      },
      createFromTemplate: (templateId) => {
        const r = reportFromTemplate(templateId, now());
        set({ reports: [r, ...get().reports] });
        return r.id;
      },
      duplicate: (id) => {
        const src = get().reports.find((r) => r.id === id);
        if (!src) return null;
        const copy: StudioReport = {
          ...src,
          id: newId("r"),
          name: typeof src.name === "string" ? `${src.name} (copia)` : { es: `${src.name.es} (copia)`, en: `${src.name.en} (copy)` },
          widgets: src.widgets.map((w) => ({ ...w, id: newId("w"), metrics: w.metrics.map((m) => ({ ...m })) })),
          createdAt: now(),
          updatedAt: now(),
        };
        set({ reports: [copy, ...get().reports] });
        return copy.id;
      },
      update: (id, patch) =>
        set({ reports: get().reports.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now() } : r)) }),
      setWidgets: (id, widgets) =>
        set({ reports: get().reports.map((r) => (r.id === id ? { ...r, widgets: widgets.map(normalizeWidget), updatedAt: now() } : r)) }),
      updateWidget: (id, widgetId, patch) =>
        set({
          reports: get().reports.map((r) =>
            r.id !== id
              ? r
              : {
                  ...r,
                  widgets: r.widgets.map((w) => (w.id === widgetId ? normalizeWidget({ ...w, ...patch }) : w)),
                  updatedAt: now(),
                }),
        }),
      remove: (id) => set({ reports: get().reports.filter((r) => r.id !== id) }),
      saveAsTemplate: (id, name) => {
        const src = get().reports.find((r) => r.id === id);
        if (!src) return null;
        const tpl: StudioReport = {
          ...src,
          id: newId("t"),
          name,
          widgets: src.widgets.map((w) => ({ ...w, id: newId("w"), metrics: w.metrics.map((m) => ({ ...m })) })),
          createdAt: now(),
          updatedAt: now(),
        };
        set({ userTemplates: [tpl, ...get().userTemplates] });
        return tpl.id;
      },
      removeUserTemplate: (id) => set({ userTemplates: get().userTemplates.filter((t) => t.id !== id) }),
      createFromUserTemplate: (id) => {
        const tpl = get().userTemplates.find((t) => t.id === id);
        if (!tpl) return null;
        const r: StudioReport = {
          ...tpl,
          id: newId("r"),
          templateId: undefined,
          widgets: tpl.widgets.map((w) => ({ ...w, id: newId("w"), metrics: w.metrics.map((m) => ({ ...m })) })),
          createdAt: now(),
          updatedAt: now(),
        };
        set({ reports: [r, ...get().reports] });
        return r.id;
      },
    }),
    {
      name: "wfm-studio-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ reports: s.reports, userTemplates: s.userTemplates }),
    },
  ),
);
