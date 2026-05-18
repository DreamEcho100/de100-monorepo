import { Redis } from "@upstash/redis";

import type { CacheClient } from "../types";

function getScopedKey(keyPrefix: string, key: string) {
	return `${keyPrefix}:${key}`;
}

export function createUpstashCacheClient(options: {
	keyPrefix: string;
	upstashRedisToken: string;
	upstashRedisUrl: string;
}): CacheClient {
	const redis = new Redis({
		token: options.upstashRedisToken,
		url: options.upstashRedisUrl,
	});

	return {
		async delete(key) {
			await redis.del(getScopedKey(options.keyPrefix, key));
		},
		async get(key) {
			return (await redis.get<string>(getScopedKey(options.keyPrefix, key))) ?? null;
		},
		async set(key, value, ttl) {
			const scopedKey = getScopedKey(options.keyPrefix, key);

			if (ttl && ttl > 0) {
				await redis.set(scopedKey, value, { ex: ttl });
				return;
			}

			await redis.set(scopedKey, value);
		},
	};
}
