import type { DbInstance } from "@de100/apps-lms-db";
import type { FilesRequestContext } from "@de100/files-server/operations";
import type { FilesPipeline, FilesPipelineStage } from "@de100/files-server/pipeline";
import { createFilesPipeline, runFilesProcessingJob } from "@de100/files-server/pipeline";
import type { FilesProcessingDependencyRegistry } from "@de100/files-server/processing-dependencies";
import { createFilesProcessingDependencyRegistry } from "@de100/files-server/processing-dependencies";
import type { FileRecord } from "@de100/files-shared";

import type { LmsFilesRepositories } from "./files-repositories";
import type { FilesStorageProvider } from "./files-storage";
import { getFilesStorageProvider } from "./files-storage";

type LmsFilesContext = FilesRequestContext<{ db: DbInstance }>;

type ProcessLmsUploadedFileInput = {
	file: FileRecord;
	filesContext: LmsFilesContext;
	pipeline?: FilesPipeline<{ db: DbInstance }>;
	repositories: LmsFilesRepositories;
};

type SharpFactory = (input: Uint8Array) => {
	resize(input: { fit: "inside"; width: number; withoutEnlargement: boolean }): {
		webp(input: { quality: number }): {
			toBuffer(): Promise<Uint8Array>;
		};
	};
};

type BinaryVariantOutput = {
	body: Uint8Array;
	contentType: string;
	extension: string;
	height?: number | null;
	metadata?: Record<string, unknown> | null;
	size?: number;
	width?: number | null;
};

type FfmpegAdapter = {
	createPoster?: (input: {
		file: FileRecord;
		sourceBytes: Uint8Array;
	}) => Promise<BinaryVariantOutput>;
	createWaveform?: (input: {
		file: FileRecord;
		sourceBytes: Uint8Array;
	}) => Promise<BinaryVariantOutput>;
};

type CreateLmsFilesProcessingPipelineOptions = {
	dependencies?: FilesProcessingDependencyRegistry;
	storageProvider?: FilesStorageProvider;
};

export async function processLmsUploadedFile(input: ProcessLmsUploadedFileInput) {
	const result = await runFilesProcessingJob({
		context: input.filesContext,
		file: input.file,
		kind: "upload-complete",
		operations: {
			createContext: async () => input.filesContext,
			...input.repositories,
		},
		pipeline: input.pipeline ?? createLmsFilesProcessingPipeline(input.filesContext),
	});

	const record = await input.repositories.files.getFile(input.file.id, input.filesContext.auth);

	return {
		record,
		result,
	};
}

export function createLmsFilesProcessingPipeline(
	filesContext: LmsFilesContext,
	options: CreateLmsFilesProcessingPipelineOptions = {},
): FilesPipeline<{ db: DbInstance }> {
	const storageProvider = options.storageProvider ?? getFilesStorageProvider(filesContext.request);
	const dependencies = options.dependencies ?? createFilesProcessingDependencyRegistry();
	const stages: Array<FilesPipelineStage<{ db: DbInstance }>> = [
		{
			name: "validate",
			async run(input) {
				const object = await storageProvider.getObject({
					key: input.file.key,
					visibility: input.file.visibility,
				});

				if (!object?.body) {
					throw new Error(`Stored object for file ${input.file.id} was not found.`);
				}

				return {
					metadata: {
						storageDriver: storageProvider.driver,
						storedSize: object.size ?? input.file.size,
					},
				};
			},
		},
		{
			name: "metadata",
			async run(input) {
				return {
					metadata: {
						contentType: input.file.contentType,
						fileKind: input.file.kind,
						processingMode: "local-pipeline",
						visibility: input.file.visibility,
					},
				};
			},
		},
		{
			name: "variant",
			async run(input) {
				if (!["audio", "image", "video"].includes(input.file.kind)) {
					return {
						reason: "This file kind does not have a configured LMS variant generator.",
						status: "skipped",
					};
				}

				const sourceBytes = await readStoredFileBytes(input.file, storageProvider);
				if (input.file.kind === "video") {
					const ffmpegResult = await dependencies.load("ffmpeg");
					const poster = await createFfmpegVariant({
						file: input.file,
						kind: "poster",
						method: "createPoster",
						module: ffmpegResult.status === "available" ? ffmpegResult.module : null,
						sourceBytes,
					});

					if (!poster) {
						return {
							metadata: {
								ffmpeg: ffmpegResult.status,
								videoPoster: "adapter-unavailable",
							},
							reason: "Video poster generation requires an injected ffmpeg adapter.",
							status: "skipped",
						};
					}

					await putGeneratedVariant({
						file: input.file,
						storageProvider,
						variant: poster,
					});

					return {
						metadata: {
							ffmpeg: ffmpegResult.status,
							videoPoster: "generated",
						},
						variants: [toPipelineVariant(poster)],
					};
				}

				if (input.file.kind === "audio") {
					const ffmpegResult = await dependencies.load("ffmpeg");
					const waveform = await createFfmpegVariant({
						file: input.file,
						kind: "waveform",
						method: "createWaveform",
						module: ffmpegResult.status === "available" ? ffmpegResult.module : null,
						sourceBytes,
					});

					if (!waveform) {
						return {
							metadata: {
								audioWaveform: "adapter-unavailable",
								ffmpeg: ffmpegResult.status,
							},
							reason: "Audio waveform generation requires an injected ffmpeg adapter.",
							status: "skipped",
						};
					}

					await putGeneratedVariant({
						file: input.file,
						storageProvider,
						variant: waveform,
					});

					return {
						metadata: {
							audioWaveform: "generated",
							ffmpeg: ffmpegResult.status,
						},
						variants: [toPipelineVariant(waveform)],
					};
				}

				const sharpResult = await dependencies.load("sharp");
				const optimized = await createOptimizedImageVariant({
					file: input.file,
					sharpModule: sharpResult.status === "available" ? sharpResult.module : null,
					sourceBytes,
				});

				await putGeneratedVariant({
					file: input.file,
					storageProvider,
					variant: optimized,
				});

				return {
					metadata: {
						imageVariantStrategy: optimized.strategy,
						sharp: sharpResult.status,
					},
					variants: [
						toPipelineVariant({
							...optimized,
							kind: "optimized",
							metadata: {
								strategy: optimized.strategy,
							},
						}),
					],
				};
			},
		},
	];

	return createFilesPipeline(stages, {
		retry: {
			maxAttempts: 2,
		},
	});
}

