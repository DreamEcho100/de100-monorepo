import type { FilesGeneratedVariant } from "@de100/files-shared";

export const filesAudioProcessingAddonName = "@de100/files-processing-audio";

export type FilesAudioProcessingPreset = {
	metadata: boolean;
	normalizePreview?: boolean;
	transcript?: "adapter" | "none";
	waveform: boolean;
};

export type FilesAudioProcessingInput = {
	contentType: string;
	fileId: string;
	fileName: string;
	sourceFilePath: string;
	storagePrefix: string;
};

export type FilesAudioProcessingOutput = {
	metadata: Record<string, unknown>;
	variants: FilesGeneratedVariant[];
};

export type FilesAudioProcessorAdapter = {
	process(
		input: FilesAudioProcessingInput,
		preset: FilesAudioProcessingPreset,
	): Promise<FilesAudioProcessingOutput>;
};

export function defineFilesAudioProcessor<TAdapter extends FilesAudioProcessorAdapter>(
	adapter: TAdapter,
) {
	return adapter;
}
