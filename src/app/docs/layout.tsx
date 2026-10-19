import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Glosario de métricas y fórmulas · WFM Rescue",
  description: "Documentación transparente de todas las métricas que usa WFM Rescue: fórmulas, supuestos, campos fuente y limitaciones.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
