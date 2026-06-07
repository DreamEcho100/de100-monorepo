import type { FilesGeneratedVariant, FilesProcessingDependency } from "@de100/files-shared";

export const filesAudioProcessingAddonName = "@de100/files-processing-audio";

export type FilesAudioPreviewFormat = "aac" | "mp3" | "opus";
export type FilesAudioWaveformFormat = "json" | "png";
export type FilesAudioTranscriptMode = "adapter" | "none";

export type FilesAudioProcessingPreset = {
	metadata: boolean;
	normalizePreview?: boolean;
	preview?: false | { durationSeconds?: number; format?: FilesAudioPreviewFormat };
	transcript?: FilesAudioTranscriptMode;
	waveform: boolean | { format?: FilesAudioWaveformFormat };
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

export type FilesAudioProcessingPlan = {
	metadata: boolean;
	preview?: {
		contentType: string;
		durationSeconds: number;
		format: FilesAudioPreviewFormat;
		key: string;
		normalize: boolean;
	};
	requiredDependencies: FilesProcessingDependency[];
	transcript?: {
		key: string;
		mode: "adapter";
	};
	waveform?: {
		contentType: string;
		format: FilesAudioWaveformFormat;
		key: string;
	};
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

export function createFilesAudioProcessingPlan(input: {
	preset: FilesAudioProcessingPreset;
	storagePrefix: string;
}): FilesAudioProcessingPlan {
	const storagePrefix = normalizeStoragePrefix(input.storagePrefix);
	const preview = createFilesAudioPreviewPlan({
		normalize: input.preset.normalizePreview ?? false,
		preview: input.preset.preview,
		storagePrefix,
	});
	const waveform = createFilesAudioWaveformPlan({
		storagePrefix,
		waveform: input.preset.waveform,
	});
	const transcript = createFilesAudioTranscriptPlan({
		storagePrefix,
		transcript: input.preset.transcript ?? "none",
	});

	return {
		metadata: input.preset.metadata,
		preview,
		requiredDependencies: selectFilesAudioProcessingDependencies({
			metadata: input.preset.metadata,
			preview,
			transcript,
			waveform,
		}),
		transcript,
		waveform,
	};
}

export function getFilesAudioPreviewContentType(format: FilesAudioPreviewFormat): string {
	switch (format) {
		case "aac":
			return "audio/aac";
		case "mp3":
			return "audio/mpeg";
		case "opus":
			return "audio/ogg";
		default: {
			const exhaustive: never = format;
			throw new Error(`Unsupported audio preview format: ${exhaustive}`);
		}
	}
}

export function getFilesAudioWaveformContentType(format: FilesAudioWaveformFormat): string {
	switch (format) {
		case "json":
			return "application/json";
		case "png":
			return "image/png";
		default: {
			const exhaustive: never = format;
			throw new Error(`Unsupported audio waveform format: ${exhaustive}`);
		}
	}
}

function createFilesAudioPreviewPlan(input: {
	normalize: boolean;
	preview?: false | { durationSeconds?: number; format?: FilesAudioPreviewFormat };
	storagePrefix: string;
}): FilesAudioProcessingPlan["preview"] {
	if (input.preview === false) {
		return undefined;
	}

	const format = input.preview?.format ?? "mp3";
	const durationSeconds = input.preview?.durationSeconds ?? 30;
	if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
		throw new Error("Audio preview durationSeconds must be positive.");
	}

	return {
		contentType: getFilesAudioPreviewContentType(format),
		durationSeconds,
		format,
		key: `${input.storagePrefix}/preview.${format === "opus" ? "ogg" : format}`,
		normalize: input.normalize,
	};
}

function createFilesAudioWaveformPlan(input: {
	storagePrefix: string;
	waveform: FilesAudioProcessingPreset["waveform"];
}): FilesAudioProcessingPlan["waveform"] {
	if (input.waveform === false) {
		return undefined;
	}

	const format = typeof input.waveform === "object" ? (input.waveform.format ?? "json") : "json";
	return {
		contentType: getFilesAudioWaveformContentType(format),
		format,
		key: `${input.storagePrefix}/waveform.${format}`,
	};
}

function createFilesAudioTranscriptPlan(input: {
	storagePrefix: string;
	transcript: FilesAudioTranscriptMode;
}): FilesAudioProcessingPlan["transcript"] {
	if (input.transcript === "none") {
		return undefined;
	}

	return {
		key: `${input.storagePrefix}/transcript.vtt`,
		mode: "adapter",
	};
}

function selectFilesAudioProcessingDependencies(input: {
	metadata: boolean;
	preview?: FilesAudioProcessingPlan["preview"];
	transcript?: FilesAudioProcessingPlan["transcript"];
	waveform?: FilesAudioProcessingPlan["waveform"];
}): FilesProcessingDependency[] {
	const dependencies = new Set<FilesProcessingDependency>();
	if (input.metadata) {
		dependencies.add("music-metadata");
	}
	if (input.preview !== undefined || input.waveform !== undefined) {
		dependencies.add("ffmpeg");
		dependencies.add("ffprobe");
	}
	if (input.transcript !== undefined) {
		dependencies.add("ffmpeg");
	}

	return [...dependencies];
}

function normalizeStoragePrefix(prefix: string): string {
	const normalized = prefix.replace(/\/+$/u, "");
	if (normalized.length === 0) {
		throw new Error("storagePrefix cannot be empty.");
	}

	return normalized;
}
