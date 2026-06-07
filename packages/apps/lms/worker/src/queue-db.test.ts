import type { FilesProcessingJobRecord } from "@de100/files-server/operations";
import { describe, expect, it } from "vitest";

import type { LmsFilesWorkerJobQueueStore } from "./queue-db";
import {
	createLmsFilesDbPollingQueueAdapter,
	createWorkerPayloadFromProcessingJob,
} from "./queue-db";

const now = new Date("2026-06-07T10:00:00.000Z");

describe("LMS DB-polling files queue", () => {
	it("enqueues, claims due jobs, and marks completion", async () => {
		const store = createInMemoryQueueStore();
		const queue = createLmsFilesDbPollingQueueAdapter(store, { now: () => now });

		await queue.enqueue(createPayload("job_1"), {
			runAfter: new Date(now.getTime() + 60_000),
		});
		await queue.enqueue(createPayload("job_2"), { runAfter: now });

		expect(await queue.next()).toMatchObject({
			fileId: "file_2",
			kind: "image-processing",
			processingJobId: "job_2",
		});
		expect(await queue.next()).toBeNull();

		await queue.ack("job_2");
		expect(store.jobs.get("job_2")?.status).toBe("succeeded");
	});

	it("normalizes unknown processing job kinds to custom worker jobs", () => {
		expect(
			createWorkerPayloadFromProcessingJob(createJobRecord({ kind: "upload-complete" })),
		).toMatchObject({
			kind: "custom",
		});
	});

	it("marks failed jobs with serialized errors", async () => {
		const store = createInMemoryQueueStore();
		const queue = createLmsFilesDbPollingQueueAdapter(store, { now: () => now });
		await queue.enqueue(createPayload("job_1"));

		await queue.fail("job_1", { message: "boom" });

		expect(store.jobs.get("job_1")).toMatchObject({
			error: { message: "boom" },
			status: "failed",
		});
	});
});

function createPayload(id: string) {
	return {
		fileId: id.replace("job", "file"),
		kind: "image-processing" as const,
		metadata: { source: "test" },
		processingJobId: id,
	};
}

function createJobRecord(input: Partial<FilesProcessingJobRecord> = {}): FilesProcessingJobRecord {
	return {
		attempts: 0,
		createdAt: now,
		error: null,
		fileId: "file_1",
		id: "job_1",
		input: null,
		kind: "image-processing",
		output: null,
		runAfter: null,
		status: "queued",
		updatedAt: now,
		...input,
	};
}

function createInMemoryQueueStore(): LmsFilesWorkerJobQueueStore & {
	jobs: Map<string, FilesProcessingJobRecord>;
} {
	const jobs = new Map<string, FilesProcessingJobRecord>();

	return {
		jobs,
		async claimNextDueJob(claimedAt) {
			const dueJobs = [...jobs.values()]
				.filter(
					(job) =>
						job.status === "queued" &&
						(job.runAfter === null || job.runAfter.getTime() <= claimedAt.getTime()),
				)
				.sort((a, b) => {
					const aRunAfter = a.runAfter?.getTime() ?? Number.NEGATIVE_INFINITY;
					const bRunAfter = b.runAfter?.getTime() ?? Number.NEGATIVE_INFINITY;
					return aRunAfter - bRunAfter || a.createdAt.getTime() - b.createdAt.getTime();
				});
			const nextJob = dueJobs[0];
			if (!nextJob) {
				return null;
			}

			const claimed = {
				...nextJob,
				status: "running" as const,
				updatedAt: claimedAt,
			};
			jobs.set(claimed.id, claimed);
			return claimed;
		},
		async createOrUpdateQueuedJob(job, options) {
			const record = createJobRecord({
				fileId: job.fileId,
				id: job.processingJobId,
				input: job.metadata ?? null,
				kind: job.kind,
				runAfter: options.runAfter ?? null,
				status: "queued",
			});
			jobs.set(record.id, record);
			return record;
		},
		async markJobFailed(id, error) {
			const job = jobs.get(id);
			if (job) {
				jobs.set(id, { ...job, error, status: "failed" });
			}
		},
		async markJobSucceeded(id) {
			const job = jobs.get(id);
			if (job) {
				jobs.set(id, { ...job, status: "succeeded" });
			}
		},
	};
}
