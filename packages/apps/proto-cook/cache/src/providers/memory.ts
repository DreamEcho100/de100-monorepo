import type { CacheClient } from "../types";

type MemoryCacheEntry = {
	expiresAt: number | null;
	value: string;
};

function getScopedKey(keyPrefix: string, key: string) {
	return `${keyPrefix}:${key}`;
}

export function createMemoryCacheClient(keyPrefix: string): CacheClient {
	const store = new Map<string, MemoryCacheEntry>();

	return {
		delete(key) {
			store.delete(getScopedKey(keyPrefix, key));
		},
		get(key) {
			const cacheEntry = store.get(getScopedKey(keyPrefix, key));

			if (!cacheEntry) {
				return null;
			}

			if (cacheEntry.expiresAt && cacheEntry.expiresAt <= Date.now()) {
				store.delete(getScopedKey(keyPrefix, key));
				return null;
			}

			return cacheEntry.value;
		},
		set(key, value, ttl) {
			store.set(getScopedKey(keyPrefix, key), {
				expiresAt: ttl ? Date.now() + ttl * 1000 : null,
				value,
			});
		},
	};
}
