export const appErrorCodes = {
	files: {
		backendLoadFailed: "files.backend_load_failed",
		confirmFailed: "files.confirm_failed",
		deleteFailed: "files.delete_failed",
		loadFailed: "files.load_failed",
		notFound: "files.not_found",
		signedAccessFailed: "files.signed_access_failed",
		uploadFailed: "files.upload_failed",
	},
	todo: {
		createFailed: "todo.create_failed",
		notFound: "todo.not_found",
	},
} as const;

export const appErrorCodeValues = [
	appErrorCodes.files.backendLoadFailed,
	appErrorCodes.files.confirmFailed,
	appErrorCodes.files.deleteFailed,
	appErrorCodes.files.loadFailed,
	appErrorCodes.files.notFound,
	appErrorCodes.files.signedAccessFailed,
	appErrorCodes.files.uploadFailed,
	appErrorCodes.todo.createFailed,
	appErrorCodes.todo.notFound,
] as const;

export type AppErrorCode = (typeof appErrorCodeValues)[number];

export type AppErrorParams = Record<string, string | number>;

export const appErrorTranslationKeys = {
	[appErrorCodes.files.backendLoadFailed]: "files.status.backendLoadError",
	[appErrorCodes.files.confirmFailed]: "files.status.confirmFailed",
	[appErrorCodes.files.deleteFailed]: "files.status.deleteFailed",
	[appErrorCodes.files.loadFailed]: "files.status.loadError",
	[appErrorCodes.files.notFound]: "files.status.notFound",
	[appErrorCodes.files.signedAccessFailed]: "files.status.signedAccessFailed",
	[appErrorCodes.files.uploadFailed]: "files.status.uploadFailed",
	[appErrorCodes.todo.createFailed]: "errors.todo.createFailed",
	[appErrorCodes.todo.notFound]: "errors.todo.notFound",
} as const satisfies Record<AppErrorCode, string>;

export type AppErrorTranslationKey =
	(typeof appErrorTranslationKeys)[keyof typeof appErrorTranslationKeys];
