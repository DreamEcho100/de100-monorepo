import type { FilesGeneratedVariant } from "@de100/files-shared";

export const filesDocumentProcessingAddonName = "@de100/files-processing-document";

export type FilesDocumentKind = "office" | "pdf" | "unknown";
export type FilesDocumentPreviewFormat = "pdf" | "png";
export type FilesOfficeDocumentFormat = "doc" | "docx" | "ppt" | "pptx" | "xls" | "xlsx";

export type FilesDocumentProcessingPreset = {
	officeProofOfConcept?: boolean;
	pdfMetadata: boolean;
	preview?: boolean | { format?: FilesDocumentPreviewFormat; pageLimit?: number };
};

export type FilesDocumentProcessingInput = {
	contentType: string;
	fileId: string;
	fileName: string;
	sourceFilePath: string;
	storagePrefix: string;
};

export type FilesDocumentProcessingOutput = {
	metadata: Record<string, unknown>;
	variants: FilesGeneratedVariant[];
};

export type FilesDocumentProcessingPlan = {
	documentKind: FilesDocumentKind;
	metadata: boolean;
	officeConversion?: {
		enabled: true;
		sourceFormat: FilesOfficeDocumentFormat;
		targetFormat: "pdf";
	};
	preview?: {
		contentType: string;
		format: FilesDocumentPreviewFormat;
		key: string;
		pageLimit: number;
	};
};

export type FilesDocumentProcessorAdapter = {
	process(
		input: FilesDocumentProcessingInput,
		preset: FilesDocumentProcessingPreset,
	): Promise<FilesDocumentProcessingOutput>;
};

export function defineFilesDocumentProcessor<TAdapter extends FilesDocumentProcessorAdapter>(
	adapter: TAdapter,
) {
	return adapter;
}

export function createFilesDocumentProcessingPlan(input: {
	contentType?: string | null;
	fileName: string;
	preset: FilesDocumentProcessingPreset;
	storagePrefix: string;
}): FilesDocumentProcessingPlan {
	const documentKind = detectFilesDocumentKind(input);
	const storagePrefix = normalizeStoragePrefix(input.storagePrefix);
	const officeFormat = detectFilesOfficeDocumentFormat(input.fileName);
	const preview = createFilesDocumentPreviewPlan({
		preview: input.preset.preview,
		storagePrefix,
	});

	if (
		documentKind === "office" &&
		preview !== undefined &&
		(input.preset.officeProofOfConcept ?? false) === false
	) {
		throw new Error("Office document previews require officeProofOfConcept to be enabled.");
	}

	return {
		documentKind,
		metadata: input.preset.pdfMetadata && documentKind === "pdf",
		officeConversion:
			documentKind === "office" && officeFormat !== undefined && preview !== undefined
				? {
						enabled: true,
						sourceFormat: officeFormat,
						targetFormat: "pdf",
					}
				: undefined,
		preview,
	};
}

export function detectFilesDocumentKind(input: {
	contentType?: string | null;
	fileName: string;
}): FilesDocumentKind {
	const contentType = input.contentType?.toLowerCase();
	if (contentType === "application/pdf" || input.fileName.toLowerCase().endsWith(".pdf")) {
		return "pdf";
	}

	if (
		contentType?.includes("officedocument") ||
		contentType === "application/msword" ||
		contentType === "application/vnd.ms-excel" ||
		contentType === "application/vnd.ms-powerpoint" ||
		detectFilesOfficeDocumentFormat(input.fileName) !== undefined
	) {
		return "office";
	}

	return "unknown";
}

export function detectFilesOfficeDocumentFormat(
	fileName: string,
): FilesOfficeDocumentFormat | undefined {
	const extension = fileName.toLowerCase().split(".").pop();
	switch (extension) {
		case "doc":
		case "docx":
		case "ppt":
		case "pptx":
		case "xls":
		case "xlsx":
			return extension;
		default:
			return undefined;
	}
}

export function getFilesDocumentPreviewContentType(format: FilesDocumentPreviewFormat): string {
	switch (format) {
		case "pdf":
			return "application/pdf";
		case "png":
			return "image/png";
		default: {
			const exhaustive: never = format;
			throw new Error(`Unsupported document preview format: ${exhaustive}`);
		}
	}
}

function createFilesDocumentPreviewPlan(input: {
	preview?: boolean | { format?: FilesDocumentPreviewFormat; pageLimit?: number };
	storagePrefix: string;
}): FilesDocumentProcessingPlan["preview"] {
	if (input.preview !== true && typeof input.preview !== "object") {
		return undefined;
	}

	const format = typeof input.preview === "object" ? (input.preview.format ?? "pdf") : "pdf";
	const pageLimit = typeof input.preview === "object" ? (input.preview.pageLimit ?? 1) : 1;
	if (!Number.isInteger(pageLimit) || pageLimit <= 0) {
		throw new Error("Document preview pageLimit must be a positive integer.");
	}

	return {
		contentType: getFilesDocumentPreviewContentType(format),
		format,
		key: `${input.storagePrefix}/preview.${format}`,
		pageLimit,
	};
}

function normalizeStoragePrefix(prefix: string): string {
	const normalized = prefix.replace(/\/+$/u, "");
	if (normalized.length === 0) {
		throw new Error("storagePrefix cannot be empty.");
	}

	return normalized;
}
