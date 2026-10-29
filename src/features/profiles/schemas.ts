import { z } from "zod";

export const timezoneSchema = z
  .string()
  .min(1, "validation.timezoneRequired")
  .max(64)
  .refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "validation.timezoneInvalid");

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, "validation.fullNameRequired").max(120, "validation.nameTooLong"),
  displayName: z.string().trim().max(60, "validation.displayNameTooLong"),
  timezone: timezoneSchema,
});

export const profileSettingsSchema = profileSchema.extend({
  marketingOptIn: z.boolean(),
});

export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileSettingsInput = z.input<typeof profileSettingsSchema>;
