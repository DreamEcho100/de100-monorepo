import { afterEach, describe, expect, it, vi } from "vitest";

import type {
	UploaderCreateTargetInput,
	UploaderCreateTargetResult,
	UploaderProviderAdapter,
	UploaderRecordRef,
} from "./adapters";
import { resolveUploaderConfig } from "./contracts";
import type { CreateUploaderRuntimeOptions } from "./uppy-factory";
import { createUploaderRuntime } from "./uppy-factory";

function createProviderAdapterMocks() {
	const createUploadTarget = vi.fn<
		(input: UploaderCreateTargetInput) => Promise<UploaderCreateTargetResult>
	>(async () => ({
		method: "PUT",
		targetId: "target-1",
		uploadUrl: "https://upload.example.com/target-1",
	}));

	const confirmUpload = vi.fn<(input: { targetId: string }) => Promise<UploaderRecordRef>>(
		async ({ targetId }) => ({
			id: targetId,
			key: `records/${targetId}`,
			visibility: "private",
		}),
	);

	const providerAdapter: UploaderProviderAdapter = {
		confirmUpload,
		createUploadTarget,
		providerId: "test-provider",
	};

	return {
		confirmUpload,
		createUploadTarget,
		providerAdapter,
	};
}

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("createUploaderRuntime", () => {
	it("runs enhancement hooks before upload target creation", async () => {
		const { createUploadTarget, providerAdapter } = createProviderAdapterMocks();
		const beforeQueue = vi.fn(async () => true);
		const compressImage = vi.fn(async (file) => ({ ...file, size: file.size - 1 }));
		const createChecksum = vi.fn(async () => "sha256:example");
		const runVirusScan = vi.fn(async () => ({ safe: true as const }));

		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(null, { status: 200 })),
		);

		const runtime = await createUploaderRuntime({
			config: resolveUploaderConfig({
				enhancements: {
					beforeQueue,
					compressImage,
					createChecksum,
					runVirusScan,
				},
				providerAdapter,
			}),
			onEvent: () => {},
		});

		await runtime.addFiles(
			[
				new File(["binary"], "frame.png", {
					type: "image/png",
				}),
			],
			"private",
		);
		await runtime.uploadAll();

		expect(beforeQueue).toHaveBeenCalledTimes(1);
		expect(runVirusScan).toHaveBeenCalledTimes(1);
		expect(compressImage).toHaveBeenCalledTimes(1);
		expect(createChecksum).toHaveBeenCalledTimes(1);
		expect(createUploadTarget).toHaveBeenCalledTimes(1);

		const targetInput = createUploadTarget.mock.calls.at(0)?.[0];
		expect(targetInput?.metadata?.checksum).toBe("sha256:example");
		expect(targetInput?.metadata?.compressed).toBe(true);

		runtime.destroy();
	});

	it("restores persisted files and emits file-added events", async () => {
		const { providerAdapter } = createProviderAdapterMocks();
		const events: Array<
			CreateUploaderRuntimeOptions["onEvent"] extends (e: infer E) => void ? E : never
		> = [];
		const queueStore = {
			clear: async () => {},
			getAll: async () => [
				{
					addedAt: Date.now(),
					blob: new File(["persisted"], "queued.txt", {
						lastModified: 100,
						type: "text/plain",
					}),
					fileId: "persisted-1",
					fileName: "queued.txt",
					fileSize: 9,
					fileType: "text/plain",
					lastModified: 100,
					visibility: "private" as const,
				},
			],
			put: async () => {},
			remove: async () => {},
		};

		const runtime = await createUploaderRuntime({
			config: resolveUploaderConfig({
				persistence: {
					driver: "memory",
					enabled: true,
					maxAgeMs: 60_000,
					queueKey: "phase4-test",
				},
				providerAdapter,
			}),
			onEvent: (event) => {
				events.push(event);
			},
			queueStore,
		});

		const restored = runtime.listFiles();
		expect(restored).toHaveLength(1);
		expect(restored[0]?.fileName).toBe("queued.txt");

		const restoredEvent = events.find((event) => event.type === "file-added");
		expect(restoredEvent).toBeDefined();
		expect(restoredEvent?.type).toBe("file-added");

		runtime.destroy();
	});
});
