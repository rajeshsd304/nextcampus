import { z } from "zod";

/**
 * Environment validation. Public values are read with literal
 * `process.env.NEXT_PUBLIC_*` access so Next.js can inline them; server values
 * are only read through `getServerEnv()` (imported from server-only modules).
 */

const publicSchema = z.object({
  siteUrl: z.url().transform((url) => url.replace(/\/+$/, "")),
  supabaseUrl: z.url(),
  supabasePublishableKey: z.string().min(20, "Supabase publishable/anon key looks invalid"),
});

export type PublicEnv = z.infer<typeof publicSchema>;

let publicEnv: PublicEnv | undefined;

export function getPublicEnv(): PublicEnv {
  if (publicEnv) return publicEnv;
  const parsed = publicSchema.safeParse({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error(`Invalid public environment configuration:\n${z.prettifyError(parsed.error)}`);
  }
  publicEnv = parsed.data;
  return publicEnv;
}

/** Site URL for metadata/sitemaps; never throws so static generation works without Supabase config. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return z.url().safeParse(raw).success ? raw.replace(/\/+$/, "") : "http://localhost:3000";
}

const serverSchema = z
  .object({
    EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
    EMAIL_FROM: z.string().min(3).default("NextCampus <no-reply@nextcampus.local>"),
    RESEND_API_KEY: z.string().min(1).optional(),
    CONTACT_NOTIFICATION_EMAIL: z.email().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.EMAIL_PROVIDER === "resend" && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "Required when EMAIL_PROVIDER=resend",
      });
    }
  });

export type ServerEnv = z.infer<typeof serverSchema>;

let serverEnv: ServerEnv | undefined;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const parsed = serverSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid server environment configuration:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() must not be called in the browser");
  }
  serverEnv ??= parseServerEnv(process.env);
  return serverEnv;
}
