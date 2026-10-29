export type Plan = {
  id: "starter" | "institution" | "enterprise";
  name: string;
  tagline: string;
  priceMonthly: number | null;
  audience: string;
  features: string[];
  cta: { label: string; href: string };
  highlighted?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For independent instructors running their first secure exams.",
    priceMonthly: 0,
    audience: "Up to 50 candidates",
    features: [
      "Unlimited practice assessments",
      "Role-based access for one organization",
      "Email and Google sign-in",
      "Community support",
    ],
    cta: { label: "Start free", href: "/sign-up" },
  },
  {
    id: "institution",
    name: "Institution",
    tagline: "For coaching centers and departments that need oversight.",
    priceMonthly: 149,
    audience: "Up to 2,000 candidates",
    features: [
      "Everything in Starter",
      "Invigilator and reviewer roles",
      "Audit trail for every administrative change",
      "Priority email support",
    ],
    cta: { label: "Talk to sales", href: "/contact?topic=sales" },
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For universities with compliance and integration needs.",
    priceMonthly: null,
    audience: "Unlimited candidates",
    features: [
      "Everything in Institution",
      "Single sign-on and custom domains",
      "Data residency options",
      "Dedicated success manager and SLA",
    ],
    cta: { label: "Contact us", href: "/contact?topic=sales" },
  },
];
