import { resolveUploaderConfig } from "@de100/ui-domains-solidjs/uploader/contracts.ts";
import type { UploaderEvent } from "@de100/ui-domains-solidjs/uploader/events.ts";
import { describe, expect, it, vi } from "vitest";

import { createMediaUploaderRuntimeFactory } from "./media-uploader-runtime";

const baseConfig = resolveUploaderConfig({
	persistence: {
		enabled: false,
	},
});

describe("media uploader runtime", () => {
	it("queues files and uploads them through the app mutation bridge", async () => {
		const uploadFile = vi.fn().mockResolvedValue(undefined);
		const events: UploaderEvent[] = [];
		const runtime = await createMediaUploaderRuntimeFactory({
			uploadFile,
		})({
			config: baseConfig,
			onEvent: (event) => {
				events.push(event);
			},
		});

		const file = new File(["draft"], "course-outline.txt", {
			type: "text/plain",
		});
		const addResult = await runtime.addFiles([file], "private");
		expect(addResult[0]?.ok).toBe(true);

		const uploadResult = await runtime.uploadAll();
		expect(uploadResult[0]?.ok).toBe(true);
		expect(uploadFile).toHaveBeenCalledTimes(1);
		expect(events.map((event) => event.type)).toEqual(
			expect.arrayContaining([
				"file-added",
				"upload-started",
				"upload-progress",
				"upload-succeeded",
				"upload-complete",
			]),
		);
	});

	it("emits recoverable failures when upload throws", async () => {
		const uploadFile = vi.fn().mockRejectedValue(new Error("network down"));
		const events: UploaderEvent[] = [];
		const runtimeErrors: string[] = [];
		const runtime = await createMediaUploaderRuntimeFactory({
			uploadFile,
		})({
			config: baseConfig,
			onEvent: (event) => {
				events.push(event);
			},
			onRuntimeError: (message) => {
				runtimeErrors.push(message);
			},
		});

		const file = new File(["content"], "slides.pdf", {
			type: "application/pdf",
		});
		const addResult = await runtime.addFiles([file], "public");
		expect(addResult[0]?.ok).toBe(true);

		const queued = runtime.listFiles()[0];
		expect(queued).toBeDefined();
		const uploadResult = await runtime.uploadFile(queued?.fileId ?? "");
		expect(uploadResult.ok).toBe(false);
		expect(runtimeErrors).toEqual(["network down"]);
		expect(events.map((event) => event.type)).toContain("upload-failed");
	});

	it("rejects files that violate configured type restrictions", async () => {
		const uploadFile = vi.fn().mockResolvedValue(undefined);
		const runtime = await createMediaUploaderRuntimeFactory({
			uploadFile,
		})({
			config: resolveUploaderConfig({
				persistence: {
					enabled: false,
				},
				restrictions: {
					allowedFileKinds: ["image"],
					allowedMimeTypes: ["image/*"],
					maxFileBytes: 2_000_000,
					maxFiles: 2,
				},
			}),
			onEvent: () => {},
		});

		const addResult = await runtime.addFiles(
			[
				new File(["text"], "notes.txt", {
					type: "text/plain",
				}),
			],
			"private",
		);
		expect(addResult[0]?.ok).toBe(false);
		expect(addResult[0]?.error).toBeDefined();
	});
});
