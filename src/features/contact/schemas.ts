import { z } from "zod";
import { emailSchema } from "@/features/auth/schemas";

/** Labels: messages `contactForm.topics.<topic>`. */
export const CONTACT_TOPICS = ["sales", "support", "partnership", "security", "other"] as const;

export const contactSchema = z.object({
  name: z.string().trim().min(1, "validation.nameRequired").max(120, "validation.nameTooLong"),
  email: emailSchema,
  organization: z.string().trim().max(160, "validation.textTooLong"),
  topic: z.enum(CONTACT_TOPICS),
  message: z.string().trim().min(10, "validation.messageMin").max(4000, "validation.textTooLong"),
  // Honeypot: real users never fill this hidden field.
  website: z.string().max(0).optional(),
});

export type ContactInput = z.input<typeof contactSchema>;
