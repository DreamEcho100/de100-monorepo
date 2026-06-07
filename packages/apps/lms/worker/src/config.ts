import { normalizeFilesWorkerConcurrency } from "@de100/files-server/worker";

export const lmsFilesWorkerQueueDriverPreferenceValues = ["auto", "db", "redis"] as const;
export type LmsFilesWorkerQueueDriverPreference =
	(typeof lmsFilesWorkerQueueDriverPreferenceValues)[number];

export const lmsFilesWorkerQueueDriverValues = ["db", "redis"] as const;
export type LmsFilesWorkerQueueDriver = (typeof lmsFilesWorkerQueueDriverValues)[number];

export type LmsFilesWorkerConfigInput = {
	concurrency?: number;
	pollIntervalMs?: number;
	queueDriver?: LmsFilesWorkerQueueDriverPreference;
	redisKeyPrefix?: string;
	redisUrl?: string | null;
	staleAfterMs?: number;
};

export type LmsFilesWorkerConfig = {
	concurrency: number;
	pollIntervalMs: number;
	queueDriver: LmsFilesWorkerQueueDriver;
	redisKeyPrefix: string;
	redisUrl: string | null;
	staleAfterMs: number;
};

export function resolveLmsFilesWorkerConfig(
	input: LmsFilesWorkerConfigInput = {},
): LmsFilesWorkerConfig {
	const queueDriver = resolveLmsFilesWorkerQueueDriver({
		preference: input.queueDriver ?? "auto",
		redisUrl: input.redisUrl ?? null,
	});

	return {
		concurrency: normalizeFilesWorkerConcurrency(input.concurrency),
		pollIntervalMs: normalizePositiveInteger(input.pollIntervalMs ?? 5_000, "pollIntervalMs"),
		queueDriver,
		redisKeyPrefix: normalizeRedisKeyPrefix(input.redisKeyPrefix ?? "de100:lms:files"),
		redisUrl: input.redisUrl?.trim() || null,
		staleAfterMs: normalizePositiveInteger(input.staleAfterMs ?? 5 * 60_000, "staleAfterMs"),
	};
}

export function resolveLmsFilesWorkerQueueDriver(input: {
	preference: LmsFilesWorkerQueueDriverPreference;
	redisUrl?: string | null;
}): LmsFilesWorkerQueueDriver {
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
