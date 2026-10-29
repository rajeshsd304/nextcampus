/** Brand name is not translated. */
export const BRAND = { first: "Next", second: "Campus", full: "NextCampus" } as const;

export const siteConfig = {
  contactEmail: "hello@nextcampus.app",
  /** Labels: messages `nav.<key>`. */
  marketingNav: [
    { href: "/exams", key: "exams" },
    { href: "/features", key: "features" },
    { href: "/pricing", key: "pricing" },
    { href: "/faq", key: "faq" },
    { href: "/contact", key: "contact" },
  ],
  /** Titles: messages `nav.footer.<group>`; labels: messages `nav.<key>`. */
  footerNav: [
    {
      group: "product",
      links: [
        { href: "/exams", key: "exams" },
        { href: "/features", key: "features" },
        { href: "/pricing", key: "pricing" },
      ],
    },
    {
      group: "support",
      links: [
        { href: "/faq", key: "faq" },
        { href: "/contact", key: "contact" },
        { href: "/solutions", key: "solutions" },
      ],
    },
    {
      group: "legal",
      links: [
        { href: "/legal/privacy", key: "privacy" },
        { href: "/legal/terms", key: "terms" },
        { href: "/legal/acceptable-use", key: "acceptableUse" },
      ],
    },
  ],
} as const;

export type NavKey =
  | (typeof siteConfig.marketingNav)[number]["key"]
  | (typeof siteConfig.footerNav)[number]["links"][number]["key"];

/** Static public routes for the sitemap; catalog pages are added from the database. */
export const PUBLIC_ROUTES = [
  "/",
  "/exams",
  "/features",
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
