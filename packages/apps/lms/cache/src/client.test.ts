import { describe, expect, it } from "vitest";

import { createCacheClient, getCacheClient } from "./client";

describe("cache client", () => {
	it("creates an in-memory client with expiring entries", async () => {
		const cacheClient = createCacheClient({
			driver: "memory",
			keyPrefix: "test-cache",
		});

		cacheClient.set("alpha", "value", 0.001);
		expect(await cacheClient.get("alpha")).toBe("value");

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(await cacheClient.get("alpha")).toBeNull();
	});

	it("reuses the same registry entry for equivalent configs", () => {
		const first = getCacheClient({
			driver: "memory",
			keyPrefix: "registry",
		});
		const second = getCacheClient({
			driver: "memory",
			keyPrefix: "registry",
		});

		expect(second).toBe(first);
	});

	it("throws on missing provider config for remote drivers", () => {
		expect(() =>
			createCacheClient({
				driver: "redis",
			}),
		).toThrow("REDIS_URL is required");

		expect(() =>
			createCacheClient({
				driver: "upstash",
			}),
		).toThrow("APP_LMS_UPSTASH_REDIS_URL is required");
	});
});
