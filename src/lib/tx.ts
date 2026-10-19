"use client";

import { useI18n } from "@/lib/i18n";

/** Returns tx(es, en): picks the string for the active locale (no mixing). */
export function useTx() {
  const { locale } = useI18n();
  return (es: string, en: string) => (locale === "es" ? es : en);
}
