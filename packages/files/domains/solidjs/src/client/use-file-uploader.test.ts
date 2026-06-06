import type { FilesClient } from "@de100/files-client";
import type { FileRecord, FilesUploadModeDecision } from "@de100/files-shared";
import { describe, expect, it, vi } from "vitest";

import { shouldOpenFilePickerFromKey } from "./file-uploader";
import { createFileUploaderController } from "./use-file-uploader";
import { fileMatchesAccept, validateFilesForUpload } from "./validation";

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
	const protocol = input.protocol ?? "orpc-direct";
	const mode = input.mode ?? (protocol === "orpc-direct" ? "orpc-direct" : "upload-target");

	return {
		approach: input.approach ?? "hybrid",
		deliveryStrategy:
			input.deliveryStrategy ?? (protocol === "orpc-direct" ? "orpc-blob" : "range-http"),
		integrations: input.integrations ?? [],
		mode,
		processingMode: input.processingMode ?? "none",
		protocol,
		reason: input.reason ?? "direct-supported",
		storageBackend: input.storageBackend ?? "local-fs",
	};
}

describe("createFileUploaderController", () => {
	it("queues and uploads files through the shared runtime", async () => {
		const uploadDirect = vi.fn(async () => createFileRecord());
		const controller = createFileUploaderController({
			client: createClient({
				resolveUploadMode: vi.fn(
					async (): Promise<FilesUploadModeDecision> =>
						createUploadDecision({
							protocol: "orpc-direct",
						}),
				),
				uploadDirect,
			}),
			createId: () => "file_1",
			routeSlug: "avatar",
		});

		const result = controller.addFiles([new File(["hello"], "hello.png", { type: "image/png" })]);
		expect(result.rejected).toHaveLength(0);
		expect(controller.items()).toHaveLength(1);

		await controller.uploadAll();

		expect(uploadDirect).toHaveBeenCalledOnce();
		expect(controller.items()[0]).toMatchObject({
			progress: 100,
			status: "completed",
		});
		expect(controller.aggregateProgress()).toMatchObject({
			progress: 100,
		});
	});

	it("keeps validation rejections available for the UI", () => {
		const controller = createFileUploaderController({
			client: createClient({}),
			routeSlug: "avatar",
			validationMessages: {
				invalidFileKind: "Images only.",
			},
			restrictions: {
				allowedFileKinds: ["image"],
			},
		});

		const result = controller.addFiles([new File(["text"], "notes.txt", { type: "text/plain" })]);

		expect(result.accepted).toHaveLength(0);
		expect(controller.rejections()).toMatchObject([
			{
				message: "Images only.",
				reason: "invalidFileKind",
			},
		]);
	});
});

describe("file uploader validation", () => {
	it("checks accept strings, max sizes, file counts, and file kinds", () => {
		expect(
			fileMatchesAccept(new File(["image"], "avatar.png", { type: "image/png" }), "image/*"),
		).toBe(true);
		expect(
			fileMatchesAccept(new File(["pdf"], "lesson.pdf", { type: "application/pdf" }), ".pdf"),
		).toBe(true);

		const result = validateFilesForUpload({
			currentFileCount: 0,
			files: [
				new File(["image"], "avatar.png", { type: "image/png" }),
				new File(["video"], "lesson.mp4", { type: "video/mp4" }),
			],
			restrictions: {
				allowedFileKinds: ["image"],
				maxFileBytes: 100,
				maxFiles: 1,
			},
		});

		expect(result.accepted).toHaveLength(1);
		expect(result.rejected).toMatchObject([
			{
				reason: "overFileCount",
			},
		]);
	});
});

describe("file uploader keyboard behavior", () => {
	it("opens the picker for activation keys only", () => {
		expect(shouldOpenFilePickerFromKey("Enter")).toBe(true);
		expect(shouldOpenFilePickerFromKey(" ")).toBe(true);
		expect(shouldOpenFilePickerFromKey("Escape")).toBe(false);
	});
});
