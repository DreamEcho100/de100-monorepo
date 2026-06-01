import type { UploadResolvedTransport } from "./transport-policy";

export type UploaderRecordVisibility = "private" | "public";

export type UploaderTargetMethod = "POST" | "PUT";

export type UploaderMetadata = Record<string, string | number | boolean | null | undefined>;

export type UploaderCreateTargetInput = {
	contentType: string;
	fileName: string;
	fileSize: number;
	metadata?: UploaderMetadata;
	transport: UploadResolvedTransport;
	visibility: UploaderRecordVisibility;
};

export type UploaderCreateTargetResult = {
	expiresAt?: Date | string;
	fields?: Record<string, string>;
	headers?: Record<string, string>;
	method: UploaderTargetMethod;
	targetId: string;
	uploadUrl: string;
};

export type UploaderConfirmUploadInput = {
	targetId: string;
};

export type UploaderCancelUploadInput = {
	reason?: string;
	targetId: string;
};

export type UploaderRecordRef = {
	id: string;
	key: string;
	visibility: UploaderRecordVisibility;
};

export type UploaderProviderAdapter = {
	cancelUpload?: (input: UploaderCancelUploadInput) => Promise<void>;
	confirmUpload: (input: UploaderConfirmUploadInput) => Promise<UploaderRecordRef>;
	createUploadTarget: (input: UploaderCreateTargetInput) => Promise<UploaderCreateTargetResult>;
	providerId: string;
};
