import type { DbInstance } from "@de100/apps-proto-cook-db";
import type { FilesVideoHlsPlan } from "@de100/files-processing-video";
import type { FilesProcessingJobRecord, FilesVariantRecord } from "@de100/files-server/operations";
import type {
	FileRecord,
	FilesArtifactGroupRecord,
	FilesArtifactRecord,
} from "@de100/files-shared";
import { describe, expect, it } from "vitest";

import {
	createProtoCookFilesProcessingPipeline,
	processProtoCookUploadedFile,
} from "./files-processing";
import type { ProtoCookFilesRepositories } from "./files-repositories";
import type { FilesStorageProvider } from "./files-storage";

const timestamp = new Date("2026-06-06T08:00:00.000Z");
const request = new Request("https://app.test/api/files");
type ProtoCookFilesContext = Parameters<typeof createProtoCookFilesProcessingPipeline>[0];

describe("Proto Cook files processing", () => {
	it("runs the concrete pipeline and persists an optimized image variant", async () => {
		const storageProvider = createFakeStorageProvider();
		const context = createFilesContext();
		const repositories = createRepositories();
		const file = createFileRecord();
		const pipeline = createProtoCookFilesProcessingPipeline(context, {
			dependencies: {
				async load(dependency) {
					return {
						dependency,
						reason: `${dependency} not enabled in this test`,
						status: "unavailable",
					};
				},
			},
			storageProvider,
		});

		const processed = await processProtoCookUploadedFile({
			file,
			filesContext: context,
			pipeline,
			repositories,
		});

		expect(processed.record).toMatchObject({
			id: "file_1",
			status: "ready",
		});
		expect(repositories.__state.fileStatuses).toEqual(["processing", "ready"]);
		expect(repositories.__state.variants).toMatchObject([
			{
				contentType: "image/png",
				fileId: "file_1",
				key: "variants/file_1/optimized.png",
				kind: "optimized",
				status: "ready",
			},
		]);
		expect(storageProvider.__state.puts).toMatchObject([
			{
				key: "variants/file_1/optimized.png",
				visibility: "private",
			},
		]);
		expect(repositories.__state.job).toMatchObject({
			attempts: 1,
			status: "succeeded",
		});
	});

	it("uses an injected ffmpeg adapter to persist video poster variants", async () => {
		const file = createFileRecord({
			contentType: "video/mp4",
			fileName: "lesson.mp4",
			key: "users/user_1/lesson.mp4",
			kind: "video",
			size: 12,
		});
		const storageProvider = createFakeStorageProvider(file);
		const context = createFilesContext();
		const repositories = createRepositories(file);
		const pipeline = createProtoCookFilesProcessingPipeline(context, {
			dependencies: {
				async load(dependency) {
					return dependency === "ffmpeg"
						? {
								dependency,
								module: {
									createPoster: async () => ({
										body: new Uint8Array([1, 2, 3]),
										contentType: "image/jpeg",
										extension: "jpg",
										height: 180,
										metadata: { source: "fake-ffmpeg" },
										width: 320,
									}),
								},
								status: "available",
							}
						: {
								dependency,
								reason: `${dependency} not enabled in this test`,
								status: "unavailable",
							};
				},
			},
			storageProvider,
		});

		await processProtoCookUploadedFile({
			file,
			filesContext: context,
			pipeline,
			repositories,
		});

		expect(repositories.__state.variants).toMatchObject([
			{
				contentType: "image/jpeg",
				height: 180,
				key: "variants/file_1/poster.jpg",
				kind: "poster",
				width: 320,
			},
		]);
	});

	it("uses an injected ffmpeg HLS adapter to persist artifact groups for video-hls jobs", async () => {
		const file = createFileRecord({
			contentType: "video/mp4",
			fileName: "lesson.mp4",
			key: "users/user_1/lesson.mp4",
			kind: "video",
			metadata: {
				height: 720,
				width: 1280,
			},
			size: 12,
		});
		const storageProvider = createFakeStorageProvider(file);
		const context = createFilesContext();
		const repositories = createRepositories(file);
		const pipeline = createProtoCookFilesProcessingPipeline(context, {
			dependencies: {
				async load(dependency) {
					return dependency === "ffmpeg"
						? {
								dependency,
								module: {
									createHls: async ({ plan }: { plan: FilesVideoHlsPlan }) => [
										{
											contentType: "image/jpeg",
											key: plan.posterKey,
											size: 4,
											value: new Uint8Array([1, 2, 3, 4]),
										},
										...plan.renditions.flatMap(({ manifestKey, rendition }) => [
											{
												contentType: "application/vnd.apple.mpegurl",
												key: manifestKey,
												size: 20,
												value: `#EXTM3U\n# ${rendition.label}\n`,
											},
											{
												contentType: "video/MP2T",
												key: `${plan.targetPrefix}/${rendition.label}/segment-00001.ts`,
												size: 40,
												value: new Uint8Array([1, 2, 3]),
											},
										]),
									],
								},
								status: "available",
							}
						: {
								dependency,
								reason: `${dependency} not enabled in this test`,
								status: "unavailable",
							};
				},
			},
			repositories,
			storageProvider,
		});

		const processed = await processProtoCookUploadedFile({
			file,
			filesContext: context,
			kind: "video-hls",
			pipeline,
			repositories,
		});

		expect(processed.result.metadata).toMatchObject({
			artifactCount: 7,
			ffmpeg: "available",
			inputFormat: "mp4",
			renditions: ["480p", "720p"],
			videoHls: "generated",
		});
		expect(repositories.__state.artifactGroups).toHaveLength(1);
		expect(repositories.__state.artifactGroups[0]).toMatchObject({
			fileId: "file_1",
			kind: "hls",
			status: "ready",
			visibility: "private",
		});
		expect(repositories.__state.artifacts.map((artifact) => artifact.kind)).toEqual([
			"hls-master-manifest",
			"poster",
			"hls-rendition-manifest",
			"hls-segment",
			"hls-rendition-manifest",
			"hls-segment",
			"metadata",
		]);
		expect(storageProvider.__state.puts).toHaveLength(14);
		expect(storageProvider.__state.deletes).toHaveLength(7);
		expect(repositories.__state.variants).toEqual([]);
	});

	it("uses video-hls-encryption jobs to persist encrypted HLS key artifacts", async () => {
		const file = createFileRecord({
			contentType: "video/mp4",
			fileName: "lesson.mp4",
			key: "users/user_1/lesson.mp4",
			kind: "video",
			metadata: {
				height: 480,
				width: 854,
			},
			size: 12,
		});
		const storageProvider = createFakeStorageProvider(file);
		const context = createFilesContext();
		const repositories = createRepositories(file);
		const observedEncryption: Array<{
			keyBytesHex: string;
			keyInfoBody: string;
			keyInfoFilePath: string;
		} | null> = [];
		const pipeline = createProtoCookFilesProcessingPipeline(context, {
			dependencies: {
				async load(dependency) {
					return dependency === "ffmpeg"
						? {
								dependency,
								module: {
									createHls: async ({
										encryption,
										plan,
									}: {
										encryption: {
											keyBytesHex: string;
											keyInfoBody: string;
											keyInfoFilePath: string;
										} | null;
										plan: FilesVideoHlsPlan;
									}) => {
										observedEncryption.push(encryption);

										return [
											{
												contentType: "image/jpeg",
												key: plan.posterKey,
												size: 4,
												value: new Uint8Array([1, 2, 3, 4]),
											},
											...plan.renditions.flatMap(({ manifestKey, rendition }) => [
												{
													contentType: "application/vnd.apple.mpegurl",
													key: manifestKey,
													size: 120,
													value: [
														"#EXTM3U",
														`#EXT-X-KEY:METHOD=AES-128,URI="${plan.encryption?.keyUri}",IV=0x${plan.encryption?.ivHex}`,
														`# ${rendition.label}`,
														"",
													].join("\n"),
												},
												{
													contentType: "video/MP2T",
													key: `${plan.targetPrefix}/${rendition.label}/segment-00001.ts`,
													size: 40,
													value: new Uint8Array([1, 2, 3]),
												},
											]),
										];
									},
								},
								status: "available",
							}
						: {
								dependency,
								reason: `${dependency} not enabled in this test`,
								status: "unavailable",
							};
				},
			},
			repositories,
			storageProvider,
		});

		const processed = await processProtoCookUploadedFile({
			file,
			filesContext: context,
			kind: "video-hls-encryption",
			pipeline,
			repositories,
		});

		expect(processed.result.metadata).toMatchObject({
			artifactCount: 6,
			protectionMode: "aes-128",
			renditions: ["480p"],
			videoHls: "generated",
		});
		expect(observedEncryption).toHaveLength(1);
		expect(observedEncryption[0]).toMatchObject({
			keyInfoFilePath: expect.stringContaining(".key.info"),
		});
		expect(observedEncryption[0]?.keyBytesHex).toMatch(/^[0-9a-f]{32}$/u);
		expect(observedEncryption[0]?.keyInfoBody).toContain("de100-hls-key://");
		expect(repositories.__state.artifactGroups[0]).toMatchObject({
			kind: "hls-encrypted",
			metadata: {
				encryption: {
					algorithm: "AES-128",
				},
				protectionMode: "aes-128",
			},
		});
		expect(repositories.__state.artifacts.map((artifact) => artifact.kind)).toEqual([
			"hls-master-manifest",
			"poster",
			"hls-rendition-manifest",
			"hls-segment",
			"hls-key",
			"metadata",
		]);
		expect(storageProvider.__state.puts).toHaveLength(12);
		expect(storageProvider.__state.deletes).toHaveLength(6);
	});

	it("uses an injected ffmpeg adapter to persist audio waveform variants", async () => {
		const file = createFileRecord({
			contentType: "audio/mpeg",
			fileName: "intro.mp3",
			key: "users/user_1/intro.mp3",
			kind: "audio",
			size: 10,
		});
		const storageProvider = createFakeStorageProvider(file);
		const context = createFilesContext();
		const repositories = createRepositories(file);
		const pipeline = createProtoCookFilesProcessingPipeline(context, {
			dependencies: {
				async load(dependency) {
					return dependency === "ffmpeg"
						? {
								dependency,
								module: {
									createWaveform: async () => ({
										body: new TextEncoder().encode('{"peaks":[0,1]}'),
										contentType: "application/json",
										extension: "json",
										metadata: { source: "fake-ffmpeg" },
									}),
								},
								status: "available",
							}
						: {
								dependency,
								reason: `${dependency} not enabled in this test`,
								status: "unavailable",
							};
				},
			},
			storageProvider,
		});

		await processProtoCookUploadedFile({
			file,
			filesContext: context,
			pipeline,
			repositories,
		});

		expect(repositories.__state.variants).toMatchObject([
			{
				contentType: "application/json",
				key: "variants/file_1/waveform.json",
				kind: "waveform",
				status: "ready",
			},
		]);
	});
});

