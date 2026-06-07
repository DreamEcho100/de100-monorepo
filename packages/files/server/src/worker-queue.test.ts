import { describe, expect, it } from "vitest";

import type { FilesQueueAdapter } from "./worker";
import {
	createFilesWorkerRetryRunAfter,
	enqueueFilesWorkerJob,
	retryFilesWorkerJob,
	shouldRecoverStaleFilesWorkerJob,
} from "./worker-queue";

describe("files worker queue helpers", () => {
	it("enqueues jobs with explicit runAfter values", async () => {
		const calls: unknown[] = [];
		const queue = createQueue(calls);
		const runAfter = new Date("2026-06-07T00:01:00Z");
		await enqueueFilesWorkerJob(queue, createJob(), { runAfter });

		expect(calls).toEqual([["enqueue", createJob(), runAfter]]);
	});

	it("computes capped exponential retry delays and re-enqueues failed jobs", async () => {
		const calls: unknown[] = [];
		const queue = createQueue(calls);
		const runAfter = await retryFilesWorkerJob({
			attempt: 4,
			error: { message: "ffmpeg failed" },
			job: createJob(),
			now: new Date("2026-06-07T00:00:00Z"),
			policy: { baseDelayMs: 1_000, maxDelayMs: 5_000 },
			queue,
		});

		expect(runAfter.toISOString()).toBe("2026-06-07T00:00:05.000Z");
		expect(calls.at(0)).toEqual(["fail", "job_1", { message: "ffmpeg failed" }]);
		expect(calls.at(1)).toEqual(["enqueue", createJob(), runAfter]);
	});

	it("recovers only stale running jobs", () => {
		expect(
			shouldRecoverStaleFilesWorkerJob({
				now: new Date("2026-06-07T00:10:00Z"),
				staleAfterMs: 60_000,
				status: "running",
				updatedAt: new Date("2026-06-07T00:08:00Z"),
			}),
		).toBe(true);
		expect(
			shouldRecoverStaleFilesWorkerJob({
				now: new Date("2026-06-07T00:10:00Z"),
				staleAfterMs: 60_000,
				status: "queued",
				updatedAt: new Date("2026-06-07T00:08:00Z"),
			}),
		).toBe(false);
	});

	it("creates deterministic retry timestamps", () => {
		expect(
			createFilesWorkerRetryRunAfter({
				attempt: 2,
				now: new Date("2026-06-07T00:00:00Z"),
				policy: { baseDelayMs: 500 },
			}).toISOString(),
		).toBe("2026-06-07T00:00:01.000Z");
	});
});

function createJob() {
	return {
		fileId: "file_1",
		kind: "video-hls",
		processingJobId: "job_1",
	} as const;
}

function createQueue(calls: unknown[]): FilesQueueAdapter {
	return {
		async ack(jobId) {
			calls.push(["ack", jobId]);
		},
		async enqueue(job, options) {
			calls.push(["enqueue", job, options?.runAfter ?? null]);
		},
		async fail(jobId, error) {
			calls.push(["fail", jobId, error]);
		},
		async next() {
			return null;
		},
	};
}
