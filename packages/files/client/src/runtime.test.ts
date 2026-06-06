import type { FileRecord, FilesUploadModeDecision } from "@de100/files-shared";
import { describe, expect, it, vi } from "vitest";

import type { FilesClient } from "./client";
import { createFilesUploaderRuntime, createMemoryFilesUploaderQueueStore } from "./runtime";

const now = new Date("2026-06-02T08:00:00.000Z");

function createFileRecord(input: Partial<FileRecord> = {}): FileRecord {
	return {
		accessUrl: null,
		bucketName: "local-private-files",
		contentType: "image/png",
		createdAt: now,
		deletedAt: null,
		fileName: "avatar.png",
		id: "file_1",
		key: "user_1/avatar.png",
		kind: "image",
		metadata: null,
		size: 5,
		status: "ready",
		updatedAt: now,
		userId: "user_1",
		visibility: "private",
		...input,
	};
}

function createClient(overrides: Partial<FilesClient>): FilesClient {
	return {
		abortUpload: vi.fn(),
		completeUpload: vi.fn(),
		createUploadTarget: vi.fn(),
		downloadDirect: vi.fn(),
		getConfig: vi.fn(),
		issueSignedAccess: vi.fn(),
		resolveUploadMode: vi.fn(),
		route: (slug) => slug as never,
		uploadDirect: vi.fn(),
		uploadFile: vi.fn(),
		watchProcessing: vi.fn(),
		watchUpload: vi.fn(),
		...overrides,
	};
}

function createUploadDecision(
	input: Partial<FilesUploadModeDecision> = {},
): FilesUploadModeDecision {
	const protocol = input.protocol ?? "xhr";
	const mode = input.mode ?? (protocol === "orpc-direct" ? "orpc-direct" : "upload-target");

	return {
		approach: input.approach ?? "hybrid",
		deliveryStrategy:
			input.deliveryStrategy ?? (protocol === "orpc-direct" ? "orpc-blob" : "range-http"),
		integrations: input.integrations ?? [],
		mode,
		processingMode: input.processingMode ?? "none",
		protocol,
		reason: input.reason ?? (mode === "orpc-direct" ? "direct-supported" : "direct-disabled"),
		storageBackend: input.storageBackend ?? "local-fs",
	};
}

describe("createFilesUploaderRuntime", () => {
	it("uses direct oRPC upload for files allowed by policy", async () => {
		const uploadDirect = vi.fn(async () => createFileRecord());
		const client = createClient({
			resolveUploadMode: vi.fn(
				async (): Promise<FilesUploadModeDecision> =>
					createUploadDecision({
						protocol: "orpc-direct",
					}),
			),
			uploadDirect,
		});
		const runtime = createFilesUploaderRuntime({
			client,
			createId: () => "item_1",
		});

		runtime.addFiles([new File(["hello"], "avatar.png", { type: "image/png" })], {
			routeSlug: "avatar",
			visibility: "private",
		});

		await runtime.uploadAll();

		expect(uploadDirect).toHaveBeenCalledOnce();
		expect(runtime.items()[0]).toMatchObject({
			progress: 100,
			status: "completed",
		});
		expect(runtime.aggregateProgress()).toMatchObject({
			progress: 100,
		});
	});

	it("uses upload targets and protocol executors for large video flows", async () => {
		const tusExecutor = vi.fn(async (input) => {
			input.onProgress?.({
				file: input.file,
				loaded: 5,
				progress: 50,
				total: 10,
			});
			return {
				target: input.target,
			};
		});
		const createUploadTarget = vi.fn(async () => ({
			expiresAt: null,
			fields: {
				fileId: "file_video",
			},
			headers: null,
			method: "POST" as const,
			protocol: "tus" as const,
			sessionId: "session_1",
			targetId: "target_1",
			uploadUrl: "https://uploads.test/tus/session_1",
		}));
		const completeUpload = vi.fn(async () =>
			createFileRecord({
				contentType: "video/mp4",
				fileName: "lesson.mp4",
				id: "file_video",
				kind: "video",
				size: 10,
			}),
		);
		const client = createClient({
			completeUpload,
			createUploadTarget,
			resolveUploadMode: vi.fn(
				async (): Promise<FilesUploadModeDecision> =>
					createUploadDecision({
						protocol: "tus",
						reason: "size-exceeds-direct-limit",
					}),
			),
		});
		const runtime = createFilesUploaderRuntime({
			client,
			createId: () => "item_1",
			protocolExecutors: {
				tus: tusExecutor,
			},
		});

		runtime.addFiles([new File(["1234567890"], "lesson.mp4", { type: "video/mp4" })], {
			routeSlug: "lesson-video",
		});

		await runtime.uploadFile("item_1");

		expect(createUploadTarget).toHaveBeenCalledWith(
			expect.objectContaining({
				protocol: "tus",
			}),
		);
		expect(tusExecutor).toHaveBeenCalledOnce();
		expect(completeUpload).toHaveBeenCalledWith({
			fileId: "file_video",
			sessionId: "session_1",
		});
		expect(runtime.items()[0]).toMatchObject({
			progress: 100,
			status: "completed",
		});
	});

	it("persists queued items and restores file-backed queue records", async () => {
		const store = createMemoryFilesUploaderQueueStore();
		const runtime = createFilesUploaderRuntime({
			createId: () => "item_1",
			queueStore: store,
		});
		runtime.addFiles([new File(["hello"], "notes.txt", { type: "text/plain" })], {
			routeSlug: "notes",
		});
		const restoredRuntime = createFilesUploaderRuntime({
			queueStore: store,
		});

		await restoredRuntime.restore();

		expect(restoredRuntime.items()).toHaveLength(1);
		expect(restoredRuntime.items()[0]).toMatchObject({
			id: "item_1",
			status: "queued",
		});
	});

	it("cancels active target uploads and aborts the upload session", async () => {
		let rejectUpload: ((error: Error) => void) | null = null;
		const abortUpload = vi.fn();
		const runtime = createFilesUploaderRuntime({
			client: createClient({
				abortUpload,
				createUploadTarget: vi.fn(async () => ({
					expiresAt: null,
					fields: {
						fileId: "file_1",
					},
					headers: null,
					method: "POST" as const,
					protocol: "xhr" as const,
					sessionId: "session_1",
					targetId: "target_1",
					uploadUrl: "https://uploads.test/xhr/session_1",
				})),
				resolveUploadMode: vi.fn(
					async (): Promise<FilesUploadModeDecision> =>
						createUploadDecision({
							protocol: "xhr",
							reason: "direct-disabled",
						}),
				),
			}),
			createId: () => "item_1",
			protocolExecutors: {
				xhr: (input) =>
					new Promise((_resolve, reject) => {
						rejectUpload = reject;
						input.signal?.addEventListener("abort", () => {
							reject(new Error("aborted"));
						});
					}),
			},
		});
		runtime.addFiles([new File(["hello"], "avatar.png", { type: "image/png" })], {
			routeSlug: "avatar",
		});
		const upload = runtime.uploadFile("item_1");

		while (!rejectUpload) {
			await Promise.resolve();
		}
		await runtime.cancelFile("item_1");
		await upload;

		expect(abortUpload).toHaveBeenCalledWith({
			sessionId: "session_1",
		});
		expect(runtime.items()[0]).toMatchObject({
			status: "canceled",
		});
	});
});
