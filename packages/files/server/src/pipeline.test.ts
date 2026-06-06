import type { FileRecord } from "@de100/files-shared";
import { describe, expect, it } from "vitest";

import type {
	FilesOperations,
	FilesProcessingJobRecord,
	FilesRequestContext,
	FilesVariantRecord,
} from "./operations";
import { createFilesPipeline, runFilesProcessingJob } from "./pipeline";

const timestamp = new Date("2026-06-06T08:00:00.000Z");
const request = new Request("https://app.test/files");

describe("files processing pipeline", () => {
	it("aggregates metadata and variants, then runs cleanup callbacks", async () => {
		const cleanupOrder: string[] = [];
		const pipeline = createFilesPipeline([
			{
				name: "metadata",
				async run() {
					return {
						cleanup: () => {
							cleanupOrder.push("stage");
						},
						metadata: { width: 320 },
					};
				},
			},
			{
				name: "variant",
				async run(input) {
					return {
						variants: [
							{
								contentType: "image/webp",
								key: "variants/file_1/thumbnail.webp",
								kind: "thumbnail",
								size: 512,
								width: input.state.metadata.width as number,
							},
						],
					};
				},
			},
		]);

		const result = await pipeline.run({
			cleanup: () => {
				cleanupOrder.push("input");
			},
			context: createContext(),
			file: createFileRecord(),
		});

		expect(result).toMatchObject({
			attempts: 1,
			metadata: { width: 320 },
			status: "succeeded",
			variants: [
				{
					kind: "thumbnail",
					width: 320,
				},
			],
		});
		expect(cleanupOrder).toEqual(["stage", "input"]);
	});

	it("retries failed attempts and reports the final successful attempt", async () => {
		const cleanupAttempts: number[] = [];
		const pipeline = createFilesPipeline(
			[
				{
					name: "scan",
					async run(input) {
						if (input.state.attempt === 1) {
							throw new Error("temporary scanner failure");
						}

						return {
							metadata: { scanned: true },
						};
					},
				},
			],
			{
				retry: {
					maxAttempts: 2,
				},
			},
		);

		const result = await pipeline.run({
			cleanup: () => {
				cleanupAttempts.push(Date.now());
			},
			context: createContext(),
			file: createFileRecord(),
		});

		expect(result).toMatchObject({
			attempts: 2,
			metadata: { scanned: true },
			status: "succeeded",
		});
		expect(result.stageResults.map((stage) => stage.status)).toEqual(["failed", "succeeded"]);
		expect(cleanupAttempts).toHaveLength(2);
	});

	it("persists processing job success and generated variants through app operations", async () => {
		const operations = createOperations();
		const pipeline = createFilesPipeline([
			{
				name: "thumbnail",
				async run() {
					return {
						metadata: { width: 128 },
						variants: [
							{
								contentType: "image/webp",
								height: 128,
								key: "variants/file_1/thumbnail.webp",
								kind: "thumbnail",
								size: 512,
								width: 128,
							},
						],
					};
				},
			},
		]);

		const result = await runFilesProcessingJob({
			context: createContext(),
			file: createFileRecord(),
			kind: "thumbnail",
			operations,
			pipeline,
		});

		expect(result).toMatchObject({
			job: {
				attempts: 1,
				status: "succeeded",
			},
			persistedVariants: [
				{
					fileId: "file_1",
					kind: "thumbnail",
					status: "ready",
				},
			],
			status: "succeeded",
		});
		expect(operations.__state.fileStatuses).toEqual(["processing", "ready"]);
	});

	it("persists processing job failure without creating variants", async () => {
		const operations = createOperations();
		const pipeline = createFilesPipeline([
			{
				name: "transcode",
				async run() {
					throw new Error("ffmpeg unavailable");
				},
			},
		]);

		const result = await runFilesProcessingJob({
			context: createContext(),
			file: createFileRecord({ kind: "video" }),
			kind: "transcode",
			operations,
			pipeline,
		});

		expect(result).toMatchObject({
			error: {
				message: "ffmpeg unavailable",
			},
			job: {
				status: "failed",
			},
			persistedVariants: [],
			status: "failed",
		});
		expect(operations.__state.fileStatuses).toEqual(["processing", "failed"]);
		expect(operations.__state.variants).toEqual([]);
	});
});

function createContext(): FilesRequestContext {
	return {
		app: {},
		auth: {
			userId: "user_1",
		},
		request,
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
		size: 1024,
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
		kind: "thumbnail",
		output: null,
		runAfter: null,
		status: "queued",
		updatedAt: timestamp,
		...input,
	};
}

function createOperations() {
	const state = {
		fileStatuses: [] as string[],
		job: createJobRecord(),
		variants: [] as FilesVariantRecord[],
	};
	const operations: FilesOperations & { __state: typeof state } = {
		__state: state,
		async createContext() {
			return createContext();
		},
		files: {
			async createFile(input) {
				return createFileRecord(input);
			},
			async deleteFile() {
				return null;
			},
			async getFile() {
				return createFileRecord();
			},
			async getFileByKey() {
				return createFileRecord();
			},
			async listFiles() {
				return [createFileRecord()];
			},
			async updateFileStatus(_id, status) {
				state.fileStatuses.push(status);
				return createFileRecord({ status });
			},
		},
		jobs: {
			async createJob(input) {
				state.job = createJobRecord({
					attempts: input.attempts ?? 0,
					error: input.error ?? null,
					fileId: input.fileId,
					id: input.id,
					input: input.input ?? null,
					kind: input.kind,
					output: input.output ?? null,
					runAfter: input.runAfter ?? null,
					status: input.status,
				});

				return state.job;
			},
			async getJob() {
				return state.job;
			},
			async updateJob(_id, patch) {
				state.job = createJobRecord({
					...state.job,
					...patch,
				});
				return state.job;
			},
			async updateJobStatus(_id, status) {
				state.job = createJobRecord({
					...state.job,
					status,
				});
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

	return operations;
}
