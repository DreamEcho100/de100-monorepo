import { createMemoryCacheClient } from "./providers/memory";
import { createRedisCacheClient } from "./providers/redis";
import { createUpstashCacheClient } from "./providers/upstash";
import type { CacheClient, CacheClientConfig } from "./types";
import { DEFAULT_APP_LMS_CACHE_DRIVER } from "./types";

type CacheRegistry = Map<string, CacheClient>;

type GlobalCacheState = typeof globalThis & {
	__de100AppsLmsCacheRegistry?: CacheRegistry;
};

function createCacheRegistryKey(config: CacheClientConfig) {
	return JSON.stringify({
		driver: config.driver,
		keyPrefix: config.keyPrefix ?? DEFAULT_APP_LMS_CACHE_DRIVER,
		redisUrl: config.redisUrl ?? null,
		upstashRedisToken: config.upstashRedisToken ? "configured" : null,
		upstashRedisUrl: config.upstashRedisUrl ?? null,
	});
}

function getCacheRegistry() {
	const globalCacheState = globalThis as GlobalCacheState;

	if (!globalCacheState.__de100AppsLmsCacheRegistry) {
		globalCacheState.__de100AppsLmsCacheRegistry = new Map<string, CacheClient>();
	}

	return globalCacheState.__de100AppsLmsCacheRegistry;
}

function requireRedisUrl(redisUrl: string | undefined) {
	if (!redisUrl) {
		throw new Error("REDIS_URL is required when APP_LMS_CACHE_DRIVER=redis.");
	}

	return redisUrl;
}

function requireUpstashConfig(config: CacheClientConfig) {
	if (!config.upstashRedisUrl) {
		throw new Error("UPSTASH_REDIS_URL is required when APP_LMS_CACHE_DRIVER=upstash.");
	}

	if (!config.upstashRedisToken) {
		throw new Error("UPSTASH_REDIS_TOKEN is required when APP_LMS_CACHE_DRIVER=upstash.");
	}

	return {
		upstashRedisToken: config.upstashRedisToken,
		upstashRedisUrl: config.upstashRedisUrl,
	};
}

export function createCacheClient(config: CacheClientConfig): CacheClient {
	const keyPrefix = config.keyPrefix ?? DEFAULT_APP_LMS_CACHE_DRIVER;

	if (config.driver === "memory") {
		return createMemoryCacheClient(keyPrefix);
	}

	if (config.driver === "redis") {
		return createRedisCacheClient({
			keyPrefix,
			redisUrl: requireRedisUrl(config.redisUrl),
		});
	}

	const upstashConfig = requireUpstashConfig(config);

	return createUpstashCacheClient({
		keyPrefix,
		upstashRedisToken: upstashConfig.upstashRedisToken,
		upstashRedisUrl: upstashConfig.upstashRedisUrl,
	});
}

export function getCacheClient(config: CacheClientConfig): CacheClient {
	const cacheRegistry = getCacheRegistry();
	const cacheRegistryKey = createCacheRegistryKey(config);
	const existingCacheClient = cacheRegistry.get(cacheRegistryKey);

	if (existingCacheClient) {
		return existingCacheClient;
	}

	const nextCacheClient = createCacheClient(config);
	cacheRegistry.set(cacheRegistryKey, nextCacheClient);

	return nextCacheClient;
}
