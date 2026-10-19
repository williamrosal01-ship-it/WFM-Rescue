"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTx } from "@/lib/tx";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useWfmStore } from "@/lib/store";

const ROLE_LABEL: Record<string, { es: string; en: string }> = {
  analyst: { es: "Analista", en: "Analyst" },
  manager: { es: "Gerente", en: "Manager" },
  admin: { es: "Administrador", en: "Administrator" },
  viewer: { es: "Lector", en: "Viewer" },
};

export default function AccountPage() {
  const tx = useTx();
  const router = useRouter();
  const { session, configured } = useAuth();
  const { userName, userEmail, orgName, userRole, loadDemoData, datasetIsDemo } = useWfmStore();

  if (!configured || !session) {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">{tx("Cuenta", "Account")}</h1>
        <div className="card p-5 space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            {tx("No has iniciado sesión. La demo está disponible sin cuenta.", "You are not signed in. The demo is available without an account.")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/auth/login" className="btn btn-accent">{tx("Iniciar sesión", "Sign in")}</Link>
            <Link href="/app/dashboard" className="btn btn-secondary">{tx("Ir a la demo", "Go to the demo")}</Link>
          </div>
        </div>
      </div>
    );
  }

  const roleLabel = ROLE_LABEL[userRole]?.[tx("es", "en") as "es" | "en"] ?? userRole;
  const firstName = userName.split(" ")[0];

  const loadDemo = () => {
    loadDemoData();
    router.push("/app/dashboard");
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    router.push("/");
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          {tx(`Hola, ${firstName}`, `Hi, ${firstName}`)}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {tx("Tu cuenta está lista. Estos son tus datos de acceso.", "Your account is ready. These are your access details.")}
        </p>
      </div>

      <div className="card p-5">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--text-tertiary)]">{tx("Correo", "Email")}</dt>
            <dd className="font-medium text-[var(--text-primary)] break-all">{userEmail}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-tertiary)]">{tx("Empresa o equipo", "Company or team")}</dt>
            <dd className="font-medium text-[var(--text-primary)]">{orgName}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-tertiary)]">{tx("Rol", "Role")}</dt>
            <dd className="font-medium text-[var(--text-primary)]">{roleLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-tertiary)]">{tx("Datos en pantalla", "Data on screen")}</dt>
            <dd className="font-medium text-[var(--text-primary)]">{datasetIsDemo ? tx("Demo ilustrativa", "Illustrative demo") : tx("Tus datos", "Your data")}</dd>
          </div>
        </dl>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{tx("¿Quieres cargar la demo?", "Do you want to load the demo?")}</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {tx(
              "La demo son datos ilustrativos de un contact center con 4 colas. Sirve para explorar todas las pantallas. Cargarla reemplaza los datos que estés viendo en este navegador.",
              "The demo is illustrative data from a contact center with 4 queues. Use it to explore every screen. Loading it replaces the data you are viewing in this browser.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadDemo} className="btn btn-accent">{tx("Sí, cargar la demo", "Yes, load the demo")}</button>
          <Link href="/app/dashboard" className="btn btn-secondary">{tx("No, ir al panel", "No, go to the dashboard")}</Link>
        </div>
      </div>

      <div>
        <button type="button" onClick={signOut} className="btn btn-ghost text-sm">{tx("Cerrar sesión", "Sign out")}</button>
      </div>
    </div>
  );
}
