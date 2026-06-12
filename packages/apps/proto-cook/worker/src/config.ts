import { normalizeFilesWorkerConcurrency } from "@de100/files-server/worker";

export const protoCookFilesWorkerQueueDriverPreferenceValues = ["auto", "db", "redis"] as const;
export type ProtoCookFilesWorkerQueueDriverPreference =
	(typeof protoCookFilesWorkerQueueDriverPreferenceValues)[number];

export const protoCookFilesWorkerQueueDriverValues = ["db", "redis"] as const;
export type ProtoCookFilesWorkerQueueDriver =
	(typeof protoCookFilesWorkerQueueDriverValues)[number];

export type ProtoCookFilesWorkerConfigInput = {
	concurrency?: number;
	pollIntervalMs?: number;
	queueDriver?: ProtoCookFilesWorkerQueueDriverPreference;
	redisKeyPrefix?: string;
	redisUrl?: string | null;
	staleAfterMs?: number;
};

export type ProtoCookFilesWorkerConfig = {
	concurrency: number;
	pollIntervalMs: number;
	queueDriver: ProtoCookFilesWorkerQueueDriver;
	redisKeyPrefix: string;
	redisUrl: string | null;
	staleAfterMs: number;
};

export function resolveProtoCookFilesWorkerConfig(
	input: ProtoCookFilesWorkerConfigInput = {},
): ProtoCookFilesWorkerConfig {
	const queueDriver = resolveProtoCookFilesWorkerQueueDriver({
		preference: input.queueDriver ?? "auto",
		redisUrl: input.redisUrl ?? null,
	});

	return {
		concurrency: normalizeFilesWorkerConcurrency(input.concurrency),
		pollIntervalMs: normalizePositiveInteger(input.pollIntervalMs ?? 5_000, "pollIntervalMs"),
		queueDriver,
		redisKeyPrefix: normalizeRedisKeyPrefix(input.redisKeyPrefix ?? "de100:proto-cook:files"),
		redisUrl: input.redisUrl?.trim() || null,
		staleAfterMs: normalizePositiveInteger(input.staleAfterMs ?? 5 * 60_000, "staleAfterMs"),
	};
}

export function resolveProtoCookFilesWorkerQueueDriver(input: {
	preference: ProtoCookFilesWorkerQueueDriverPreference;
	redisUrl?: string | null;
}): ProtoCookFilesWorkerQueueDriver {
	if (input.preference === "db") {
		return "db";
	}

	const redisUrl = input.redisUrl?.trim();
	if (input.preference === "redis") {
		if (!redisUrl) {
			throw new Error("Redis files worker queue requires REDIS_URL or an injected Redis client.");
		}

		return "redis";
	}

	return redisUrl ? "redis" : "db";
}

function normalizePositiveInteger(value: number, label: string): number {
	if (!Number.isInteger(value) || value <= 0) {
		throw new Error(`${label} must be a positive integer.`);
	}

	return value;
}

function normalizeRedisKeyPrefix(value: string): string {
	const trimmed = value.trim().replace(/:+$/u, "");
	if (!trimmed) {
		throw new Error("redisKeyPrefix cannot be empty.");
	}

	return trimmed;
}
