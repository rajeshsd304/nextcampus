import { z } from "zod";
import { ORG_ROLES } from "@/features/access/roles";
import { emailSchema } from "@/features/auth/schemas";

export const createInvitationSchema = z.object({
  organizationId: z.uuid(),
  email: emailSchema,
  role: z.enum(ORG_ROLES, { error: "Choose a role." }),
});

export const invitationIdSchema = z.object({ invitationId: z.uuid() });

export const invitationTokenSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/, "Invalid invitation link."),
});

export type CreateInvitationInput = z.input<typeof createInvitationSchema>;
