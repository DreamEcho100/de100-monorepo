import { normalizeFileRouteConfig, normalizeFileRouteOptions } from "@de100/files-shared";
import { describe, expect, it, vi } from "vitest";

import { createFilesEventBus } from "./events";
import type { FilesOperations } from "./operations";
import type { FilesDirectUploadInput } from "./orpc";
import { createFilesOrpcHandlers } from "./orpc";

const request = new Request("https://app.test/api/rpc/files");

function createOperations(): FilesOperations {
	return {
		async createContext(request) {
			return {
				app: {},
				auth: {
					userId: "user_1",
				},
				request,
			};
		},
		files: {
			async createFile(input) {
				return {
					accessUrl: null,
					bucketName: input.bucketName,
					contentType: input.contentType,
					createdAt: new Date("2026-06-02T08:00:00.000Z"),
					deletedAt: null,
					fileName: input.fileName,
					id: "file_1",
					key: input.key,
					kind: input.kind,
					metadata: input.metadata ?? null,
					size: input.size,
					status: input.status,
					updatedAt: new Date("2026-06-02T08:00:00.000Z"),
					userId: input.userId,
					visibility: input.visibility,
				};
			},
			async deleteFile() {
				return null;
			},
			async getFile() {
				return null;
			},
			async getFileByKey() {
				return null;
			},
			async listFiles() {
				return [];
			},
			async updateFileStatus() {
				return null;
			},
		},
		jobs: {
			async createJob(input) {
				return {
					attempts: input.attempts ?? 0,
					createdAt: new Date("2026-06-02T08:00:00.000Z"),
					error: input.error ?? null,
					fileId: input.fileId,
					id: input.id,
					input: input.input ?? null,
					kind: input.kind,
					output: input.output ?? null,
					runAfter: input.runAfter ?? null,
					status: input.status,
					updatedAt: new Date("2026-06-02T08:00:00.000Z"),
				};
			},
			async getJob() {
				return null;
			},
			async updateJob() {
				return null;
			},
			async updateJobStatus() {
				return null;
			},
		},
		parts: {
			async createPart(input) {
				return {
					checksum: input.checksum ?? null,
					createdAt: new Date("2026-06-02T08:00:00.000Z"),
					etag: input.etag ?? null,
					fileId: input.fileId,
					id: input.id,
					partNumber: input.partNumber,
					sessionId: input.sessionId,
					size: input.size,
					updatedAt: new Date("2026-06-02T08:00:00.000Z"),
				};
			},
			async listParts() {
				return [];
			},
		},
		sessions: {
			async createSession(input) {
				return {
					createdAt: new Date("2026-06-02T08:00:00.000Z"),
					expiresAt: input.expiresAt,
					fileId: input.fileId,
					id: input.id,
					protocol: input.protocol,
					status: input.status,
					updatedAt: new Date("2026-06-02T08:00:00.000Z"),
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
				return {
					bucketName: input.bucketName,
					contentType: input.contentType,
					createdAt: new Date("2026-06-02T08:00:00.000Z"),
					deletedAt: null,
					fileId: input.fileId,
					height: input.height ?? null,
					id: input.id,
					key: input.key,
					kind: input.kind,
					metadata: input.metadata ?? null,
					size: input.size,
					status: input.status,
					updatedAt: new Date("2026-06-02T08:00:00.000Z"),
					width: input.width ?? null,
				};
			},
			async listVariants() {
				return [];
			},
			async updateVariantStatus() {
				return null;
			},
		},
	};
}

function createFile(input: {
	name: string;
	size: number;
	type: string;
}): FilesDirectUploadInput["file"] {
	return {
		async arrayBuffer() {
			return new ArrayBuffer(input.size);
		},
		name: input.name,
		size: input.size,
		type: input.type,
	};
}

describe("createFilesOrpcHandlers", () => {
	it("runs direct uploads for files within the direct policy", async () => {
		const directUpload = vi.fn(async (input: FilesDirectUploadInput) => ({
			accessUrl: null,
			bucketName: "local-private-files",
			contentType: input.file.type,
			createdAt: new Date("2026-06-02T08:00:00.000Z"),
			deletedAt: null,
			fileName: input.file.name,
			id: "file_1",
			key: "user_1/file_1-avatar.png",
			kind: "image" as const,
			metadata: input.metadata ?? null,
			size: input.file.size,
			status: "ready" as const,
			updatedAt: new Date("2026-06-02T08:00:00.000Z"),
			userId: "user_1",
			visibility: input.visibility ?? "private",
		}));
		const handlers = createFilesOrpcHandlers({
			async createUploadTarget() {
				throw new Error("not used");
			},
			directUpload,
			operations: createOperations(),
		});

		await expect(
			handlers.directUpload(
				{
					file: createFile({ name: "avatar.png", size: 1024, type: "image/png" }),
					routeSlug: "avatar",
					visibility: "private",
				},
				request,
			),
		).resolves.toMatchObject({
			fileName: "avatar.png",
			status: "ready",
		});
		expect(directUpload).toHaveBeenCalledOnce();
	});

	it("rejects large direct video uploads so callers use target flows", async () => {
		const handlers = createFilesOrpcHandlers({
			async createUploadTarget() {
				throw new Error("not used");
			},
			directUpload: vi.fn(),
			operations: createOperations(),
		});

		await expect(
			handlers.directUpload(
				{
					file: createFile({ name: "lesson.mp4", size: 30 * 1024 * 1024, type: "video/mp4" }),
					routeSlug: "lesson-video",
					visibility: "private",
				},
				request,
			),
		).rejects.toThrow("size-exceeds-direct-limit");
	});

	it("resolves large video upload mode to target protocol", () => {
		const handlers = createFilesOrpcHandlers({
			async createUploadTarget() {
				throw new Error("not used");
			},
			operations: createOperations(),
		});

		expect(
			handlers.resolveUploadMode({
				contentType: "video/mp4",
				fileSize: 30 * 1024 * 1024,
				routeSlug: "lesson-video",
			}),
		).toMatchObject({
			mode: "upload-target",
			protocol: "tus",
		});
	});

	it("uses route policy and S3-compatible storage when resolving upload mode", () => {
		const handlers = createFilesOrpcHandlers({
			async createUploadTarget() {
				throw new Error("not used");
			},
			operations: createOperations(),
			routes: [
				{
					config: normalizeFileRouteConfig({
						video: {
							maxFileSize: "2GB",
							protocols: ["auto", "s3-multipart", "s3-put", "tus", "xhr"],
							requiresResumable: true,
						},
					}),
					options: normalizeFileRouteOptions(),
					slug: "lesson-video",
				},
			],
			storageBackend: "minio-s3",
		});

		expect(
			handlers.resolveUploadMode({
				contentType: "video/mp4",
				fileSize: 8 * 1024 * 1024,
				routeSlug: "lesson-video",
			}),
		).toMatchObject({
			mode: "upload-target",
			protocol: "s3-multipart",
			reason: "s3-compatible-multipart",
			storageBackend: "minio-s3",
		});
	});

	it("rejects direct uploads when route policy requires resumable S3-compatible transfer", async () => {
		const handlers = createFilesOrpcHandlers({
			async createUploadTarget() {
				throw new Error("not used");
			},
			directUpload: vi.fn(),
			operations: createOperations(),
			routes: [
				{
					config: normalizeFileRouteConfig({
						video: {
							maxFileSize: "2GB",
							protocols: ["auto", "s3-multipart", "s3-put", "tus", "xhr"],
							requiresResumable: true,
						},
					}),
					options: normalizeFileRouteOptions(),
					slug: "lesson-video",
				},
			],
			storageBackend: "r2-s3",
		});

		await expect(
			handlers.directUpload(
				{
					file: createFile({ name: "lesson.mp4", size: 8 * 1024 * 1024, type: "video/mp4" }),
					routeSlug: "lesson-video",
					visibility: "private",
				},
				request,
			),
		).rejects.toThrow("s3-compatible-multipart");
	});

	it("uses direct download callbacks and empty event iterator fallbacks", async () => {
		const handlers = createFilesOrpcHandlers({
			async createUploadTarget() {
				throw new Error("not used");
			},
			async directDownload() {
				return {
					file: new Blob(["hello"], { type: "text/plain" }),
					record: await createOperations().files.createFile({
						bucketName: "local-public-files",
						contentType: "text/plain",
						fileName: "hello.txt",
						key: "hello.txt",
						kind: "document",
						size: 5,
						status: "ready",
						userId: "user_1",
						visibility: "public",
					}),
				};
			},
			operations: createOperations(),
		});

		const result = await handlers.directDownload({ id: "file_1" }, request);
		expect(await result?.file.text()).toBe("hello");

		const events: unknown[] = [];
		for await (const event of await handlers.watchUpload({ sessionId: "session_1" }, request)) {
			events.push(event);
		}
		expect(events).toEqual([]);
	});

	it("completes and aborts upload sessions through injected operations", async () => {
		const operations = createOperations();
		const file = await operations.files.createFile({
			bucketName: "local-private-files",
			contentType: "image/png",
			fileName: "avatar.png",
			key: "user_1/avatar.png",
			kind: "image",
			size: 1024,
			status: "draft",
			userId: "user_1",
			visibility: "private",
		});
		const session = await operations.sessions.createSession({
			expiresAt: new Date("2026-06-02T09:00:00.000Z"),
			fileId: file.id,
			id: "session_1",
			protocol: "xhr",
			status: "active",
			userId: "user_1",
		});
		operations.files.getFile = vi.fn(async () => file);
		operations.files.updateFileStatus = vi.fn(async (_id, status) => ({
			...file,
			status,
		}));
		operations.sessions.getSession = vi.fn(async () => session);
		operations.sessions.updateSessionStatus = vi.fn(async (_id, status) => ({
			...session,
			status,
		}));
		const handlers = createFilesOrpcHandlers({
			async createUploadTarget() {
				throw new Error("not used");
			},
			operations,
		});

		await expect(
			handlers.completeUpload({ fileId: file.id, sessionId: session.id }, request),
		).resolves.toMatchObject({
			status: "ready",
		});
		await expect(handlers.abortUpload({ sessionId: session.id }, request)).resolves.toMatchObject({
			status: "aborted",
		});
	});

	it("uses signed access callbacks and injected event iterators", async () => {
		const eventBus = createFilesEventBus();
		const handlers = createFilesOrpcHandlers({
			async createUploadTarget() {
				throw new Error("not used");
			},
			async issueSignedAccess(input) {
				return {
					expiresAt: new Date("2026-06-02T09:00:00.000Z"),
					token: `signed:${input.id}`,
					url: `https://app.test/api/files/signed/${input.id}`,
				};
			},
			operations: createOperations(),
			watchUpload: (input) => eventBus.watchUpload(input),
		});
		const iterator = (await handlers.watchUpload({ sessionId: "session_1" }, request))[
			Symbol.asyncIterator
		]();
		const nextEvent = iterator.next();

		eventBus.publishUpload({
			id: "event_1",
			payload: {
				status: "completed",
			},
			sessionId: "session_1",
			type: "upload",
		});

		await expect(handlers.issueSignedAccess({ id: "file_1" }, request)).resolves.toMatchObject({
			token: "signed:file_1",
		});
		await expect(nextEvent).resolves.toMatchObject({
			done: false,
			value: {
				payload: {
					status: "completed",
				},
			},
		});

		await iterator.return?.();
	});
});
