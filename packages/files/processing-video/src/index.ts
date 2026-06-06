import type {
	FilesArtifactGroupRecord,
	FilesArtifactRecord,
	FilesHlsPreset,
	FilesHlsProtectionMode,
} from "@de100/files-shared";

export const filesVideoProcessingAddonName = "@de100/files-processing-video";

export type FilesVideoInputFormat = "mkv" | "mov" | "mp4" | "webm";

export type FilesVideoHlsProcessingPreset = {
	inputFormats: FilesVideoInputFormat[];
	originalRetention: "archive" | "delete" | "keep";
	playbackProtection: FilesHlsProtectionMode;
	preset: FilesHlsPreset;
};

export type FilesVideoHlsProcessingInput = {
	fileId: string;
	fileName: string;
	inputFormat: FilesVideoInputFormat;
	sourceFilePath: string;
	stagingPrefix: string;
	targetPrefix: string;
};

export type FilesVideoHlsProcessingOutput = {
	artifactGroup: FilesArtifactGroupRecord;
	artifacts: FilesArtifactRecord[];
	metadata: Record<string, unknown>;
};

export type FilesFfmpegCommand = {
	args: string[];
	binaryPath: string;
	cwd?: string;
};

export type FilesVideoProcessorAdapter = {
	createHlsCommands(
		input: FilesVideoHlsProcessingInput,
		preset: FilesVideoHlsProcessingPreset,
	): Promise<FilesFfmpegCommand[]> | FilesFfmpegCommand[];
	packageHls(
		input: FilesVideoHlsProcessingInput,
		preset: FilesVideoHlsProcessingPreset,
	): Promise<FilesVideoHlsProcessingOutput>;
};

export function defineFilesVideoProcessor<TAdapter extends FilesVideoProcessorAdapter>(
	adapter: TAdapter,
) {
	return adapter;
}
