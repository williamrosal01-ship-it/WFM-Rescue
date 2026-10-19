"use client";

// Acceso por plan en la interfaz.
// Pro = el build tiene NEXT_PUBLIC_WFM_PLAN=pro (para todos) o la organización tiene plan 'pro' en la base.
// La validación real de datos vive en el navegador; esto solo decide qué pantallas se muestran.
import { CURRENT_PLAN, PLAN_CAPABILITIES, type PlanId } from "@/lib/config";
import { useWfmStore } from "@/lib/store";

export function useEffectivePlan(): PlanId {
  const orgPlan = useWfmStore((s) => s.orgPlan);
  return CURRENT_PLAN === "pro" || orgPlan === "pro" ? "pro" : "demo";
}

export function useUploadsEnabled(): boolean {
  return PLAN_CAPABILITIES[useEffectivePlan()].uploads;
}

export function useTemplatesEnabled(): boolean {
  return PLAN_CAPABILITIES[useEffectivePlan()].templates;
}
