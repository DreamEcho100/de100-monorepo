import type { FilesGeneratedVariant } from "@de100/files-shared";

export const filesImageProcessingAddonName = "@de100/files-processing-image";

export type FilesImageOutputFormat = "avif" | "jpeg" | "png" | "webp";

export type FilesImageResponsiveSize = {
	format: FilesImageOutputFormat;
	height?: number;
	label: string;
	width: number;
};

export type FilesImageProcessingPreset = {
	exif?: boolean;
	outputFormats: FilesImageOutputFormat[];
	placeholder?: "blur-data-url" | "dominant-color" | "none";
	responsiveSizes: FilesImageResponsiveSize[];
	thumbnail?: { height: number; width: number };
};

export type FilesImageProcessingInput = {
	contentType: string;
	fileId: string;
	fileName: string;
	source: ArrayBuffer | Uint8Array;
	storagePrefix: string;
};

export type FilesImageProcessingOutput = {
	metadata: Record<string, unknown>;
	variants: FilesGeneratedVariant[];
};

export type FilesImageProcessorAdapter = {
	process(
		input: FilesImageProcessingInput,
		preset: FilesImageProcessingPreset,
	): Promise<FilesImageProcessingOutput>;
};

export function defineFilesImageProcessor<TAdapter extends FilesImageProcessorAdapter>(
	adapter: TAdapter,
) {
	return adapter;
}
