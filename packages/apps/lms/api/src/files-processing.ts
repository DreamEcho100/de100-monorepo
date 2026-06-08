import type { DbInstance } from "@de100/apps-lms-db";
import type {
	FilesFfmpegCommand,
	FilesVideoHlsGeneratedObject,
	FilesVideoHlsPlan,
	FilesVideoHlsProcessingPreset,
	FilesVideoSourceMetadata,
} from "@de100/files-processing-video";
import {
	assertFilesVideoHlsGeneratedObjects,
	createFilesVideoFfmpegHlsCommands,
	createFilesVideoHlsAes128KeyInfoFile,
	createFilesVideoHlsAes128KeyObject,
	createFilesVideoHlsArtifactInputs,
	createFilesVideoHlsMasterManifest,
	createFilesVideoHlsMetadataObject,
	createFilesVideoHlsPlan,
	createFilesVideoHlsStagingPlan,
	detectFilesVideoInputFormat,
	filesVideoDefaultHlsProcessingPreset,
	promoteFilesVideoHlsGeneratedObjects,
} from "@de100/files-processing-video";
import type { FilesRequestContext } from "@de100/files-server/operations";
import type { FilesPipeline, FilesPipelineStage } from "@de100/files-server/pipeline";
import { createFilesPipeline, runFilesProcessingJob } from "@de100/files-server/pipeline";
import type { FilesProcessingDependencyRegistry } from "@de100/files-server/processing-dependencies";
import { createFilesProcessingDependencyRegistry } from "@de100/files-server/processing-dependencies";
import {
	createFilesArtifactPromotedPrefix,
	createFilesArtifactStagingPrefix,
} from "@de100/files-server/worker";
import type { FileRecord } from "@de100/files-shared";

import type { LmsFilesRepositories } from "./files-repositories";
import type { FilesStorageProvider, PutFilesObjectInput } from "./files-storage";
import { getFilesStorageProvider } from "./files-storage";

type LmsFilesContext = FilesRequestContext<{ db: DbInstance }>;

