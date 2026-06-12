import type { ProtoCookFilesRepositories } from "@de100/apps-proto-cook-api/files-repositories";
import type { DbInstance } from "@de100/apps-proto-cook-db";
import type { FilesProcessingJobRecord, FilesVariantRecord } from "@de100/files-server/operations";
import { createFilesPipeline } from "@de100/files-server/pipeline";
import type { FilesQueueAdapter, FilesWorkerJobPayload } from "@de100/files-server/worker";
import type { FileRecord } from "@de100/files-shared";
import { describe, expect, it } from "vitest";

import { runProtoCookFilesWorkerLoop, runProtoCookFilesWorkerOnce } from "./runner";

const timestamp = new Date("2026-06-07T10:00:00.000Z");
const request = new Request("http://localhost/internal/files-worker") as unknown as NonNullable<
	Parameters<typeof runProtoCookFilesWorkerOnce>[0]["request"]
>;

describe("Proto Cook files worker runner", () => {
	it("runs one queued job through the injected processing pipeline", async () => {
		const file = createFileRecord();
		const job = createJobRecord();
		const queue = createFakeQueue([createPayload(job)]);
		const repositories = createRepositories({ file, job });
		const pipeline = createFilesPipeline<{ db: DbInstance }>([
			{
				name: "complete",
				async run() {
					return { metadata: { worker: "ok" } };
				},
			},
		]);

		const result = await runProtoCookFilesWorkerOnce({
			db: {} as DbInstance,
			pipeline,
			queue,
			repositories,
			request,
		});

		expect(result.status).toBe("succeeded");
		expect(queue.acked).toEqual(["job_1"]);
		expect(repositories.__state.fileStatuses).toEqual(["processing", "ready"]);
		expect(repositories.__state.job).toMatchObject({
			attempts: 1,
			status: "succeeded",
		});
	});

	it("fails the claimed job when the file is missing", async () => {
		const job = createJobRecord();
		const queue = createFakeQueue([createPayload(job)]);
		const repositories = createRepositories({ file: null, job });

		const result = await runProtoCookFilesWorkerOnce({
			db: {} as DbInstance,
			queue,
			repositories,
			request,
		});

		expect(result).toMatchObject({
			fileId: "file_1",
			jobId: "job_1",
			status: "missing-file",
		});
		expect(queue.failed[0]).toMatchObject({
			error: { name: "FilesWorkerMissingFile" },
			jobId: "job_1",
		});
		expect(repositories.__state.job.status).toBe("failed");
	});

	it("tracks loop counts for idle and completed iterations", async () => {
		const file = createFileRecord();
		const job = createJobRecord();
		const queue = createFakeQueue([createPayload(job)]);
		const repositories = createRepositories({ file, job });
		const pipeline = createFilesPipeline<{ db: DbInstance }>([
			{
				name: "complete",
				async run() {
					return undefined;
				},
			},
		]);

		await expect(
			runProtoCookFilesWorkerLoop({
				db: {} as DbInstance,
				maxIterations: 2,
				pipeline,
				pollIntervalMs: 1,
				queue,
				repositories,
				request,
			}),
		).resolves.toEqual({
			failed: 0,
			idle: 1,
			iterations: 2,
			succeeded: 1,
		});
	});
});

function createPayload(job: FilesProcessingJobRecord): FilesWorkerJobPayload {
	return {
		fileId: job.fileId,
		kind: "custom",
		metadata: job.input,
		processingJobId: job.id,
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
		size: 12,
		status: "stored",
		updatedAt: timestamp,
		userId: "user_1",
		visibility: "private",
		...input,
	};
}

function createJobRecord(input: Partial<FilesProcessingJobRecord> = {}): FilesProcessingJobRecord {
	return {
		attempts: 0,
		createdAt: timestamp,
		error: null,
		fileId: "file_1",
		id: "job_1",
		input: null,
		kind: "upload-complete",
		output: null,
		runAfter: null,
		status: "queued",
		updatedAt: timestamp,
		...input,
	};
}

function createFakeQueue(payloads: FilesWorkerJobPayload[]): FilesQueueAdapter & {
	acked: string[];
	failed: Array<{ error: Record<string, unknown>; jobId: string }>;
} {
	return {
		acked: [],
		async ack(jobId) {
			this.acked.push(jobId);
		},
		async enqueue(job) {
			payloads.push(job);
		},
		async fail(jobId, error) {
			this.failed.push({ error, jobId });
		},
		failed: [],
		async next() {
			return payloads.shift() ?? null;
		},
	};
}

function createRepositories(input: {
	file: FileRecord | null;
	job: FilesProcessingJobRecord;
}): ProtoCookFilesRepositories & {
	__state: {
		file: FileRecord | null;
		fileStatuses: string[];
		job: FilesProcessingJobRecord;
		variants: FilesVariantRecord[];
	};
} {
	const state = {
		file: input.file,
		fileStatuses: [] as string[],
		job: input.job,
		variants: [] as FilesVariantRecord[],
	};

	return {
		__state: state,
		files: {
			async createFile(fileInput) {
				state.file = createFileRecord(fileInput);
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
				return state.file ? [state.file] : [];
			},
			async updateFileStatus(_id, status) {
				state.fileStatuses.push(status);
				if (!state.file) {
					return null;
				}
				state.file = createFileRecord({ ...state.file, status });
				return state.file;
			},
		},
		jobs: {
			async createJob(jobInput) {
				state.job = createJobRecord({
					attempts: jobInput.attempts ?? 0,
					error: jobInput.error ?? null,
					fileId: jobInput.fileId,
					id: jobInput.id,
					input: jobInput.input ?? null,
					kind: jobInput.kind,
					output: jobInput.output ?? null,
					runAfter: jobInput.runAfter ?? null,
					status: jobInput.status,
				});
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
			async createPart(partInput) {
				return {
					checksum: partInput.checksum ?? null,
					createdAt: timestamp,
					etag: partInput.etag ?? null,
					fileId: partInput.fileId,
					id: partInput.id,
					partNumber: partInput.partNumber,
					sessionId: partInput.sessionId,
					size: partInput.size,
					updatedAt: timestamp,
				};
			},
			async listParts() {
				return [];
			},
		},
		sessions: {
			async createSession(sessionInput) {
				return {
					createdAt: timestamp,
					expiresAt: sessionInput.expiresAt,
					fileId: sessionInput.fileId,
					id: sessionInput.id,
					protocol: sessionInput.protocol,
					status: sessionInput.status,
					updatedAt: timestamp,
					userId: sessionInput.userId,
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
			async createVariant(variantInput) {
				const variant = {
					bucketName: variantInput.bucketName,
					contentType: variantInput.contentType,
					createdAt: timestamp,
					deletedAt: null,
					fileId: variantInput.fileId,
					height: variantInput.height ?? null,
					id: variantInput.id,
					key: variantInput.key,
					kind: variantInput.kind,
					metadata: variantInput.metadata ?? null,
					size: variantInput.size,
					status: variantInput.status,
					updatedAt: timestamp,
					width: variantInput.width ?? null,
				};
				state.variants.push(variant);
				return variant;
			},
			async listVariants() {
				return state.variants;
			},
			async updateVariantStatus() {
				return null;
			},
		},
	};
}
