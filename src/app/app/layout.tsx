"use client";
import { AppShell } from "@/components/app-shell";
import { DataRestore } from "@/components/data-restore";
import type { ReactNode } from "react";
import { useEffect } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem("wfm-theme") as "light" | "dark" | null;
    const theme = saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  return (
    <>
      <DataRestore />
      <AppShell>{children}</AppShell>
    </>
  );
}
