import { z } from "zod";

/**
 * Instagram-style username validation rules:
 * - Allowed chars: lowercase letters (a-z), numbers (0-9), period (.), underscore (_)
 * - Length: 3 to 30 characters
 * - Must start with a letter or number
 * - Cannot end with a period
 * - No consecutive periods (..)
 * - No spaces or other special characters
 * - Case-insensitive (normalized to lowercase)
 */
export const USERNAME_REGEX = /^[a-z0-9](?!.*\.\.)[a-z0-9._]{1,28}[a-z0-9_]$/;

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username cannot exceed 30 characters")
  .refine((val) => /^[a-z0-9]/.test(val), {
    message: "Username must start with a letter or number",
  })
  .refine((val) => !val.endsWith("."), {
    message: "Username cannot end with a period",
  })
  .refine((val) => !val.includes(".."), {
    message: "Username cannot contain consecutive periods",
  })
  .refine((val) => /^[a-z0-9._]+$/.test(val), {
    message: "Username can only contain letters, numbers, periods, and underscores",
  })
  .refine((val) => USERNAME_REGEX.test(val), {
    message: "Invalid username format",
  });

/**
 * Password validation rule:
 * - Minimum 8 characters
 * - Up to 128 characters
 * - Does not force a strict mix of special characters, allowing strong passphrases
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password cannot exceed 128 characters");

/**
 * Normalized email schema
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email address")
  .max(255, "Email address is too long");

/**
 * Full name schema
 */
export const nameSchema = z
  .string()
  .trim()
  .min(1, "Full name is required")
  .max(70, "Full name cannot exceed 70 characters");

/**
 * Registration schema
 */
export const registerSchema = z
  .object({
    name: nameSchema,
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Login schema (supports email or username in the identifier field)
 */
export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Please enter your email or username")
    .transform((val) => val.toLowerCase()),
  password: z.string().min(1, "Please enter your password"),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Change password schema (for logged-in users inside Profile & Account)
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Profile update schema
 */
export const updateProfileSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
