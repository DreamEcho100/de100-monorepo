export type Brand<TValue, TBrand extends string> = TValue & { readonly __brand: TBrand };

export type FileId = Brand<string, "FileId">;
export type FileUploadSessionId = Brand<string, "FileUploadSessionId">;
export type FileVariantId = Brand<string, "FileVariantId">;
export type FileProcessingJobId = Brand<string, "FileProcessingJobId">;
export type FileRouteSlug = Brand<string, "FileRouteSlug">;
export type StorageKey = Brand<string, "StorageKey">;

export function brandFileId(value: string): FileId {
	return value as FileId;
}

export function brandFileUploadSessionId(value: string): FileUploadSessionId {
	return value as FileUploadSessionId;
}

export function brandFileVariantId(value: string): FileVariantId {
	return value as FileVariantId;
}

export function brandFileProcessingJobId(value: string): FileProcessingJobId {
	return value as FileProcessingJobId;
}

export function brandFileRouteSlug(value: string): FileRouteSlug {
	return value as FileRouteSlug;
}

export function brandStorageKey(value: string): StorageKey {
	return value as StorageKey;
}
