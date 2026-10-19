import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "WFM Rescue",
    template: "%s · WFM Rescue",
  },
  description:
    "Plataforma SaaS de analítica WFM para contact centers. Unifica exportaciones heterogéneas, diagnostica brechas de staffing, valida pronósticos y acelera decisiones intradía.",
  applicationName: "WFM Rescue",
  metadataBase: new URL("https://wfmrescue.netlify.app"),
  openGraph: {
    title: "WFM Rescue",
    description:
      "De Excel a inteligencia operativa: importa tus exportaciones de Genesys, Avaya, NICE, Five9 o tu WFM actual y obtén diagnósticos accionables en minutos.",
    type: "website",
    locale: "es_ES",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${jbMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] antialiased">
        <I18nProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