async function createOptimizedImageVariant(input: {
	file: FileRecord;
	sharpModule: unknown;
	sourceBytes: Uint8Array;
}): Promise<BinaryVariantOutput & { key: string; kind: "optimized"; strategy: string }> {
	const sharpFactory = resolveSharpFactory(input.sharpModule);
	if (sharpFactory) {
		const optimizedBytes = await sharpFactory(input.sourceBytes)
			.resize({ fit: "inside", width: 1280, withoutEnlargement: true })
			.webp({ quality: 82 })
			.toBuffer();

		return {
			body: optimizedBytes,
			contentType: "image/webp",
			extension: "webp",
			kind: "optimized",
			key: createVariantStorageKey(input.file, "optimized", "webp"),
			size: optimizedBytes.byteLength,
			strategy: "sharp-webp",
		};
	}

	return {
		body: input.sourceBytes,
		contentType: input.file.contentType,
		extension: getFileExtension(input.file),
		kind: "optimized",
		key: createVariantStorageKey(input.file, "optimized", getFileExtension(input.file)),
		size: input.sourceBytes.byteLength,
		strategy: "source-copy",
	};
}

async function createFfmpegVariant(input: {
	file: FileRecord;
	kind: "poster" | "waveform";
	method: keyof FfmpegAdapter;
	module: unknown;
	sourceBytes: Uint8Array;
}): Promise<(BinaryVariantOutput & { key: string; kind: "poster" | "waveform" }) | null> {
	const adapter = resolveFfmpegAdapter(input.module);
	const createVariant = adapter?.[input.method];
	if (!createVariant) {
		return null;
	}

	const output = await createVariant({
		file: input.file,
		sourceBytes: input.sourceBytes,
	});

	return {
		...output,
		key: createVariantStorageKey(input.file, input.kind, output.extension),
		kind: input.kind,
		size: output.size ?? output.body.byteLength,
	};
}

function resolveSharpFactory(module: unknown): SharpFactory | null {
	if (typeof module === "function") {
		return module as SharpFactory;
	}

	if (
		typeof module === "object" &&
		module !== null &&
		"default" in module &&
		typeof module.default === "function"
	) {
		return module.default as SharpFactory;
	}

	return null;
}

function resolveFfmpegAdapter(module: unknown): FfmpegAdapter | null {
	if (typeof module === "object" && module !== null) {
		return module as FfmpegAdapter;
	}

	return null;
}

async function readStoredFileBytes(file: FileRecord, storageProvider: FilesStorageProvider) {
	const object = await storageProvider.getObject({
		key: file.key,
		visibility: file.visibility,
	});
	if (!object?.body) {
		throw new Error(`Stored object for file ${file.id} was not found.`);
	}

	return new Uint8Array(await new Response(object.body).arrayBuffer());
}

async function putGeneratedVariant(input: {
	file: FileRecord;
	storageProvider: FilesStorageProvider;
	variant: BinaryVariantOutput & { key: string };
}) {
	await input.storageProvider.putObject({
		httpMetadata: {
			cacheControl:
				input.file.visibility === "public"
					? "public, max-age=31536000, immutable"
					: "private, no-store, max-age=0",
			contentDisposition: `inline; filename="${input.file.fileName.replace(/"/g, "")}"`,
			contentType: input.variant.contentType,
		},
		key: input.variant.key,
		value: input.variant.body,
		visibility: input.file.visibility,
	});
}

function toPipelineVariant(input: BinaryVariantOutput & { key: string; kind: string }) {
	return {
		contentType: input.contentType,
		height: input.height ?? null,
		key: input.key,
		kind: input.kind,
		metadata: input.metadata ?? null,
		size: input.size ?? input.body.byteLength,
		width: input.width ?? null,
	};
}

function createVariantStorageKey(file: FileRecord, kind: string, extension: string) {
	return `variants/${file.id}/${kind}.${extension.replace(/^\.+/, "") || "bin"}`;
}

function getFileExtension(file: FileRecord) {
	const extension = file.fileName.split(".").at(-1);
	if (extension && extension !== file.fileName) {
		return extension.toLowerCase();
	}

	if (file.contentType === "image/png") {
		return "png";
	}

	if (file.contentType === "image/jpeg") {
		return "jpg";
	}

	if (file.contentType === "image/webp") {
		return "webp";
	}

	return "bin";
}
