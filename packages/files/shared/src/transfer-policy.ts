import type {
	FileKind,
	FilesApiApproach,
	FilesDeliveryStrategy,
	FilesProcessingMode,
	FilesStorageBackend,
	FilesUploadIntegration,
	FilesUploadProtocol,
	FilesUploadProtocolPreference,
	FilesUploadTargetProtocol,
} from "./constants";

export const defaultDirectOrpcUploadMaxBytes = 25 * 1024 * 1024;
export const defaultS3MultipartThresholdBytes = 100 * 1024 * 1024;

export type FilesUploadApiMode = "orpc-direct" | "upload-target";

export type FilesUploadModeDecisionReason =
	| "direct-disabled"
	| "direct-supported"
	| "processing-integration-required"
	| "resumable-required"
	| "s3-compatible-multipart"
	| "s3-compatible-single-part"
	| "size-exceeds-direct-limit";

export type FilesUploadPlan = {
	approach: FilesApiApproach;
	deliveryStrategy: FilesDeliveryStrategy;
	integrations: FilesUploadIntegration[];
	mode: FilesUploadApiMode;
	processingMode: FilesProcessingMode;
	protocol: FilesUploadProtocol;
	reason: FilesUploadModeDecisionReason;
	storageBackend: FilesStorageBackend;
};

export type FilesUploadModeDecision = FilesUploadPlan;

export type SelectFilesUploadModeInput = {
	allowDirectOrpc?: boolean;
	apiApproach?: FilesApiApproach;
	contentType?: string;
	enabledIntegrations?: FilesUploadIntegration[];
	fileSize: number;
	forcedProtocol?: FilesUploadProtocol;
	kind?: FileKind;
	maxDirectUploadBytes?: number;
	processingMode?: FilesProcessingMode;
	requiresResumable?: boolean;
	routeProtocols?: FilesUploadProtocolPreference[];
	s3MultipartThresholdBytes?: number;
	storageBackend?: FilesStorageBackend;
};

export function selectFilesUploadMode(input: SelectFilesUploadModeInput): FilesUploadModeDecision {
	const allowDirectOrpc = input.allowDirectOrpc ?? true;
	const approach = input.apiApproach ?? "hybrid";
	const storageBackend = input.storageBackend ?? "local-fs";
	const maxDirectUploadBytes = input.maxDirectUploadBytes ?? defaultDirectOrpcUploadMaxBytes;
	const s3MultipartThresholdBytes =
		input.s3MultipartThresholdBytes ?? defaultS3MultipartThresholdBytes;
	const kind = input.kind ?? inferFileKindFromContentType(input.contentType);
	const processingMode = input.processingMode ?? "none";
	const integrations = [...(input.enabledIntegrations ?? [])];

	if (input.forcedProtocol) {
		return createPlan({
			approach,
			integrations,
			mode: input.forcedProtocol === "orpc-direct" ? "orpc-direct" : "upload-target",
			processingMode,
			protocol: input.forcedProtocol,
			reason: input.forcedProtocol === "orpc-direct" ? "direct-supported" : "direct-disabled",
			storageBackend,
		});
	}

	if (processingMode === "transloadit-assembly" && integrations.includes("transloadit")) {
		return createPlan({
			approach,
			integrations,
			mode: "upload-target",
			processingMode,
			protocol: "custom",
			reason: "processing-integration-required",
			storageBackend,
		});
	}

	if (isS3StorageBackend(storageBackend)) {
		const protocol =
			input.requiresResumable || input.fileSize >= s3MultipartThresholdBytes
				? "s3-multipart"
				: "s3-put";

		return createPlan({
			approach,
			integrations,
			mode: "upload-target",
			processingMode,
			protocol: selectAllowedTargetProtocol(protocol, input.routeProtocols, kind),
			reason: protocol === "s3-multipart" ? "s3-compatible-multipart" : "s3-compatible-single-part",
			storageBackend,
		});
	}

	if (
		approach === "hybrid" &&
		allowDirectOrpc &&
		!input.requiresResumable &&
		input.fileSize <= maxDirectUploadBytes
	) {
		return createPlan({
			approach,
			integrations,
			mode: "orpc-direct",
			processingMode,
			protocol: "orpc-direct",
			reason: "direct-supported",
			storageBackend,
		});
	}

	const protocol = selectAllowedTargetProtocol(
		input.requiresResumable || kind === "video" || kind === "audio" ? "tus" : "xhr",
		input.routeProtocols,
		kind,
	);

	return createPlan({
		approach,
		integrations,
		mode: "upload-target",
		processingMode,
		protocol,
		reason: input.requiresResumable
			? "resumable-required"
			: allowDirectOrpc
				? "size-exceeds-direct-limit"
				: "direct-disabled",
		storageBackend,
	});
}

export function inferFileKindFromContentType(contentType?: string): FileKind {
	const normalized = contentType?.toLowerCase().trim() ?? "";

	if (normalized.startsWith("image/")) {
		return "image";
	}

	if (normalized.startsWith("video/")) {
		return "video";
	}

	if (normalized.startsWith("audio/")) {
		return "audio";
	}

	if (
		normalized === "application/pdf" ||
		normalized.startsWith("text/") ||
		normalized.includes("document") ||
		normalized.includes("presentation") ||
		normalized.includes("spreadsheet")
	) {
		return "document";
	}

	return "file";
}

function createPlan(input: Omit<FilesUploadPlan, "deliveryStrategy">): FilesUploadPlan {
	return {
		...input,
		deliveryStrategy: selectDeliveryStrategy(input),
	};
}

function selectDeliveryStrategy(
	input: Pick<FilesUploadPlan, "mode" | "protocol" | "storageBackend">,
): FilesDeliveryStrategy {
	if (input.mode === "orpc-direct") {
		return "orpc-blob";
	}

	if (input.protocol === "s3-put" || input.protocol === "s3-multipart") {
		return "provider-url";
	}

	if (input.storageBackend === "local-fs") {
		return "range-http";
	}

	return "signed-url";
}

function isS3StorageBackend(storageBackend: FilesStorageBackend) {
	return (
		storageBackend === "minio-s3" ||
		storageBackend === "r2-s3" ||
		storageBackend === "s3-compatible"
	);
}

function selectAllowedTargetProtocol(
	preferredProtocol: FilesUploadTargetProtocol,
	protocols: FilesUploadProtocolPreference[] | undefined,
	kind: FileKind,
): FilesUploadTargetProtocol {
	const normalized = normalizeTargetProtocols(protocols);
	if (normalized.has(preferredProtocol)) {
		return preferredProtocol;
	}

	const preference =
		kind === "video" || kind === "audio"
			? (["tus", "s3-multipart", "s3-put", "xhr", "custom"] as const)
			: (["s3-put", "xhr", "s3-multipart", "tus", "custom"] as const);

	for (const protocol of preference) {
		if (normalized.has(protocol)) {
			return protocol;
		}
	}

	return "xhr";
}

function normalizeTargetProtocols(protocols: FilesUploadProtocolPreference[] = ["auto"]) {
	const normalized = new Set<FilesUploadTargetProtocol>();

	for (const protocol of protocols) {
		if (protocol === "auto") {
			normalized.add("xhr");
			normalized.add("tus");
			normalized.add("s3-put");
			normalized.add("s3-multipart");
			continue;
		}

		normalized.add(protocol);
	}

	return normalized;
}
