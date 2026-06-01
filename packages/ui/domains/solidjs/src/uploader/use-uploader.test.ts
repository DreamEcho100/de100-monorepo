import { describe, expect, it } from "vitest";

import type { UploaderRecordVisibility } from "./adapters";
import type { CreateUploaderRuntimeOptions, UploaderRuntime } from "./uppy-factory";
import { createUploaderController } from "./use-uploader";

function createMockRuntimeFactory() {
	let eventSink: CreateUploaderRuntimeOptions["onEvent"] | undefined;
	const files = new Map<
		string,
		{ fileName: string; fileSize: number; fileType: string; visibility: UploaderRecordVisibility }
	>();
	const uploadAttempts = new Map<string, number>();
	let sequence = 0;

	const runtime: UploaderRuntime = {
		addFiles: async (newFiles, visibility) => {
			return newFiles.map((file) => {
				sequence += 1;
				const fileId = `file-${sequence}`;
				files.set(fileId, {
					fileName: file.name,
					fileSize: file.size,
					fileType: file.type,
					visibility,
				});
				uploadAttempts.set(fileId, 0);
				eventSink?.({
					fileId,
					fileName: file.name,
					mimeType: file.type,
					totalBytes: file.size,
					type: "file-added",
					visibility,
				});
				return { file, fileId, ok: true };
			});
		},
		cancelFile: async (fileId) => {
			eventSink?.({ fileId, type: "upload-canceled" });
			eventSink?.({ fileId, type: "upload-complete" });
		},
		destroy: () => {},
		listFiles: () =>
			[...files.entries()].map(([fileId, value]) => ({
				fileId,
				fileName: value.fileName,
				fileSize: value.fileSize,
				fileType: value.fileType,
				visibility: value.visibility,
			})),
		mountDashboard: async () => {},
		mountDropzone: async () => {},
		pauseFile: (fileId) => {
			eventSink?.({
				errorMessage: "Upload paused.",
				fileId,
				recoverable: true,
				type: "upload-failed",
			});
		},
		resumeFile: async (fileId) => {
			eventSink?.({ fileId, type: "retry-requested" });
		},
		retryFile: async (fileId) => {
			eventSink?.({ fileId, type: "retry-requested" });
			eventSink?.({ fileId, type: "upload-started" });
			eventSink?.({
				bytesUploaded: files.get(fileId)?.fileSize ?? 1,
				fileId,
				type: "upload-progress",
			});
			eventSink?.({ fileId, type: "upload-succeeded" });
			eventSink?.({ fileId, type: "upload-complete" });
			return { fileId, ok: true };
		},
		uploadAll: async () => {
			const results = [];
			for (const [fileId, file] of files.entries()) {
				const attempt = uploadAttempts.get(fileId) ?? 0;
				uploadAttempts.set(fileId, attempt + 1);
				eventSink?.({ fileId, type: "upload-started" });

				if (attempt === 0) {
					eventSink?.({
						errorMessage: "Temporary network issue",
						fileId,
						recoverable: true,
						type: "upload-failed",
					});
					eventSink?.({ fileId, type: "retry-requested" });
					eventSink?.({ fileId, type: "upload-started" });
				}

				eventSink?.({ bytesUploaded: file.fileSize, fileId, type: "upload-progress" });
				eventSink?.({ fileId, type: "upload-succeeded" });
				eventSink?.({ fileId, type: "upload-complete" });
				results.push({ fileId, ok: true });
			}
			return results;
		},
		uploadFile: async (fileId) => {
			eventSink?.({ fileId, type: "upload-started" });
			eventSink?.({
				bytesUploaded: files.get(fileId)?.fileSize ?? 1,
				fileId,
				type: "upload-progress",
			});
			eventSink?.({ fileId, type: "upload-succeeded" });
			eventSink?.({ fileId, type: "upload-complete" });
			return { fileId, ok: true };
		},
	};

	return {
		createRuntime: async (options: CreateUploaderRuntimeOptions) => {
			eventSink = options.onEvent;
			return runtime;
		},
	};
}

describe("createUploaderController", () => {
	it("tracks queue to upload success with retry transitions", async () => {
		const runtimeFactory = createMockRuntimeFactory();
		const controller = createUploaderController(
			{
				providerAdapter: {
					confirmUpload: async ({ targetId }) => ({
						id: targetId,
						key: `records/${targetId}`,
						visibility: "private",
					}),
					createUploadTarget: async () => ({
						method: "PUT",
						targetId: "target-id",
						uploadUrl: "https://example.com/upload",
					}),
					providerId: "mock-provider",
				},
			},
			{ createRuntime: runtimeFactory.createRuntime },
		);

		await controller.initialize();
		await controller.addFiles([
			new File(["hello"], "notes.txt", {
				type: "text/plain",
			}),
		]);

		let snapshot = controller.getSnapshot();
		expect(snapshot.items).toHaveLength(1);
		expect(snapshot.items[0]?.fileName).toBe("notes.txt");
		expect(snapshot.items[0]?.status).toBe("queued");

		await controller.uploadAll();
		snapshot = controller.getSnapshot();
		expect(snapshot.items[0]?.status).toBe("succeeded");
		expect(snapshot.lastError).toBeNull();
	});

	it("supports pause resume cancel and retry actions", async () => {
		const runtimeFactory = createMockRuntimeFactory();
		const controller = createUploaderController(
			{
				providerAdapter: {
					confirmUpload: async ({ targetId }) => ({
						id: targetId,
						key: `records/${targetId}`,
						visibility: "private",
					}),
					createUploadTarget: async () => ({
						method: "PUT",
						targetId: "target-id",
						uploadUrl: "https://example.com/upload",
					}),
					providerId: "mock-provider",
				},
			},
			{ createRuntime: runtimeFactory.createRuntime },
		);

		await controller.initialize();
		await controller.addFiles([
			new File(["binary"], "artifact.bin", {
				type: "application/octet-stream",
			}),
		]);

		const fileId = controller.getSnapshot().items[0]?.fileId;
		expect(fileId).toBeTruthy();

		await controller.pauseFile(fileId as string);
		expect(controller.getSnapshot().items[0]?.status).toBe("queued");
		expect(controller.getSnapshot().lastError).toBe("Upload paused.");

		await controller.resumeFile(fileId as string);
		await controller.retryFile(fileId as string);
		expect(controller.getSnapshot().items[0]?.status).toBe("succeeded");

		await controller.addFiles([
			new File(["cancel"], "cancel.txt", {
				type: "text/plain",
			}),
		]);

		const cancelFileId = controller
			.getSnapshot()
			.items.find((item) => item.fileName === "cancel.txt")?.fileId;
		expect(cancelFileId).toBeTruthy();

		await controller.cancelFile(cancelFileId as string);
		const canceledItem = controller
			.getSnapshot()
			.items.find((item) => item.fileId === (cancelFileId as string));
		expect(canceledItem?.status).toBe("canceled");

		controller.clearCompleted();
		expect(controller.getSnapshot().items).toHaveLength(0);
	});
});
