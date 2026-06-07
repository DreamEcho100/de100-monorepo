import { describe, expect, it } from "vitest";

import { resolveLmsFilesWorkerConfig, resolveLmsFilesWorkerQueueDriver } from "./config";

describe("LMS files worker config", () => {
	it("uses DB polling by default for local/offline development", () => {
		expect(resolveLmsFilesWorkerConfig()).toMatchObject({
			concurrency: 1,
			pollIntervalMs: 5_000,
			queueDriver: "db",
			redisKeyPrefix: "de100:lms:files",
			redisUrl: null,
			staleAfterMs: 300_000,
		});
	});

	it("selects Redis for auto mode only when a Redis URL is configured", () => {
		expect(
			resolveLmsFilesWorkerQueueDriver({
				preference: "auto",
				redisUrl: "redis://localhost:6379",
			}),
		).toBe("redis");
		expect(
			resolveLmsFilesWorkerQueueDriver({
				preference: "auto",
				redisUrl: null,
			}),
		).toBe("db");
	});

	it("fails loudly when Redis is forced without Redis configuration", () => {
		expect(() =>
			resolveLmsFilesWorkerConfig({
				queueDriver: "redis",
			}),
		).toThrow("Redis files worker queue requires");
	});
});
