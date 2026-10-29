import { z } from "zod";
import { LOCALES, NUMERAL_SYSTEMS } from "@/i18n/config";

export const preferencesSchema = z.object({
  locale: z.enum(LOCALES).optional(),
  numerals: z.enum(NUMERAL_SYSTEMS).optional(),
});
