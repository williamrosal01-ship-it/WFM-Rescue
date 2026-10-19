// Commercial scope flags.
// Two plans only:
//   demo: free, to try the platform with illustrative data. No uploads, no templates.
//   pro:  paid. Uploads of the customer's own files (processed in the browser), source templates.
// Payments are not integrated yet, so every account runs as "demo".
// Change the build flag only together with billing.
export type PlanId = "demo" | "pro";

export const PLAN_CAPABILITIES: Record<PlanId, { uploads: boolean; templates: boolean }> = {
  demo: { uploads: false, templates: false },
  pro: { uploads: true, templates: true },
};

// Set NEXT_PUBLIC_WFM_PLAN=pro at build time to enable the Pro plan (uploads and templates).
// Without it, the build is Demo.
export const CURRENT_PLAN: PlanId = process.env.NEXT_PUBLIC_WFM_PLAN === "pro" ? "pro" : "demo";

// Pro price in USD per user per month. PROPOSAL: pending expert/commercial review; not validated.
export const PRO_PRICE_USD = { monthly: 29, yearlyPerMonth: 24 } as const;
export const PRO_YEARLY_SAVINGS_PCT = Math.round((1 - PRO_PRICE_USD.yearlyPerMonth / PRO_PRICE_USD.monthly) * 100);

export const USER_UPLOADS_ENABLED = PLAN_CAPABILITIES[CURRENT_PLAN].uploads;
export const SOURCE_TEMPLATES_ENABLED = PLAN_CAPABILITIES[CURRENT_PLAN].templates;

/** Product version shown in the app and in exports. Keep in sync with package.json. */
export const APP_VERSION = "2.8.2";
