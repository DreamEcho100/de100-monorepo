import type {
	UploaderCreateTargetResult,
	UploaderMetadata,
	UploaderProviderAdapter,
	UploaderRecordRef,
	UploaderRecordVisibility,
} from "./adapters";
import type { UploaderCandidateFile, UploaderFileKind } from "./contracts";
import type { UploadResolvedTransport } from "./transport-policy";

const documentMimeTypes = new Set([
	"application/pdf",
	"application/msword",
	"application/vnd.ms-excel",
	"application/vnd.ms-powerpoint",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/rtf",
	"application/vnd.oasis.opendocument.text",
	"text/csv",
	"text/markdown",
	"text/plain",
]);

const documentExtensions = [
	".csv",
	".doc",
	".docx",
	".md",
	".odp",
	".ods",
	".odt",
	".pdf",
	".ppt",
	".pptx",
	".rtf",
	".txt",
	".xls",
	".xlsx",
];

const endsWithKnownDocumentExtension = (fileName: string) =>
	documentExtensions.some((extension) => fileName.toLowerCase().endsWith(extension));

export function inferUploaderFileKind(fileName: string, mimeType: string): UploaderFileKind {
	if (mimeType.startsWith("image/")) {
		return "image";
	}

	if (mimeType.startsWith("video/")) {
		return "video";
	}

	if (mimeType.startsWith("audio/")) {
		return "audio";
	}

	if (documentMimeTypes.has(mimeType) || endsWithKnownDocumentExtension(fileName)) {
		return "document";
	}

	return "file";
}

export function toUploaderCandidateFile(file: {
	lastModified?: number;
	name: string;
	size: number;
	type: string;
}): UploaderCandidateFile {
	return {
		kind: inferUploaderFileKind(file.name, file.type),
		lastModified: file.lastModified,
		name: file.name,
		size: file.size,
		type: file.type,
	};
}

export function buildUploadMetadata(
	candidate: UploaderCandidateFile,
	extraMetadata: UploaderMetadata = {},
): UploaderMetadata {
	return {
		fileKind: candidate.kind,
		lastModified: candidate.lastModified,
		originalFileName: candidate.name,
		...extraMetadata,
	};
}

export type ProviderUploadTargetInput = {
	adapter: UploaderProviderAdapter;
	candidate: UploaderCandidateFile;
	metadata?: UploaderMetadata;
	transport: UploadResolvedTransport;
	visibility: UploaderRecordVisibility;
};

export async function createProviderUploadTarget(
	input: ProviderUploadTargetInput,
): Promise<UploaderCreateTargetResult> {
	return input.adapter.createUploadTarget({
		contentType: input.candidate.type || "application/octet-stream",
		fileName: input.candidate.name,
		fileSize: input.candidate.size,
		metadata: buildUploadMetadata(input.candidate, input.metadata),
		transport: input.transport,
		visibility: input.visibility,
	});
}

export type ProviderUploadRequest = {
	body: BodyInit;
	headers: HeadersInit;
	method: "POST" | "PUT";
	targetId: string;
	url: string;
};

export function buildProviderUploadRequest(
	target: UploaderCreateTargetResult,
	blob: Blob,
	fileName: string,
): ProviderUploadRequest {
	if (target.method === "POST" && target.fields) {
		const formData = new FormData();
		for (const [field, value] of Object.entries(target.fields)) {
			formData.append(field, value);
		}
		formData.append("file", blob, fileName);

		return {
			body: formData,
			headers: target.headers ?? {},
			method: target.method,
			targetId: target.targetId,
			url: target.uploadUrl,
		};
	}

	return {
		body: blob,
		headers: target.headers ?? {},
		method: target.method,
		targetId: target.targetId,
		url: target.uploadUrl,
	};
}

export async function confirmProviderUpload(
	adapter: UploaderProviderAdapter,
	targetId: string,
): Promise<UploaderRecordRef> {
	return adapter.confirmUpload({ targetId });
}

export async function cancelProviderUpload(
	adapter: UploaderProviderAdapter,
	targetId: string,
	reason?: string,
): Promise<void> {
	if (!adapter.cancelUpload) {
		return;
	}

	await adapter.cancelUpload({ reason, targetId });
}
