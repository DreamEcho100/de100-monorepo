import { afterEach, describe, expect, it, vi } from "vitest";

import { createCacheClient, getCacheClient } from "./client";

afterEach(() => {
	vi.useRealTimers();
});

describe("cache client", () => {
	it("creates an in-memory client with expiring entries", async () => {
		const start = new Date("2026-06-07T08:00:00.000Z");
		vi.useFakeTimers();
		vi.setSystemTime(start);
		const cacheClient = createCacheClient({
			driver: "memory",
			keyPrefix: "test-cache",
		});

		cacheClient.set("alpha", "value", 1);
		expect(await cacheClient.get("alpha")).toBe("value");

		vi.setSystemTime(new Date(start.getTime() + 1001));
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
		).toThrow("APP_PROTO_COOK_UPSTASH_REDIS_URL is required");
	});
});
