import { z } from "zod/v4";

import { authValidationErrorKeys } from "../shared/auth";

export const signInInputSchema = z.object({
	email: z.email(authValidationErrorKeys.invalidEmail),
	password: z.string().min(8, authValidationErrorKeys.passwordMinLength),
});

export const signUpInputSchema = z.object({
	name: z.string().min(2, authValidationErrorKeys.nameMinLength),
	email: z.email(authValidationErrorKeys.invalidEmail),
	password: z.string().min(8, authValidationErrorKeys.passwordMinLength),
});

export const forgotPasswordInputSchema = z.object({
	email: z.email(authValidationErrorKeys.invalidEmail),
});

export const resendVerificationEmailInputSchema = z.object({
	email: z.email(authValidationErrorKeys.invalidEmail),
});

export const resetPasswordInputSchema = z
	.object({
		confirmPassword: z.string().min(8, authValidationErrorKeys.passwordMinLength),
		password: z.string().min(8, authValidationErrorKeys.passwordMinLength),
	})
	.refine((value) => value.password === value.confirmPassword, {
		message: authValidationErrorKeys.passwordsDoNotMatch,
		path: ["confirmPassword"],
	});
