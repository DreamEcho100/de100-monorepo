import type { FilesQueueAdapter, FilesWorkerJobPayload } from "./worker";

export type FilesWorkerRetryPolicy = {
	baseDelayMs?: number;
	maxDelayMs?: number;
};

export async function enqueueFilesWorkerJob(
	queue: FilesQueueAdapter,
	job: FilesWorkerJobPayload,
	options: { runAfter?: Date | null } = {},
) {
	await queue.enqueue(job, { runAfter: options.runAfter ?? null });
	return job;
}

export async function retryFilesWorkerJob(input: {
	attempt: number;
	error: Record<string, unknown>;
	job: FilesWorkerJobPayload;
	now?: Date;
	policy?: FilesWorkerRetryPolicy;
	queue: FilesQueueAdapter;
}) {
	await input.queue.fail(input.job.processingJobId, input.error);
	const runAfter = createFilesWorkerRetryRunAfter({
		attempt: input.attempt,
		now: input.now,
		policy: input.policy,
	});
	await input.queue.enqueue(input.job, { runAfter });
	return runAfter;
}

export function createFilesWorkerRetryRunAfter(input: {
	attempt: number;
	now?: Date;
	policy?: FilesWorkerRetryPolicy;
}) {
	const now = input.now ?? new Date();
	const baseDelayMs = input.policy?.baseDelayMs ?? 1_000;
	const maxDelayMs = input.policy?.maxDelayMs ?? 60_000;
	const delayMs = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, input.attempt - 1));
	return new Date(now.getTime() + delayMs);
}

export function shouldRecoverStaleFilesWorkerJob(input: {
	now?: Date;
	staleAfterMs: number;
	status: "queued" | "running" | "succeeded" | "failed" | "canceled";
	updatedAt: Date;
}) {
	if (input.status !== "running") {
		return false;
	}

	const now = input.now ?? new Date();
	return now.getTime() - input.updatedAt.getTime() >= input.staleAfterMs;
}
