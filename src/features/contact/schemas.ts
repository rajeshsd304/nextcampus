import { z } from "zod";
import { emailSchema } from "@/features/auth/schemas";

export const CONTACT_TOPICS = ["sales", "support", "partnership", "security", "other"] as const;

export const CONTACT_TOPIC_LABELS: Record<(typeof CONTACT_TOPICS)[number], string> = {
  sales: "Sales and pricing",
  support: "Product support",
  partnership: "Partnerships",
  security: "Security or privacy",
  other: "Something else",
};

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  email: emailSchema,
  organization: z.string().trim().max(160),
  topic: z.enum(CONTACT_TOPICS),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters).").max(4000),
  // Honeypot: real users never fill this hidden field.
  website: z.string().max(0).optional(),
});

export type ContactInput = z.input<typeof contactSchema>;
