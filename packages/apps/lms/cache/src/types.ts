export type CacheDriver = "memory" | "redis" | "upstash";

export type CacheClient = {
	delete: (key: string) => Promise<void> | void;
	get: (key: string) => Promise<string | null> | string | null;
	set: (key: string, value: string, ttl?: number) => Promise<void> | void;
};

export type CacheClientConfig = {
	driver: CacheDriver;
	keyPrefix?: string;
	redisUrl?: string;
	upstashRedisToken?: string;
	upstashRedisUrl?: string;
};

export const DEFAULT_APP_LMS_CACHE_DRIVER = "de100:lms";
