import { z } from "zod";

export const timezoneSchema = z
  .string()
  .min(1, "Choose your time zone.")
  .max(64)
  .refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid time zone.");

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your full name.").max(120, "Name is too long."),
  displayName: z.string().trim().max(60, "Display name is too long."),
  timezone: timezoneSchema,
});

export const profileSettingsSchema = profileSchema.extend({
  marketingOptIn: z.boolean(),
});

export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileSettingsInput = z.input<typeof profileSettingsSchema>;
