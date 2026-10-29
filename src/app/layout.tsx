import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { CLIENT_NAMESPACES } from "@/i18n/messages";
import { getSiteUrl } from "@/lib/env";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display-face", display: "swap" });
const bengali = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bengali",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  const locale = await getLocale();
  const title = t("defaultTitle");
  return {
    metadataBase: new URL(getSiteUrl()),
    title: { default: title, template: t("titleTemplate", { page: "%s" }) },
    description: t("description"),
    applicationName: t("siteName"),
    openGraph: {
      type: "website",
      siteName: t("siteName"),
      title,
      description: t("description"),
      url: "/",
      locale: locale === "bn" ? "bn_BD" : "en_GB",
      alternateLocale: locale === "bn" ? ["en_GB"] : ["bn_BD"],
    },
    twitter: { card: "summary_large_image", title: t("siteName"), description: t("description") },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#060b1d" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations("common");
  const clientMessages = Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, messages[ns]]));

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${display.variable} ${bengali.variable}`}
    >
      <body className="min-h-dvh">
        <a
          href="#main"
          className="bg-primary text-primary-foreground sr-only z-[100] rounded-lg px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:inline-flex focus:min-h-11 focus:items-center"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider locale={locale} messages={clientMessages}>
          <ThemeProvider>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