function createFilesContext(): ProtoCookFilesContext {
	return {
		app: {
			db: {} as DbInstance,
		},
		auth: {
			userId: "user_1",
		},
		request: request as unknown as ProtoCookFilesContext["request"],
	};
}

function createFileRecord(input: Partial<FileRecord> = {}): FileRecord {
	return {
		accessUrl: null,
		bucketName: "local-private-files",
		contentType: "image/png",
		createdAt: timestamp,
		deletedAt: null,
		fileName: "avatar.png",
		id: "file_1",
		key: "users/user_1/avatar.png",
		kind: "image",
		metadata: null,
		size: 6,
		status: "stored",
		updatedAt: timestamp,
		userId: "user_1",
		visibility: "private",
		...input,
	};
}

function createFakeStorageProvider(sourceFile = createFileRecord()) {
	const state = {
		deletes: [] as Array<{ key: string; visibility: string }>,
		objects: new Map<string, Uint8Array>([
			[`${sourceFile.visibility}:${sourceFile.key}`, new TextEncoder().encode("source")],
		]),
		puts: [] as Array<{ key: string; visibility: string }>,
	};
	const provider: FilesStorageProvider & { __state: typeof state } = {
		__state: state,
		async createSignedReadUrl() {
			return null;
		},
		async createSignedWriteUrl() {
			return null;
		},
		async deleteObject(input) {
			state.deletes.push({
				key: input.key,
				visibility: input.visibility,
			});
			state.objects.delete(`${input.visibility}:${input.key}`);
		},
		driver: "local",
		getBucketName(visibility) {
			return visibility === "public" ? "local-public-files" : "local-private-files";
		},
		getCapabilities() {
			return {
				driver: "local",
				provider: null,
				supportsDirectPublicUrl: false,
				supportsSignedDelivery: false,
			};
		},
		async getObject(input) {
			const body = state.objects.get(`${input.visibility}:${input.key}`);
			return body
				? {
						body,
						httpMetadata: {
							contentType: "image/png",
						},
						size: body.byteLength,
						uploaded: timestamp,
					}
				: null;
		},
		getPublicDirectUrl() {
			return null;
		},
		async headObject(input) {
			const object = await provider.getObject(input);
			return object
				? {
						httpMetadata: object.httpMetadata,
						size: object.size,
						uploaded: object.uploaded,
					}
				: null;
		},
		async listPrefix() {
			return null;
		},
		async putObject(input) {
			state.puts.push({
				key: input.key,
				visibility: input.visibility,
			});
			state.objects.set(`${input.visibility}:${input.key}`, await readBytes(input.value));
		},
	};

	return provider;
}

