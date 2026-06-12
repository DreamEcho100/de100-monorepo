import { describe, expect, it } from "vitest";

import {
	resolveProtoCookFilesWorkerConfig,
	resolveProtoCookFilesWorkerQueueDriver,
} from "./config";

describe("Proto Cook files worker config", () => {
	it("uses DB polling by default for local/offline development", () => {
		expect(resolveProtoCookFilesWorkerConfig()).toMatchObject({
			concurrency: 1,
			pollIntervalMs: 5_000,
			queueDriver: "db",
			redisKeyPrefix: "de100:proto-cook:files",
			redisUrl: null,
			staleAfterMs: 300_000,
		});
	});

	it("selects Redis for auto mode only when a Redis URL is configured", () => {
		expect(
			resolveProtoCookFilesWorkerQueueDriver({
				preference: "auto",
				redisUrl: "redis://localhost:6379",
			}),
		).toBe("redis");
		expect(
			resolveProtoCookFilesWorkerQueueDriver({
				preference: "auto",
				redisUrl: null,
			}),
		).toBe("db");
	});

	it("fails loudly when Redis is forced without Redis configuration", () => {
		expect(() =>
			resolveProtoCookFilesWorkerConfig({
				queueDriver: "redis",
			}),
		).toThrow("Redis files worker queue requires");
	});
});
