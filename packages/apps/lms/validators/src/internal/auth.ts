import { z } from "zod/v4";

export const signInInputSchema = z.object({
	email: z.email("Invalid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signUpInputSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters"),
	email: z.email("Invalid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

export const forgotPasswordInputSchema = z.object({
	email: z.email("Invalid email address"),
});

export const resendVerificationEmailInputSchema = z.object({
	email: z.email("Invalid email address"),
});

export const resetPasswordInputSchema = z
	.object({
		confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
		password: z.string().min(8, "Password must be at least 8 characters"),
	})
	.refine((value) => value.password === value.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});
