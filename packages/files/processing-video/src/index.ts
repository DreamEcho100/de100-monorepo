import type {
	FilesArtifactGroupRecord,
	FilesArtifactKind,
	FilesArtifactRecord,
	FilesCreateArtifactGroupInput,
	FilesCreateArtifactInput,
	FilesHlsPreset,
	FilesHlsProtectionMode,
	FilesHlsRendition,
	FilesHlsSegmentFormat,
	FileVisibility,
} from "@de100/files-shared";
import {
	createFilesHlsAes128KeyUri,
	filesBalancedHlsPreset,
	normalizeFilesAes128Hex,
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

export type FilesVideoSourceMetadata = {
	durationMs?: number;
	height?: number;
	width?: number;
};

export type FilesVideoHlsRenditionPlan = {
	initSegmentKey?: string;
	manifestKey: string;
	rendition: FilesHlsRendition;
	segmentKeyPattern: string;
	sortOrder: number;
};

export type FilesVideoHlsAes128EncryptionPlan = {
	algorithm: "AES-128";
	ivHex: string;
	keyId: string;
	keyKey: string;
	keyUri: string;
};

export type FilesVideoHlsPlan = {
	captionPrefix: string;
	encryption: FilesVideoHlsAes128EncryptionPlan | null;
	metadataKey: string;
	masterManifestKey: string;
	posterKey: string;
	protectionMode: FilesHlsProtectionMode;
	renditions: FilesVideoHlsRenditionPlan[];
	segmentContentType: string;
	segmentDurationSeconds: number;
	segmentExtension: "m4s" | "ts";
	segmentFormat: FilesHlsSegmentFormat;
	stagingPrefix: string;
	targetPrefix: string;
};

export type FilesVideoHlsGeneratedObject = {
	contentType?: string;
	durationMs?: number | null;
	height?: number | null;
	key: string;
	metadata?: Record<string, unknown> | null;
	size: number;
	width?: number | null;
};

export type FilesVideoHlsArtifactPlan = {
	artifacts: FilesCreateArtifactInput[];
	group: FilesCreateArtifactGroupInput;
};

export type FilesVideoLocalPreprocessPlan = {
	commands: FilesFfmpegCommand[];
	plan: FilesVideoHlsPlan;
	stagingPlan: FilesVideoHlsPlan;
};

export type FilesVideoHlsValidationResult = {
	missing: string[];
	ok: boolean;
};

export type FilesVideoHlsPlanInput = {
	encryption?: {
		ivHex?: string;
		keyId?: string;
		keyUri?: string;
	};
	preset?: FilesVideoHlsProcessingPreset;
	sourceMetadata?: FilesVideoSourceMetadata;
	stagingPrefix: string;
	targetPrefix: string;
};

export const filesVideoDefaultHlsProcessingPreset: FilesVideoHlsProcessingPreset = {
	inputFormats: ["mp4", "mov", "webm", "mkv"],
	originalRetention: "keep",
	playbackProtection: "signed-session",
	preset: filesBalancedHlsPreset,
};

export function detectFilesVideoInputFormat(input: {
	contentType?: string | null;
	fileName: string;
}): FilesVideoInputFormat | undefined {
	const contentTypeFormat = detectFilesVideoInputFormatFromContentType(input.contentType);
	if (contentTypeFormat !== undefined) {
		return contentTypeFormat;
	}

	const extension = input.fileName.toLowerCase().split(".").pop();
	switch (extension) {
		case "mkv":
		case "mov":
		case "mp4":
		case "webm":
			return extension;
		default:
			return undefined;
	}
}

export function createFilesVideoHlsPlan(input: FilesVideoHlsPlanInput): FilesVideoHlsPlan {
	const preset = input.preset ?? filesVideoDefaultHlsProcessingPreset;
	const stagingPrefix = normalizeStoragePrefix(input.stagingPrefix);
	const targetPrefix = normalizeStoragePrefix(input.targetPrefix);
	const selectedRenditions = selectFilesVideoHlsRenditions({
		preset: preset.preset,
		sourceMetadata: input.sourceMetadata,
	});
	const segmentExtension = getFilesHlsSegmentExtension(preset.preset.segmentFormat);

	return {
		captionPrefix: `${targetPrefix}/captions`,
		encryption:
			preset.playbackProtection === "aes-128"
				? createFilesVideoHlsAes128EncryptionPlan({
						ivHex: input.encryption?.ivHex,
						keyId: input.encryption?.keyId,
						keyUri: input.encryption?.keyUri,
						targetPrefix,
					})
				: null,
		metadataKey: `${targetPrefix}/metadata.json`,
		masterManifestKey: `${targetPrefix}/master.m3u8`,
		posterKey: `${targetPrefix}/poster.jpg`,
		protectionMode: preset.playbackProtection,
		renditions: selectedRenditions.map((rendition, index) => {
			const renditionPrefix = `${targetPrefix}/${rendition.label}`;
			return {
				initSegmentKey:
					preset.preset.segmentFormat === "fmp4-cmaf" ? `${renditionPrefix}/init.mp4` : undefined,
				manifestKey: `${renditionPrefix}/index.m3u8`,
				rendition,
				segmentKeyPattern: `${renditionPrefix}/segment-%05d.${segmentExtension}`,
				sortOrder: index,
			} satisfies FilesVideoHlsRenditionPlan;
		}),
		segmentContentType: getFilesHlsSegmentContentType(preset.preset.segmentFormat),
		segmentDurationSeconds: preset.preset.segmentDurationSeconds,
		segmentExtension,
		segmentFormat: preset.preset.segmentFormat,
		stagingPrefix,
		targetPrefix,
	};
}

export function createFilesVideoHlsStagingPlan(plan: FilesVideoHlsPlan): FilesVideoHlsPlan {
	return replaceFilesVideoHlsPlanPrefix(plan, plan.targetPrefix, plan.stagingPrefix);
}

export function createFilesVideoLocalPreprocessPlan(input: {
	binaryPath?: string;
	hlsKeyInfoFilePath?: string;
	inputPath: string;
	outputPrefix: string;
	preset?: FilesVideoHlsProcessingPreset;
	sourceMetadata?: FilesVideoSourceMetadata;
	stagingPrefix?: string;
}): FilesVideoLocalPreprocessPlan {
	const targetPrefix = normalizeStoragePrefix(input.outputPrefix);
	const stagingPrefix = normalizeStoragePrefix(input.stagingPrefix ?? `${targetPrefix}/.staging`);
	const plan = createFilesVideoHlsPlan({
		preset: input.preset,
		sourceMetadata: input.sourceMetadata,
		stagingPrefix,
		targetPrefix,
	});
	const stagingPlan = createFilesVideoHlsStagingPlan(plan);

	return {
		commands: createFilesVideoFfmpegHlsCommands({
			binaryPath: input.binaryPath,
			hlsKeyInfoFilePath: input.hlsKeyInfoFilePath,
			inputPath: input.inputPath,
			plan: stagingPlan,
		}),
		plan,
		stagingPlan,
	};
}

export function promoteFilesVideoHlsGeneratedObjects(input: {
	objects: FilesVideoHlsGeneratedObject[];
	plan: FilesVideoHlsPlan;
}): FilesVideoHlsGeneratedObject[] {
	return input.objects.map((object) => ({
		...object,
		key: replaceStoragePrefix(object.key, input.plan.stagingPrefix, input.plan.targetPrefix),
	}));
}

export function createFilesVideoFfmpegHlsCommands(input: {
	binaryPath?: string;
	hlsKeyInfoFilePath?: string;
	inputPath: string;
	plan: FilesVideoHlsPlan;
	posterTimestampSeconds?: number;
}): FilesFfmpegCommand[] {
	const binaryPath = input.binaryPath ?? "ffmpeg";
	const posterTimestampSeconds = input.posterTimestampSeconds ?? 1;
	const commands: FilesFfmpegCommand[] = [
		{
			args: [
				"-y",
				"-ss",
				String(posterTimestampSeconds),
				"-i",
				input.inputPath,
				"-frames:v",
				"1",
				input.plan.posterKey,
			],
			binaryPath,
		},
	];

	for (const { initSegmentKey, manifestKey, rendition, segmentKeyPattern } of input.plan
		.renditions) {
		const hlsArgs = [
			"-f",
			"hls",
			"-hls_time",
			String(input.plan.segmentDurationSeconds),
			"-hls_playlist_type",
			"vod",
			"-hls_segment_filename",
			segmentKeyPattern,
		];

		if (input.plan.segmentFormat === "fmp4-cmaf") {
			hlsArgs.push("-hls_segment_type", "fmp4");
			if (initSegmentKey) {
				hlsArgs.push("-hls_fmp4_init_filename", initSegmentKey);
			}
		}

		if (input.plan.encryption) {
			if (!input.hlsKeyInfoFilePath) {
				throw new Error("Encrypted HLS ffmpeg planning requires an HLS key info file path.");
			}

			hlsArgs.push("-hls_key_info_file", input.hlsKeyInfoFilePath);
		}

		commands.push({
			args: [
				"-y",
				"-i",
				input.inputPath,
				"-vf",
				`scale=w=${rendition.width}:h=${rendition.height}:force_original_aspect_ratio=decrease`,
				"-c:v",
				"libx264",
				"-preset",
				"veryfast",
				"-b:v",
				String(rendition.videoBitrate),
				"-maxrate",
				String(rendition.bandwidth),
				"-bufsize",
				String(rendition.bandwidth * 2),
				"-c:a",
				"aac",
				"-b:a",
				String(rendition.audioBitrate ?? 128_000),
				...hlsArgs,
				manifestKey,
			],
			binaryPath,
		});
	}

	return commands;
}

export function createFilesVideoHlsMasterManifest(plan: FilesVideoHlsPlan): string {
	const version = plan.segmentFormat === "fmp4-cmaf" ? 7 : 3;
	const lines = ["#EXTM3U", `#EXT-X-VERSION:${version}`];

	for (const { manifestKey, rendition } of plan.renditions) {
		const attributes = [
			`BANDWIDTH=${rendition.bandwidth}`,
			`RESOLUTION=${rendition.width}x${rendition.height}`,
		];
		if (rendition.codecs?.length) {
			attributes.push(`CODECS="${rendition.codecs.join(",")}"`);
		}

		lines.push(`#EXT-X-STREAM-INF:${attributes.join(",")}`);
		lines.push(createRelativeStoragePath(plan.targetPrefix, manifestKey));
	}

	return `${lines.join("\n")}\n`;
}

export function createFilesVideoHlsMetadataObject(input: {
	plan: FilesVideoHlsPlan;
	sourceMetadata?: FilesVideoSourceMetadata;
}): FilesVideoHlsGeneratedObject & { body: string } {
	const body = JSON.stringify(
		{
			encryption: input.plan.encryption
				? {
						algorithm: input.plan.encryption.algorithm,
						ivHex: input.plan.encryption.ivHex,
						keyId: input.plan.encryption.keyId,
						keyUri: input.plan.encryption.keyUri,
					}
				: null,
			protectionMode: input.plan.protectionMode,
			renditions: input.plan.renditions.map(({ rendition }) => rendition),
			segmentDurationSeconds: input.plan.segmentDurationSeconds,
			segmentFormat: input.plan.segmentFormat,
			source: input.sourceMetadata ?? null,
		},
		null,
		2,
	);

	return {
		body,
		contentType: "application/json",
		key: input.plan.metadataKey,
		size: new TextEncoder().encode(body).byteLength,
	};
}

export function validateFilesVideoHlsGeneratedObjects(input: {
	objects: Pick<FilesVideoHlsGeneratedObject, "key">[];
	plan: FilesVideoHlsPlan;
}): FilesVideoHlsValidationResult {
	const keys = new Set(input.objects.map((object) => object.key));
	const missing: string[] = [];

	if (!keys.has(input.plan.masterManifestKey)) {
		missing.push(input.plan.masterManifestKey);
	}

	if (!keys.has(input.plan.posterKey)) {
		missing.push(input.plan.posterKey);
	}

	if (input.plan.encryption && !keys.has(input.plan.encryption.keyKey)) {
		missing.push(input.plan.encryption.keyKey);
	}

	for (const renditionPlan of input.plan.renditions) {
		if (!keys.has(renditionPlan.manifestKey)) {
			missing.push(renditionPlan.manifestKey);
		}

		const renditionPrefix = `${input.plan.targetPrefix}/${renditionPlan.rendition.label}/`;
		const hasSegment = input.objects.some((object) => {
			if (!object.key.startsWith(renditionPrefix)) {
				return false;
			}

			if (object.key === renditionPlan.manifestKey || object.key === renditionPlan.initSegmentKey) {
				return false;
			}

			return object.key.endsWith(`.${input.plan.segmentExtension}`);
		});
		if (!hasSegment) {
			missing.push(`${renditionPrefix}*.${input.plan.segmentExtension}`);
		}
	}

	return {
		missing,
		ok: missing.length === 0,
	};
}

export function assertFilesVideoHlsGeneratedObjects(input: {
	objects: Pick<FilesVideoHlsGeneratedObject, "key">[];
	plan: FilesVideoHlsPlan;
}): void {
	const result = validateFilesVideoHlsGeneratedObjects(input);
	if (!result.ok) {
		throw new Error(
			`HLS generation did not produce required artifacts: ${result.missing.join(", ")}`,
		);
	}
}

export function createFilesVideoHlsArtifactInputs(input: {
	bucketName?: string | null;
	fileId: string;
	groupId: string;
	objects: FilesVideoHlsGeneratedObject[];
	plan: FilesVideoHlsPlan;
	revision?: number;
	visibility: FileVisibility;
}): FilesVideoHlsArtifactPlan {
	return {
		artifacts: input.objects.map((object, index) =>
			createFilesVideoHlsArtifactInput({
				bucketName: input.bucketName,
				fileId: input.fileId,
				groupId: input.groupId,
				object,
				plan: input.plan,
				sortOrder: index,
			}),
		),
		group: {
			bucketName: input.bucketName ?? null,
			fileId: input.fileId,
			id: input.groupId,
			kind: getFilesVideoHlsArtifactGroupKind(input.plan.protectionMode),
			metadata: {
				encryption: input.plan.encryption
					? {
							algorithm: input.plan.encryption.algorithm,
							ivHex: input.plan.encryption.ivHex,
							keyId: input.plan.encryption.keyId,
							keyUri: input.plan.encryption.keyUri,
						}
					: null,
				protectionMode: input.plan.protectionMode,
				renditions: input.plan.renditions.map(({ rendition }) => rendition),
				segmentDurationSeconds: input.plan.segmentDurationSeconds,
				segmentFormat: input.plan.segmentFormat,
			},
			revision: input.revision ?? 1,
			status: "ready",
			storagePrefix: input.plan.targetPrefix,
			visibility: input.visibility,
		},
	};
}

export function selectFilesVideoHlsRenditions(input: {
	preset: FilesHlsPreset;
	sourceMetadata?: FilesVideoSourceMetadata;
}): FilesHlsRendition[] {
	const sortedRenditions = [...input.preset.renditions].sort((a, b) => a.height - b.height);
	if (!input.preset.skipRenditionsAboveSource || input.sourceMetadata?.height === undefined) {
		return sortedRenditions;
	}

	const sourceHeight = input.sourceMetadata.height;
	const selected = sortedRenditions.filter((rendition) => rendition.height <= sourceHeight);
	if (selected.length > 0) {
		return selected;
	}

	const sourceWidth = input.sourceMetadata.width;
	if (sourceWidth !== undefined && sourceHeight > 0) {
		const fallback = sortedRenditions[0];
		if (fallback === undefined) {
			return [];
		}

		return [
			{
				...fallback,
				height: sourceHeight,
				label: `${sourceHeight}p`,
				width: sourceWidth,
			},
		];
	}

	return sortedRenditions.slice(0, 1);
}

export function getFilesHlsSegmentExtension(format: FilesHlsSegmentFormat): "m4s" | "ts" {
	switch (format) {
		case "mpeg-ts":
			return "ts";
		case "fmp4-cmaf":
			return "m4s";
		default: {
			const exhaustive: never = format;
			throw new Error(`Unsupported HLS segment format: ${exhaustive}`);
		}
	}
}

export function getFilesHlsSegmentContentType(format: FilesHlsSegmentFormat): string {
	switch (format) {
		case "mpeg-ts":
			return "video/MP2T";
		case "fmp4-cmaf":
			return "video/mp4";
		default: {
			const exhaustive: never = format;
			throw new Error(`Unsupported HLS segment format: ${exhaustive}`);
		}
	}
}

function detectFilesVideoInputFormatFromContentType(
	contentType?: string | null,
): FilesVideoInputFormat | undefined {
	switch (contentType?.toLowerCase()) {
		case "video/mp4":
			return "mp4";
		case "video/quicktime":
			return "mov";
		case "video/webm":
			return "webm";
		case "video/x-matroska":
			return "mkv";
		default:
			return undefined;
	}
}

function replaceFilesVideoHlsPlanPrefix(
	plan: FilesVideoHlsPlan,
	fromPrefix: string,
	toPrefix: string,
): FilesVideoHlsPlan {
	return {
		...plan,
		captionPrefix: replaceStoragePrefix(plan.captionPrefix, fromPrefix, toPrefix),
		encryption: plan.encryption
			? {
					...plan.encryption,
					keyKey: replaceStoragePrefix(plan.encryption.keyKey, fromPrefix, toPrefix),
				}
			: null,
		metadataKey: replaceStoragePrefix(plan.metadataKey, fromPrefix, toPrefix),
		masterManifestKey: replaceStoragePrefix(plan.masterManifestKey, fromPrefix, toPrefix),
		posterKey: replaceStoragePrefix(plan.posterKey, fromPrefix, toPrefix),
		renditions: plan.renditions.map((renditionPlan) => ({
			...renditionPlan,
			initSegmentKey: renditionPlan.initSegmentKey
				? replaceStoragePrefix(renditionPlan.initSegmentKey, fromPrefix, toPrefix)
				: undefined,
			manifestKey: replaceStoragePrefix(renditionPlan.manifestKey, fromPrefix, toPrefix),
			segmentKeyPattern: replaceStoragePrefix(
				renditionPlan.segmentKeyPattern,
				fromPrefix,
				toPrefix,
			),
		})),
		stagingPrefix: toPrefix === plan.stagingPrefix ? plan.stagingPrefix : plan.stagingPrefix,
		targetPrefix: toPrefix,
	};
}

export function createFilesVideoHlsAes128KeyInfoFile(input: {
	keyFilePath: string;
	plan: Pick<FilesVideoHlsPlan, "encryption">;
}): string {
	if (!input.plan.encryption) {
		throw new Error("HLS AES-128 key info file requires an encrypted HLS plan.");
	}

	return [input.plan.encryption.keyUri, input.keyFilePath, input.plan.encryption.ivHex, ""].join(
		"\n",
	);
}

export function createFilesVideoHlsAes128KeyObject(input: {
	keyBytesHex: string;
	plan: Pick<FilesVideoHlsPlan, "encryption">;
}): FilesVideoHlsGeneratedObject & { body: ArrayBuffer } {
	if (!input.plan.encryption) {
		throw new Error("HLS AES-128 key object requires an encrypted HLS plan.");
	}

	const keyBytesHex = normalizeFilesAes128Hex(input.keyBytesHex, 16);
	const body = hexToArrayBuffer(keyBytesHex);

	return {
		body,
		contentType: "application/octet-stream",
		key: input.plan.encryption.keyKey,
		metadata: {
			algorithm: input.plan.encryption.algorithm,
			ivHex: input.plan.encryption.ivHex,
			keyId: input.plan.encryption.keyId,
			keyUri: input.plan.encryption.keyUri,
		},
		size: body.byteLength,
	};
}

function createFilesVideoHlsArtifactInput(input: {
	bucketName?: string | null;
	fileId: string;
	groupId: string;
	object: FilesVideoHlsGeneratedObject;
	plan: FilesVideoHlsPlan;
	sortOrder: number;
}): FilesCreateArtifactInput {
	const classification = classifyFilesVideoHlsObject(input.object.key, input.plan);

	return {
		bucketName: input.bucketName ?? null,
		contentType: input.object.contentType ?? classification.contentType,
		durationMs: input.object.durationMs ?? null,
		fileId: input.fileId,
		groupId: input.groupId,
		height: input.object.height ?? classification.rendition?.height ?? null,
		key: input.object.key,
		kind: classification.kind,
		metadata: input.object.metadata ?? null,
		renditionLabel: classification.rendition?.label ?? null,
		size: input.object.size,
		sortOrder: input.sortOrder,
		status: "ready",
		width: input.object.width ?? classification.rendition?.width ?? null,
	};
}

function classifyFilesVideoHlsObject(
	key: string,
	plan: FilesVideoHlsPlan,
): {
	contentType: string;
	kind: FilesArtifactKind;
	rendition?: FilesHlsRendition;
} {
	if (key === plan.masterManifestKey) {
		return {
			contentType: "application/vnd.apple.mpegurl",
			kind: "hls-master-manifest",
		};
	}

	if (key === plan.posterKey) {
		return {
			contentType: "image/jpeg",
			kind: "poster",
		};
	}

	if (key === plan.metadataKey) {
		return {
			contentType: "application/json",
			kind: "metadata",
		};
	}

	if (plan.encryption && key === plan.encryption.keyKey) {
		return {
			contentType: "application/octet-stream",
			kind: "hls-key",
		};
	}

	if (key.startsWith(`${plan.captionPrefix}/`)) {
		return {
			contentType: "text/vtt",
			kind: "caption",
		};
	}

	for (const renditionPlan of plan.renditions) {
		if (key === renditionPlan.manifestKey) {
			return {
				contentType: "application/vnd.apple.mpegurl",
				kind: "hls-rendition-manifest",
				rendition: renditionPlan.rendition,
			};
		}

		const renditionPrefix = `${plan.targetPrefix}/${renditionPlan.rendition.label}/`;
		if (key.startsWith(renditionPrefix)) {
			return {
				contentType: plan.segmentContentType,
				kind: "hls-segment",
				rendition: renditionPlan.rendition,
			};
		}
	}

	return {
		contentType: "application/octet-stream",
		kind: "custom",
	};
}

function createRelativeStoragePath(basePrefix: string, key: string): string {
	if (key === basePrefix) {
		return ".";
	}

	if (key.startsWith(`${basePrefix}/`)) {
		return key.slice(basePrefix.length + 1);
	}

	return key;
}

function createFilesVideoHlsAes128EncryptionPlan(input: {
	ivHex?: string;
	keyId?: string;
	keyUri?: string;
	targetPrefix: string;
}): FilesVideoHlsAes128EncryptionPlan {
	const keyId = input.keyId?.trim() || "default";

	return {
		algorithm: "AES-128",
		ivHex: normalizeFilesAes128Hex(input.ivHex ?? "0".repeat(32), 16),
		keyId,
		keyKey: `${input.targetPrefix}/keys/${keyId}.key`,
		keyUri: input.keyUri ?? createFilesHlsAes128KeyUri(keyId),
	};
}

function getFilesVideoHlsArtifactGroupKind(protectionMode: FilesHlsProtectionMode) {
	switch (protectionMode) {
		case "aes-128":
			return "hls-encrypted";
		case "drm":
			return "drm";
		default:
			return "hls";
	}
}

function hexToArrayBuffer(value: string): ArrayBuffer {
	const bytes = new Uint8Array(value.length / 2);
	for (let index = 0; index < value.length; index += 2) {
		bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
	}

	return bytes.buffer;
}

function replaceStoragePrefix(key: string, fromPrefix: string, toPrefix: string): string {
	if (key === fromPrefix) {
		return toPrefix;
	}

	if (key.startsWith(`${fromPrefix}/`)) {
		return `${toPrefix}${key.slice(fromPrefix.length)}`;
	}

	throw new Error(`Storage key ${key} is not under prefix ${fromPrefix}.`);
}

function normalizeStoragePrefix(prefix: string): string {
	const normalized = prefix.replace(/\/+$/u, "");
	if (normalized.length === 0) {
		throw new Error("storage prefix cannot be empty.");
	}

	return normalized;
}
