import type { FilesQueueAdapter, FilesWorkerJobPayload } from "@de100/files-server/worker";

export type LmsFilesRedisQueueClient = {
	hset(key: string, field: string, value: string): Promise<unknown>;
	lpush(key: string, value: string): Promise<unknown>;
	rpop(key: string): Promise<string | null>;
	zadd(key: string, score: number, value: string): Promise<unknown>;
	zrangebyscore(
		key: string,
		min: number | string,
		max: number | string,
		limitKeyword: "LIMIT",
		offset: number | string,
		count: number | string,
	): Promise<string[]>;
	zrem(key: string, ...members: string[]): Promise<unknown>;
};

export type LmsFilesRedisQueueAdapterOptions = {
	client: LmsFilesRedisQueueClient;
	keyPrefix?: string;
	now?: () => Date;
	promoteLimit?: number;
};

export function createLmsFilesRedisQueueAdapter(
	options: LmsFilesRedisQueueAdapterOptions,
): FilesQueueAdapter {
	const keyPrefix = normalizeKeyPrefix(options.keyPrefix ?? "de100:lms:files");
	const now = options.now ?? (() => new Date());
	const promoteLimit = options.promoteLimit ?? 25;

	return {
		async ack(jobId) {
			await options.client.hset(
				`${keyPrefix}:completed`,
				jobId,
				JSON.stringify({ completedAt: now() }),
			);
		},
		async enqueue(job, enqueueOptions = {}) {
			const serialized = serializeWorkerJob(job);
			const runAfter = enqueueOptions.runAfter;
			if (runAfter && runAfter.getTime() > now().getTime()) {
				await options.client.zadd(`${keyPrefix}:delayed`, runAfter.getTime(), serialized);
				return;
			}

			await options.client.lpush(`${keyPrefix}:ready`, serialized);
		},
		async fail(jobId, error) {
			await options.client.hset(
				`${keyPrefix}:failed`,
				jobId,
				JSON.stringify({ error, failedAt: now() }),
			);
		},
		async next() {
			await promoteDueJobs({
				client: options.client,
				keyPrefix,
				limit: promoteLimit,
				now: now(),
			});

			const serialized = await options.client.rpop(`${keyPrefix}:ready`);
			return serialized ? parseWorkerJob(serialized) : null;
		},
	};
}

async function promoteDueJobs(input: {
	client: LmsFilesRedisQueueClient;
	keyPrefix: string;
	limit: number;
	now: Date;
}) {
	const delayedKey = `${input.keyPrefix}:delayed`;
	const dueJobs = await input.client.zrangebyscore(
		delayedKey,
		"-inf",
		input.now.getTime(),
		"LIMIT",
		0,
		input.limit,
	);
	if (dueJobs.length === 0) {
		return;
	}

	await input.client.zrem(delayedKey, ...dueJobs);
	await Promise.all(dueJobs.map((job) => input.client.lpush(`${input.keyPrefix}:ready`, job)));
}

function serializeWorkerJob(job: FilesWorkerJobPayload): string {
	return JSON.stringify(job);
}

function parseWorkerJob(value: string): FilesWorkerJobPayload {
	const parsed = JSON.parse(value) as Partial<FilesWorkerJobPayload>;
	if (
		typeof parsed.fileId !== "string" ||
		typeof parsed.kind !== "string" ||
		typeof parsed.processingJobId !== "string"
	) {
		throw new Error("Invalid files worker job payload in Redis queue.");
	}

	return {
		fileId: parsed.fileId,
		kind: parsed.kind as FilesWorkerJobPayload["kind"],
		metadata:
			typeof parsed.metadata === "object" && parsed.metadata !== null ? parsed.metadata : null,
		processingJobId: parsed.processingJobId,
	};
}

function normalizeKeyPrefix(value: string): string {
	const normalized = value.trim().replace(/:+$/u, "");
	if (!normalized) {
		throw new Error("Redis files queue key prefix cannot be empty.");
	}

	return normalized;
}
