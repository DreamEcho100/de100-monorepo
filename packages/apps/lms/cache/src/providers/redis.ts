import Redis from "ioredis";

import type { CacheClient } from "../types";

function getScopedKey(keyPrefix: string, key: string) {
	return `${keyPrefix}:${key}`;
}

export function createRedisCacheClient(options: {
	keyPrefix: string;
	redisUrl: string;
}): CacheClient {
	const redis = new Redis(options.redisUrl, {
		maxRetriesPerRequest: 1,
	});

	return {
		async delete(key) {
			await redis.del(getScopedKey(options.keyPrefix, key));
		},
		async get(key) {
			return await redis.get(getScopedKey(options.keyPrefix, key));
		},
		async set(key, value, ttl) {
			const scopedKey = getScopedKey(options.keyPrefix, key);

			if (ttl && ttl > 0) {
				await redis.set(scopedKey, value, "EX", ttl);
				return;
			}

			await redis.set(scopedKey, value);
		},
	};
}
