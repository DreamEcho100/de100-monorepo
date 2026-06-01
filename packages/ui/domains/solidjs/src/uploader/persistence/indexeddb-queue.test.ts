import { describe, expect, it } from "vitest";

import { createUploaderQueueStore, fileToQueueRecord, queueRecordToFile } from "./indexeddb-queue";

describe("indexeddb-queue persistence", () => {
	it("stores and restores queue records with memory driver", async () => {
		const store = createUploaderQueueStore({
			driver: "memory",
			enabled: true,
			maxAgeMs: 60_000,
			queueKey: "test-memory-queue",
		});

		const file = new File(["hello"], "hello.txt", {
			lastModified: 123,
			type: "text/plain",
		});
		await store.put(fileToQueueRecord("file-1", file, "private"));

		const queued = await store.getAll();
		expect(queued).toHaveLength(1);
		expect(queued[0]?.fileName).toBe("hello.txt");
		expect(queued[0]?.visibility).toBe("private");

		const restored = queueRecordToFile(queued[0] as (typeof queued)[number]);
		expect(restored.name).toBe("hello.txt");
		expect(restored.type).toBe("text/plain");
		expect(restored.lastModified).toBe(123);

		await store.remove("file-1");
		expect(await store.getAll()).toHaveLength(0);
	});

	it("falls back to memory store when indexeddb is unavailable", async () => {
		const originalIndexedDb = globalThis.indexedDB;
		Reflect.deleteProperty(globalThis, "indexedDB");

		try {
			const store = createUploaderQueueStore({
				driver: "indexeddb",
				enabled: true,
				maxAgeMs: 60_000,
				queueKey: "missing-indexeddb",
			});

			const file = new File(["world"], "world.txt", {
				lastModified: 456,
				type: "text/plain",
			});
			await store.put(fileToQueueRecord("file-2", file, "public"));

			const queued = await store.getAll();
			expect(queued).toHaveLength(1);
			expect(queued[0]?.visibility).toBe("public");
		} finally {
			if (originalIndexedDb) {
				Object.defineProperty(globalThis, "indexedDB", {
					configurable: true,
					value: originalIndexedDb,
				});
			}
		}
	});
});
