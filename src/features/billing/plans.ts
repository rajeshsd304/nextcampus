/**
 * Student plans (informational). Prices are in BDT; `null` means the price has
 * not been announced. Copy lives in messages `plans.<id>`. No checkout exists
 * until a payment provider (bKash) is integrated.
 */
export type Plan = {
  id: "free" | "premium";
  priceBdt: number | null;
  /** Feature keys under messages `plans.features`. */
  features: readonly PlanFeature[];
  status: "available" | "comingSoon";
  highlighted?: boolean;
};

export type PlanFeature =
  | "account"
  | "catalog"
  | "bilingual"
  | "practiceSamples"
  | "fullPractice"
  | "modelTests"
  | "writtenFeedback"
  | "analytics"
  | "leaderboard";

export const PLANS: readonly Plan[] = [
  {
    id: "free",
    priceBdt: 0,
    features: ["account", "catalog", "bilingual", "practiceSamples"],
    status: "available",
  },
  {
    id: "premium",
    priceBdt: null,
    features: ["fullPractice", "modelTests", "writtenFeedback", "analytics", "leaderboard"],
    status: "comingSoon",
    highlighted: true,
  },
];
