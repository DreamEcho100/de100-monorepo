export const mediaValidationErrorKeys = {
	expectedFileUpload: "validation.expectedFileUpload",
} as const;

export type MediaValidationErrorKey =
	(typeof mediaValidationErrorKeys)[keyof typeof mediaValidationErrorKeys];
