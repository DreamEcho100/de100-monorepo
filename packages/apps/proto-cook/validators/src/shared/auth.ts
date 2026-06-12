export const authValidationErrorKeys = {
	invalidEmail: "validation.invalidEmail",
	nameMinLength: "validation.nameMinLength",
	passwordMinLength: "validation.passwordMinLength",
	passwordsDoNotMatch: "validation.passwordsDoNotMatch",
} as const;

export type AuthValidationErrorKey =
	(typeof authValidationErrorKeys)[keyof typeof authValidationErrorKeys];
