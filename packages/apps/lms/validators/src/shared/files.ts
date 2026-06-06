export const filesValidationErrorKeys = {
	expectedFileUpload: "validation.expectedFileUpload",
} as const;

export type FilesValidationErrorKey =
	(typeof filesValidationErrorKeys)[keyof typeof filesValidationErrorKeys];