function createRepositories(sourceFile = createFileRecord()) {
	const state: {
		artifactGroups: FilesArtifactGroupRecord[];
		artifacts: FilesArtifactRecord[];
		file: FileRecord;
		fileStatuses: string[];
		job: FilesProcessingJobRecord;
		variants: FilesVariantRecord[];
	} = {
		artifactGroups: [],
		artifacts: [],
		file: sourceFile,
		fileStatuses: [],
		job: {
			attempts: 0,
			createdAt: timestamp,
			error: null,
			fileId: "file_1",
			id: "job_1",
			input: null,
			kind: "upload-complete",
			output: null,
			runAfter: null,
			status: "queued" as const,
			updatedAt: timestamp,
		},
		variants: [],
	};
	const repositories: ProtoCookFilesRepositories & { __state: typeof state } = {
		__state: state,
		artifacts: {
			groups: {
				async createGroup(input) {
					const group: FilesArtifactGroupRecord = {
						bucketName: input.bucketName ?? null,
						createdAt: timestamp,
						deletedAt: null,
						fileId: input.fileId,
						id: input.id ?? "artifact_group_1",
						kind: input.kind,
						metadata: input.metadata ?? null,
						revision: input.revision,
						status: input.status,
						storagePrefix: input.storagePrefix,
						updatedAt: timestamp,
						visibility: input.visibility,
					};
					state.artifactGroups.push(group);
					return group;
				},
				async getGroup(id) {
					return state.artifactGroups.find((group) => group.id === id) ?? null;
				},
				async listGroups(fileId) {
					return state.artifactGroups.filter((group) => group.fileId === fileId);
				},
				async updateGroupStatus(id, status) {
					const group = state.artifactGroups.find((item) => item.id === id);
					if (!group) {
						return null;
					}

					group.status = status;
					return group;
				},
			},
			items: {
				async createArtifact(input) {
					const artifact: FilesArtifactRecord = {
						bucketName: input.bucketName ?? null,
						contentType: input.contentType,
						createdAt: timestamp,
						deletedAt: null,
						durationMs: input.durationMs ?? null,
						fileId: input.fileId,
						groupId: input.groupId,
						height: input.height ?? null,
						id: input.id ?? `artifact_${state.artifacts.length + 1}`,
						key: input.key,
						kind: input.kind,
						metadata: input.metadata ?? null,
						renditionLabel: input.renditionLabel ?? null,
						size: input.size,
						sortOrder: input.sortOrder,
						status: input.status,
						updatedAt: timestamp,
						width: input.width ?? null,
					};
					state.artifacts.push(artifact);
					return artifact;
				},
				async listArtifacts(groupId) {
					return state.artifacts.filter((artifact) => artifact.groupId === groupId);
				},
				async updateArtifactStatus(id, status) {
					const artifact = state.artifacts.find((item) => item.id === id);
					if (!artifact) {
						return null;
					}

					artifact.status = status;
					return artifact;
				},
			},
		},
		files: {
			async createFile(input) {
				state.file = createFileRecord(input);
				return state.file;
			},
			async deleteFile() {
				return null;
			},
			async getFile() {
				return state.file;
			},
			async getFileByKey() {
				return state.file;
			},
			async listFiles() {
				return [state.file];
			},
			async updateFileStatus(_id, status) {
				state.fileStatuses.push(status);
				state.file = createFileRecord({
					...state.file,
					status,
				});
				return state.file;
			},
		},
		jobs: {
			async createJob(input) {
				state.job = {
					...state.job,
					attempts: input.attempts ?? 0,
					error: input.error ?? null,
					fileId: input.fileId,
					id: input.id,
					input: input.input ?? null,
					kind: input.kind,
					output: input.output ?? null,
					runAfter: input.runAfter ?? null,
					status: input.status,
				};
				return state.job;
			},
			async getJob() {
				return state.job;
			},
			async updateJob(_id, patch) {
				state.job = {
					...state.job,
					...patch,
				};
				return state.job;
			},
			async updateJobStatus(_id, status) {
				state.job = {
					...state.job,
					status,
				};
				return state.job;
			},
		},
		parts: {
			async createPart(input) {
				return {
					checksum: input.checksum ?? null,
					createdAt: timestamp,
					etag: input.etag ?? null,
					fileId: input.fileId,
					id: input.id,
					partNumber: input.partNumber,
					sessionId: input.sessionId,
					size: input.size,
					updatedAt: timestamp,
				};
			},
			async listParts() {
				return [];
			},
		},
		sessions: {
			async createSession(input) {
				return {
					createdAt: timestamp,
					expiresAt: input.expiresAt,
					fileId: input.fileId,
					id: input.id,
					protocol: input.protocol,
					status: input.status,
					updatedAt: timestamp,
					userId: input.userId,
				};
			},
			async getSession() {
				return null;
			},
			async updateSessionStatus() {
				return null;
			},
		},
		variants: {
			async createVariant(input) {
				const variant = {
					bucketName: input.bucketName,
					contentType: input.contentType,
					createdAt: timestamp,
					deletedAt: null,
					fileId: input.fileId,
					height: input.height ?? null,
					id: input.id,
					key: input.key,
					kind: input.kind,
					metadata: input.metadata ?? null,
					size: input.size,
					status: input.status,
					updatedAt: timestamp,
					width: input.width ?? null,
				};
				state.variants.push(variant);
				return variant;
			},
			async listVariants() {
				return state.variants;
			},
			async updateVariantStatus(id, status) {
				const variant = state.variants.find((item) => item.id === id);
				if (!variant) {
					return null;
				}

				variant.status = status;
				return variant;
			},
		},
	};

	return repositories;
}

async function readBytes(
	value: Parameters<FilesStorageProvider["putObject"]>[0]["value"],
): Promise<Uint8Array> {
	if (typeof value === "string") {
		return new TextEncoder().encode(value);
	}

	if (value instanceof ArrayBuffer) {
		return new Uint8Array(value);
	}

	if (value instanceof ReadableStream) {
		return new Uint8Array(await new Response(value).arrayBuffer());
	}

	if (ArrayBuffer.isView(value)) {
		return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
	}

	return new Uint8Array(await value.arrayBuffer());
}
