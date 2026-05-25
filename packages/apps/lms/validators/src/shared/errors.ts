export const appErrorCodes = {
	media: {
		backendLoadFailed: "media.backend_load_failed",
		confirmFailed: "media.confirm_failed",
		deleteFailed: "media.delete_failed",
		loadFailed: "media.load_failed",
		notFound: "media.not_found",
		signedAccessFailed: "media.signed_access_failed",
		uploadFailed: "media.upload_failed",
	},
	todo: {
		createFailed: "todo.create_failed",
		notFound: "todo.not_found",
	},
} as const;

export const appErrorCodeValues = [
	appErrorCodes.media.backendLoadFailed,
	appErrorCodes.media.confirmFailed,
	appErrorCodes.media.deleteFailed,
	appErrorCodes.media.loadFailed,
	appErrorCodes.media.notFound,
	appErrorCodes.media.signedAccessFailed,
	appErrorCodes.media.uploadFailed,
	appErrorCodes.todo.createFailed,
	appErrorCodes.todo.notFound,
] as const;

export type AppErrorCode = (typeof appErrorCodeValues)[number];

export type AppErrorParams = Record<string, string | number>;

export const appErrorTranslationKeys = {
	[appErrorCodes.media.backendLoadFailed]: "media.status.backendLoadError",
	[appErrorCodes.media.confirmFailed]: "media.status.confirmFailed",
	[appErrorCodes.media.deleteFailed]: "media.status.deleteFailed",
	[appErrorCodes.media.loadFailed]: "media.status.loadError",
	[appErrorCodes.media.notFound]: "media.status.notFound",
	[appErrorCodes.media.signedAccessFailed]: "media.status.signedAccessFailed",
	[appErrorCodes.media.uploadFailed]: "media.status.uploadFailed",
	[appErrorCodes.todo.createFailed]: "errors.todo.createFailed",
	[appErrorCodes.todo.notFound]: "errors.todo.notFound",
} as const satisfies Record<AppErrorCode, string>;

export type AppErrorTranslationKey =
	(typeof appErrorTranslationKeys)[keyof typeof appErrorTranslationKeys];