type ProcessLmsUploadedFileInput = {
	file: FileRecord;
	filesContext: LmsFilesContext;
	job?: Parameters<typeof runFilesProcessingJob<{ db: DbInstance }>>[0]["job"];
	kind?: string;
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

type HlsGeneratedOutput = FilesVideoHlsGeneratedObject & {
	value: PutFilesObjectInput["value"];
};

type FfmpegVariantMethod = "createPoster" | "createWaveform";

type FfmpegAdapter = {
	createHls?: (input: {
		commands: FilesFfmpegCommand[];
		encryption: {
			keyBytesHex: string;
			keyFilePath: string;
			keyInfoBody: string;
			keyInfoFilePath: string;
		} | null;
		file: FileRecord;
		plan: FilesVideoHlsPlan;
		source: {
			bucketName: string | null;
			key: string;
			visibility: FileRecord["visibility"];
		};
	}) => Promise<HlsGeneratedOutput[]>;
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
	repositories?: LmsFilesRepositories;
	storageProvider?: FilesStorageProvider;
};

export async function processLmsUploadedFile(input: ProcessLmsUploadedFileInput) {
	const result = await runFilesProcessingJob({
		context: input.filesContext,
		file: input.file,
		job: input.job,
		kind: input.kind ?? "upload-complete",
		operations: {
			createContext: async () => input.filesContext,
			...input.repositories,
		},
		pipeline:
			input.pipeline ??
			createLmsFilesProcessingPipeline(input.filesContext, {
				repositories: input.repositories,
			}),
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

				if (input.file.kind === "video") {
					if (input.job?.kind === "video-hls" || input.job?.kind === "video-hls-encryption") {
						return createVideoHlsArtifacts({
							dependencies,
							file: input.file,
							jobId: input.job.id,
							protectionMode:
								input.job.kind === "video-hls-encryption" ? "aes-128" : "signed-session",
							repositories: options.repositories,
							stateAttempt: input.state.attempt,
							storageProvider,
						});
					}

					const sourceBytes = await readStoredFileBytes(input.file, storageProvider);
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

				const sourceBytes = await readStoredFileBytes(input.file, storageProvider);
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

async function createVideoHlsArtifacts(input: {
	dependencies: FilesProcessingDependencyRegistry;
	file: FileRecord;
	jobId: string;
	protectionMode: "aes-128" | "signed-session";
	repositories?: LmsFilesRepositories;
	stateAttempt: number;
	storageProvider: FilesStorageProvider;
}) {
	const artifacts = input.repositories?.artifacts;
	if (!artifacts) {
		return {
			metadata: {
				videoHls: "repository-unavailable",
			},
			reason: "Video HLS generation requires artifact repositories.",
			status: "skipped" as const,
		};
	}

	const inputFormat = detectFilesVideoInputFormat({
		contentType: input.file.contentType,
		fileName: input.file.fileName,
	});
	if (!inputFormat) {
		return {
			metadata: {
				contentType: input.file.contentType,
				videoHls: "unsupported-input",
			},
			reason: "This video input format is not configured for LMS HLS processing.",
			status: "skipped" as const,
		};
	}

	const ffmpegResult = await input.dependencies.load("ffmpeg");
	const adapter = resolveFfmpegAdapter(
		ffmpegResult.status === "available" ? ffmpegResult.module : null,
	);
	if (!adapter?.createHls) {
		return {
			metadata: {
				ffmpeg: ffmpegResult.status,
				videoHls: "adapter-unavailable",
			},
			reason: "Video HLS generation requires an injected ffmpeg HLS adapter.",
			status: "skipped" as const,
		};
	}

	const groupId = crypto.randomUUID();
	const revision = 1;
	const stagingPrefix = createFilesArtifactStagingPrefix({
		attempt: input.stateAttempt,
		fileId: input.file.id,
		groupId,
		jobId: input.jobId,
	});
	const targetPrefix = createFilesArtifactPromotedPrefix({
		fileId: input.file.id,
		groupId,
		revision,
	});
	const sourceMetadata = resolveVideoSourceMetadata(input.file.metadata);
	const preset = createVideoHlsProcessingPreset(input.protectionMode);
	const plan = createFilesVideoHlsPlan({
		encryption:
			input.protectionMode === "aes-128"
				? {
						keyId: groupId,
					}
				: undefined,
		preset,
		sourceMetadata,
		stagingPrefix,
		targetPrefix,
	});
	const stagingPlan = createFilesVideoHlsStagingPlan(plan);
	const encryption = createVideoHlsEncryptionAdapterInput({
		jobId: input.jobId,
		plan: stagingPlan,
	});
	const commands = createFilesVideoFfmpegHlsCommands({
		hlsKeyInfoFilePath: encryption?.keyInfoFilePath,
		inputPath: input.file.key,
		plan: stagingPlan,
	});
	const generatedByAdapter = await adapter.createHls({
		commands,
		encryption,
		file: input.file,
		plan: stagingPlan,
		source: {
			bucketName: input.file.bucketName,
			key: input.file.key,
			visibility: input.file.visibility,
		},
	});
	const masterManifest = createFilesVideoHlsMasterManifest(stagingPlan);
	const metadataObject = createFilesVideoHlsMetadataObject({
		plan: stagingPlan,
		sourceMetadata,
	});
	const keyObject = encryption
		? createFilesVideoHlsAes128KeyObject({
				keyBytesHex: encryption.keyBytesHex,
				plan: stagingPlan,
			})
		: null;
	const stagingObjects: HlsGeneratedOutput[] = [
		{
			contentType: "application/vnd.apple.mpegurl",
			key: stagingPlan.masterManifestKey,
			size: new TextEncoder().encode(masterManifest).byteLength,
			value: masterManifest,
		},
		...generatedByAdapter,
		...(keyObject
			? [
					{
						...keyObject,
						value: keyObject.body,
					},
				]
			: []),
		{
			...metadataObject,
			value: metadataObject.body,
		},
	];

	try {
		await writeHlsObjectsToStorage({
			file: input.file,
			objects: stagingObjects,
			storageProvider: input.storageProvider,
		});
		assertFilesVideoHlsGeneratedObjects({
			objects: stagingObjects,
			plan: stagingPlan,
		});

		const promotedObjects = promoteFilesVideoHlsGeneratedObjects({
			objects: stagingObjects,
			plan,
		}).map((object, index) => ({
			...object,
			value: stagingObjects[index]?.value ?? "",
		}));

		await writeHlsObjectsToStorage({
			file: input.file,
			objects: promotedObjects,
			storageProvider: input.storageProvider,
		});
		await cleanupHlsObjects({
			file: input.file,
			objects: stagingObjects,
			storageProvider: input.storageProvider,
		});

		const artifactPlan = createFilesVideoHlsArtifactInputs({
			bucketName: input.storageProvider.getBucketName(input.file.visibility),
			fileId: input.file.id,
			groupId,
			objects: promotedObjects,
			plan,
			revision,
			visibility: input.file.visibility,
		});
		const artifactGroup = await artifacts.groups.createGroup(artifactPlan.group);
		const artifactRecords = [];
		for (const artifact of artifactPlan.artifacts) {
			artifactRecords.push(await artifacts.items.createArtifact(artifact));
		}

		return {
			metadata: {
				artifactCount: artifactRecords.length,
				artifactGroupId: artifactGroup.id,
				ffmpeg: ffmpegResult.status,
				inputFormat,
				protectionMode: plan.protectionMode,
				renditions: plan.renditions.map(({ rendition }) => rendition.label),
				videoHls: "generated",
			},
		};
	} catch (error) {
		await cleanupHlsObjects({
			file: input.file,
			objects: stagingObjects,
			storageProvider: input.storageProvider,
		});
		throw error;
	}
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
	method: FfmpegVariantMethod;
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

async function writeHlsObjectsToStorage(input: {
	file: FileRecord;
	objects: HlsGeneratedOutput[];
	storageProvider: FilesStorageProvider;
}) {
	for (const object of input.objects) {
		await input.storageProvider.putObject({
			httpMetadata: {
				cacheControl:
					input.file.visibility === "public"
						? "public, max-age=31536000, immutable"
						: "private, no-store, max-age=0",
				contentDisposition: "inline",
				contentType: object.contentType,
			},
			key: object.key,
			value: object.value,
			visibility: input.file.visibility,
		});
	}
}

async function cleanupHlsObjects(input: {
	file: FileRecord;
	objects: Pick<HlsGeneratedOutput, "key">[];
	storageProvider: FilesStorageProvider;
}) {
	await Promise.allSettled(
		input.objects.map((object) =>
			input.storageProvider.deleteObject({
				key: object.key,
				visibility: input.file.visibility,
			}),
		),
	);
}

function createVideoHlsProcessingPreset(
	protectionMode: "aes-128" | "signed-session",
): FilesVideoHlsProcessingPreset {
	return {
		...filesVideoDefaultHlsProcessingPreset,
		playbackProtection: protectionMode,
	};
}

function createVideoHlsEncryptionAdapterInput(input: { jobId: string; plan: FilesVideoHlsPlan }) {
	if (!input.plan.encryption) {
		return null;
	}

	const keyFilePath = `/tmp/de100-files-${input.jobId}-${input.plan.encryption.keyId}.key`;
	const keyInfoFilePath = `${keyFilePath}.info`;

	return {
		keyBytesHex: createRandomAes128Hex(),
		keyFilePath,
		keyInfoBody: createFilesVideoHlsAes128KeyInfoFile({
			keyFilePath,
			plan: input.plan,
		}),
		keyInfoFilePath,
	};
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

function resolveVideoSourceMetadata(
	metadata: FileRecord["metadata"],
): FilesVideoSourceMetadata | undefined {
	if (typeof metadata !== "object" || metadata === null) {
		return undefined;
	}

	const height = readOptionalNumber(metadata, "height");
	const width = readOptionalNumber(metadata, "width");
	const durationMs = readOptionalNumber(metadata, "durationMs");
	if (height === undefined && width === undefined && durationMs === undefined) {
		return undefined;
	}

	return {
		durationMs,
		height,
		width,
	};
}

function readOptionalNumber(metadata: Record<string, unknown>, key: string) {
	const value = metadata[key];
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function createRandomAes128Hex() {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
