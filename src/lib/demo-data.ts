// ============================================================================
// Realistic demo data — clearly labeled as synthetic.
// Models a multi-queue contact center across one business day, 15-min intervals.
// Includes intentional patterns the diagnostics engine should flag:
//  - Understaffing at 10:30-12:00 peak (SL dip, ASA spike)
//  - Overstaffing 08:00-09:00 and 16:30-17:30
//  - Forecast under-predicts peak volume by ~18%
//  - Higher AHT on Billing queue
//  - AUX spike 14:00-14:30 (team meeting scheduled)
//  - Site "Lima" has worse adherence than "Bogotá"
// ============================================================================
import type { IntervalRecord, AgentIntervalRecord, KpiDefinition } from "./types";
import { KPI_DEFINITIONS } from "./wfm";

export interface DemoDataset {
  intervals: IntervalRecord[];
  agentIntervals: AgentIntervalRecord[];
  queues: string[];
  channels: string[];
  sites: string[];
  teams: string[];
  date: Date;
  intervalMinutes: 15;
  kpis: KpiDefinition[];
  assumptions: string[];
}

const QUEUES = ["Sales", "Support", "Billing", "Retention"] as const;
const CHANNELS = ["Voice", "Chat", "Email"] as const;
const SITES = ["Bogotá", "Lima"] as const;
const TEAMS = ["Alpha", "Bravo", "Charlie", "Delta"] as const;

// Arrival pattern (calls per 15-min interval at base) — typical contact center
// with two peaks: mid-morning and mid-afternoon.
const BASE_PATTERN: Array<{ h: number; m: number; factor: number }> = [
  { h: 7, m: 0, factor: 0.2 },
  { h: 7, m: 15, factor: 0.35 },
  { h: 7, m: 30, factor: 0.5 },
  { h: 7, m: 45, factor: 0.7 },
  { h: 8, m: 0, factor: 0.85 },
  { h: 8, m: 15, factor: 0.95 },
  { h: 8, m: 30, factor: 1.0 },
  { h: 8, m: 45, factor: 1.05 },
  { h: 9, m: 0, factor: 1.1 },
  { h: 9, m: 15, factor: 1.18 },
  { h: 9, m: 30, factor: 1.25 },
  { h: 9, m: 45, factor: 1.35 },
  { h: 10, m: 0, factor: 1.45 },
  { h: 10, m: 15, factor: 1.55 },
  { h: 10, m: 30, factor: 1.65 }, // peak start
  { h: 10, m: 45, factor: 1.7 },
  { h: 11, m: 0, factor: 1.68 },
  { h: 11, m: 15, factor: 1.6 },
  { h: 11, m: 30, factor: 1.5 },
  { h: 11, m: 45, factor: 1.4 },
  { h: 12, m: 0, factor: 1.25 }, // lunch dip
  { h: 12, m: 15, factor: 1.1 },
  { h: 12, m: 30, factor: 1.0 },
  { h: 12, m: 45, factor: 1.05 },
  { h: 13, m: 0, factor: 1.2 },
  { h: 13, m: 15, factor: 1.35 },
  { h: 13, m: 30, factor: 1.45 },
  { h: 13, m: 45, factor: 1.55 },
  { h: 14, m: 0, factor: 1.6 }, // second peak (plus AUX meeting drop)
  { h: 14, m: 15, factor: 1.55 },
  { h: 14, m: 30, factor: 1.5 },
  { h: 14, m: 45, factor: 1.4 },
  { h: 15, m: 0, factor: 1.3 },
  { h: 15, m: 15, factor: 1.2 },
  { h: 15, m: 30, factor: 1.1 },
  { h: 15, m: 45, factor: 1.0 },
  { h: 16, m: 0, factor: 0.9 },
  { h: 16, m: 15, factor: 0.75 },
  { h: 16, m: 30, factor: 0.6 },
  { h: 16, m: 45, factor: 0.45 },
  { h: 17, m: 0, factor: 0.3 },
  { h: 17, m: 15, factor: 0.2 },
];

// Queue mix and AHT baseline (seconds)
const QUEUE_CONFIG: Record<string, { weight: number; ahtBase: number; slTarget: number }> = {
  Sales: { weight: 0.22, ahtBase: 330, slTarget: 0.85 },
  Support: { weight: 0.42, ahtBase: 420, slTarget: 0.8 },
  Billing: { weight: 0.18, ahtBase: 520, slTarget: 0.8 },
  Retention: { weight: 0.18, ahtBase: 480, slTarget: 0.85 },
};

