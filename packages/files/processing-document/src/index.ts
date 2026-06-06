import type { FilesGeneratedVariant } from "@de100/files-shared";

export const filesDocumentProcessingAddonName = "@de100/files-processing-document";

export type FilesDocumentProcessingPreset = {
	officeProofOfConcept?: boolean;
	pdfMetadata: boolean;
	preview?: boolean;
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
