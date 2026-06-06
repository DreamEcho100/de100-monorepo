export const filesErrorCodes = {
	adapterUnavailable: "files.adapter_unavailable",
	invalidFileCount: "files.invalid_file_count",
	invalidFileSize: "files.invalid_file_size",
	invalidFileType: "files.invalid_file_type",
	invalidRouteConfig: "files.invalid_route_config",
	missingDependency: "files.missing_dependency",
	notFound: "files.not_found",
	providerUnavailable: "files.provider_unavailable",
	signedAccessInvalid: "files.signed_access_invalid",
	storageFailed: "files.storage_failed",
	uploadAborted: "files.upload_aborted",
	uploadFailed: "files.upload_failed",
} as const;

export type FilesErrorCode = (typeof filesErrorCodes)[keyof typeof filesErrorCodes];

export class FilesError extends Error {
	readonly code: FilesErrorCode;
	readonly cause?: unknown;

	constructor(code: FilesErrorCode, message: string, options?: { cause?: unknown }) {
		super(message);
		this.name = "FilesError";
		this.code = code;
		this.cause = options?.cause;
	}
}
