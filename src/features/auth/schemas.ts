import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address.")
  .max(320, "Email address is too long.")
  .pipe(z.email("Enter a valid email address."));

/** bcrypt truncates at 72 bytes; require length plus a mix of character classes. */
export const newPasswordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(72, "Use at most 72 characters.")
  .refine((value) => /[a-z]/i.test(value) && /\d/.test(value), "Include at least one letter and one number.");

const nextSchema = z.string().max(512).optional();

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(72),
  next: nextSchema,
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(120, "Name is too long."),
  email: emailSchema,
  password: newPasswordSchema,
  acceptTerms: z.boolean().refine((value) => value, "You must accept the terms to continue."),
  next: nextSchema,
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const newPasswordFormSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type SignInInput = z.input<typeof signInSchema>;
export type SignUpInput = z.input<typeof signUpSchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type NewPasswordInput = z.input<typeof newPasswordFormSchema>;
