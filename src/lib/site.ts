export const siteConfig = {
  name: "NextCampus",
  tagline: "Secure, trusted, modern digital assessments",
  description:
    "NextCampus is the multi-tenant assessment platform for universities, coaching centers, training organizations and independent instructors — with role-based access, audit trails and integrity built in.",
  contactEmail: "hello@nextcampus.app",
  marketingNav: [
    { href: "/features", label: "Features" },
    { href: "/exams", label: "Exam catalog" },
    { href: "/solutions", label: "Solutions" },
    { href: "/pricing", label: "Pricing" },
    { href: "/faq", label: "FAQ" },
  ],
  footerNav: [
    {
      title: "Product",
      links: [
        { href: "/features", label: "Features" },
        { href: "/exams", label: "Exam catalog" },
        { href: "/pricing", label: "Pricing" },
      ],
    },
    {
      title: "Institutions",
      links: [
        { href: "/solutions", label: "Solutions" },
        { href: "/faq", label: "FAQ" },
        { href: "/contact", label: "Contact" },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: "/legal/privacy", label: "Privacy policy" },
        { href: "/legal/terms", label: "Terms of service" },
        { href: "/legal/acceptable-use", label: "Acceptable use" },
      ],
    },
  ],
} as const;

export const PUBLIC_ROUTES = [
  "/",
  "/features",
  "/exams",
  "/solutions",
  "/pricing",
  "/faq",
  "/contact",
  "/legal/privacy",
  "/legal/terms",
  "/legal/acceptable-use",
  "/sign-in",
  "/sign-up",
] as const;