// Deterministic pseudo-random so SSR and client agree (simple mulberry32).
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDemoData(date = new Date("2026-03-04T12:00:00Z")): DemoDataset {
  const rng = mulberry32(42);
  const intervals: IntervalRecord[] = [];
  const agentIntervals: AgentIntervalRecord[] = [];

  for (const slot of BASE_PATTERN) {
    const start = new Date(date);
    start.setHours(slot.h, slot.m, 0, 0);
    const end = new Date(start.getTime() + 15 * 60 * 1000);
    const intervalLabel = `${String(slot.h).padStart(2, "0")}:${String(slot.m).padStart(2, "0")}`;

    // The forecast slightly under-predicts peaks (known real-world bias).
    const forecastBias = slot.factor > 1.4 ? 0.82 : slot.factor < 0.5 ? 1.1 : 0.95;

    for (const queue of QUEUES) {
      const cfg = QUEUE_CONFIG[queue];
      // Channel mix varies by queue
      const emailShare = 0.08; // email carved out of the voice pool (keeps totals unchanged)
      const voiceShare = (queue === "Sales" ? 0.85 : queue === "Support" ? 0.6 : 0.55) - emailShare;
      const chatShare = queue === "Support" ? 0.3 : 0.25;
      // emailShare is the rest

      const baseVolume = cfg.weight * 1800 * slot.factor;
      const forecastVolume = Math.round(baseVolume * forecastBias * (0.97 + rng() * 0.06));
      const actualVolume = Math.round(baseVolume * (0.95 + rng() * 0.1));

      const ahtNoise = 0.9 + rng() * 0.2;
      const actualAht = cfg.ahtBase * ahtNoise;
      const forecastAht = cfg.ahtBase * (queue === "Billing" ? 0.95 : 1.0); // Billing forecast is too optimistic

      // Staffing requirements (Erlang not modeled here, use a deterministic formula
      // that mirrors reality: ~6-7 calls per agent per 15 min at baseline AHT).
      const rawRequired = Math.ceil(
        (actualVolume * (actualAht / 900)) / 0.75 + 1,
      );
      const scheduled = Math.max(
        1,
        Math.round(
          (queue === "Billing" ? rawRequired * 1.05 : rawRequired * 0.92) *
            (slot.factor > 1.4 ? 0.88 : slot.factor < 0.5 ? 1.2 : 1),
        ),
      );

      // At peak, actual staff is lower than scheduled due to absenteeism + unscheduled AUX.
      const peakPenalty = slot.factor > 1.5 ? 0.92 : 1;
      // At 14:00-14:30 there's a scheduled team meeting causing AUX spike.
      const meetingPenalty = slot.h === 14 && slot.m < 30 ? 0.8 : 1;
      const actual = Math.max(0, Math.round(scheduled * peakPenalty * meetingPenalty * (0.95 + rng() * 0.08)));

      // Service level degrades when actual < required * 0.9
      const coverage = actual / Math.max(1, rawRequired);
      const serviceLevel = Math.max(
        0.3,
        Math.min(
          0.99,
          coverage > 1.05 ? 0.95 : coverage > 0.95 ? 0.88 : coverage * 0.9,
        ),
      );
      const asa = coverage > 1 ? 12 : coverage > 0.9 ? 28 : (1 - coverage) * 300 + 40;
      const abandoned = Math.round(actualVolume * (1 - serviceLevel) * 0.4);
      const offered = actualVolume;
      const answered = offered - abandoned;
      const occupancy = Math.min(0.98, Math.max(0.55, 0.7 + (1 - coverage) * 0.25));

      intervals.push({
        id: `${intervalLabel}-${queue}`,
        intervalStart: start,
        intervalEnd: end,
        date: start.toISOString().slice(0, 10),
        intervalLabel,
        queue,
        channel: "Voice", // collapsed; channel split is illustrative
        site: "All",
        forecastVolume: Math.round(forecastVolume * voiceShare),
        forecastAht,
        requiredStaff: Math.ceil(rawRequired * voiceShare),
        serviceLevelTarget: cfg.slTarget,
        serviceLevelThreshold: queue === "Sales" ? 15 : 20,
        actualVolume: Math.round(actualVolume * voiceShare),
        actualAht,
        offered: Math.round(offered * voiceShare),
        answered: Math.round(answered * voiceShare),
        abandoned: Math.round(abandoned * voiceShare),
        serviceLevel,
        asa,
        occupancy,
        scheduledStaff: Math.ceil(scheduled * voiceShare),
        actualStaff: Math.ceil(actual * voiceShare),
        sourceType: "actual",
      });

      // Add chat channel rows (lower AHT, concurrent)
      intervals.push({
        id: `${intervalLabel}-${queue}-chat`,
        intervalStart: start,
        intervalEnd: end,
        date: start.toISOString().slice(0, 10),
        intervalLabel,
        queue,
        channel: "Chat",
        site: "All",
        forecastVolume: Math.round(forecastVolume * chatShare),
        forecastAht: forecastAht * 0.8,
        requiredStaff: Math.max(1, Math.ceil((rawRequired * chatShare) / 2.5)),
        serviceLevelTarget: 0.8,
        serviceLevelThreshold: 30,
        actualVolume: Math.round(actualVolume * chatShare),
        actualAht: actualAht * 0.8,
        offered: Math.round(offered * chatShare),
        answered: Math.round(answered * chatShare),
        abandoned: Math.round(abandoned * chatShare * 0.3),
        serviceLevel: Math.min(0.99, serviceLevel + 0.05),
        asa: asa * 0.7,
        occupancy: Math.min(0.95, occupancy + 0.05),
        scheduledStaff: Math.max(1, Math.ceil((scheduled * chatShare) / 2.5)),
        actualStaff: Math.max(1, Math.ceil((actual * chatShare) / 2.5)),
        sourceType: "actual",
      });

      // Add email channel rows (asynchronous, low staffing per volume)
      intervals.push({
        id: `${intervalLabel}-${queue}-email`,
        intervalStart: start,
        intervalEnd: end,
        date: start.toISOString().slice(0, 10),
        intervalLabel,
        queue,
        channel: "Email",
        site: "All",
        forecastVolume: Math.round(forecastVolume * emailShare),
        forecastAht: forecastAht * 0.8,
        requiredStaff: Math.max(1, Math.ceil((rawRequired * emailShare) / 2.5)),
        serviceLevelTarget: 0.8,
        serviceLevelThreshold: 30,
        actualVolume: Math.round(actualVolume * emailShare),
        actualAht: actualAht * 0.8,
        offered: Math.round(offered * emailShare),
        answered: Math.round(answered * emailShare),
        abandoned: Math.round(abandoned * emailShare * 0.3),
        serviceLevel: Math.min(0.99, serviceLevel + 0.05),
        asa: asa * 0.7,
        occupancy: Math.min(0.95, occupancy + 0.05),
        scheduledStaff: Math.max(1, Math.ceil((scheduled * emailShare) / 2.5)),
        actualStaff: Math.max(1, Math.ceil((actual * emailShare) / 2.5)),
        sourceType: "actual",
      });

      void voiceShare; void chatShare; void emailShare; // silence unused
 // silence unused
    }

    // Generate agent-level rows for adherence
    const agentCount = 68;
    for (let i = 0; i < agentCount; i += 1) {
      const agentId = `A${String(i + 1).padStart(4, "0")}`;
      const agentName = `Agent ${i + 1}`;
      const team = TEAMS[i % TEAMS.length];
      const site = i % 5 === 0 ? "Lima" : "Bogotá"; // 20% in Lima
      const scheduleIsProduction = slot.h >= 8 && slot.h < 17;
      const lunchBlock =
        (team === "Alpha" && slot.h === 12) ||
        (team === "Bravo" && slot.h === 12 && slot.m >= 30) ||
        (team === "Charlie" && slot.h === 13) ||
        (team === "Delta" && slot.h === 13 && slot.m >= 30);
      const inMeeting = slot.h === 14 && slot.m < 30 && team === "Alpha";
      const isBreak =
        (slot.h === 10 && slot.m < 30 && team === "Alpha") ||
        (slot.h === 15 && slot.m < 30 && team === "Bravo");

      let scheduledActivity = "Production";
      if (!scheduleIsProduction) scheduledActivity = "Off Shift";
      else if (lunchBlock) scheduledActivity = "Lunch";
      else if (inMeeting) scheduledActivity = "Meeting";
      else if (isBreak) scheduledActivity = "Break";

      // Adherence: Lima has 88% vs Bogotá 95%. Introduce tardy agents at 8:00.
      let adherenceProb = site === "Lima" ? 0.88 : 0.95;
      if (slot.h === 8 && slot.m <= 30 && i % 7 === 0) adherenceProb = 0.3;
      if (scheduledActivity !== "Production") adherenceProb = 0.98;
      if (inMeeting && i % 4 === 0) adherenceProb = 0.7; // late to meeting

      const isAdherent = rng() < adherenceProb;
      let actualActivity = scheduledActivity;
      if (!isAdherent && scheduledActivity === "Production") {
        actualActivity = rng() < 0.5 ? "Aux - Personal" : "Aux - System Issue";
      } else if (!isAdherent) {
        actualActivity = "Production"; // early back
      }

      agentIntervals.push({
        id: `${agentId}-${intervalLabel}`,
        agentId,
        agentName,
        team,
        site,
        intervalStart: start,
        intervalEnd: end,
        scheduledActivity,
        actualActivity,
        isScheduledProduction: scheduledActivity === "Production",
        isActualProduction: actualActivity === "Production",
        isAdherent,
        auxCode: actualActivity.startsWith("Aux") ? actualActivity : undefined,
        auxDurationSec: !isAdherent ? 900 : 0,
        isPaid: true,
      });
    }
  }

  return {
    intervals,
    agentIntervals,
    queues: [...QUEUES],
    channels: [...CHANNELS],
    sites: [...SITES],
    teams: [...TEAMS],
    date,
    intervalMinutes: 15,
    kpis: KPI_DEFINITIONS,
    assumptions: [
      "Datos sintéticos etiquetados como DEMO. Cualquier parecido con operaciones reales es una coincidencia.",
      "Arribos modelados con perfil típico bimal; Erlang-C se usa para requerimiento.",
      "Shrinkage efectivo modelado en ~32% con pico no-planificado en la hora pico.",
      "SL calculado con exclusión de abandonos antes del umbral.",
    ],
  };
}
