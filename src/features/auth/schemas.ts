import { z } from "zod";

// Issue messages are translation keys (messages/<locale>.json → validation.*).

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "validation.emailRequired")
  .max(320, "validation.emailTooLong")
  .pipe(z.email("validation.emailInvalid"));

/** bcrypt truncates at 72 bytes; require length plus a mix of character classes. */
export const newPasswordSchema = z
  .string()
  .min(10, "validation.passwordMin")
  .max(72, "validation.passwordMax")
  .refine((value) => /[a-z]/i.test(value) && /\d/.test(value), "validation.passwordComplexity");

const nextSchema = z.string().max(512).optional();

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "validation.passwordRequired").max(72),
  next: nextSchema,
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "validation.nameRequired").max(120, "validation.nameTooLong"),
  email: emailSchema,
  password: newPasswordSchema,
  acceptTerms: z.boolean().refine((value) => value, "validation.acceptTerms"),
  next: nextSchema,
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const newPasswordFormSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, "validation.confirmPasswordRequired"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "validation.passwordMismatch",
  });

export type SignInInput = z.input<typeof signInSchema>;
export type SignUpInput = z.input<typeof signUpSchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type NewPasswordInput = z.input<typeof newPasswordFormSchema>;
