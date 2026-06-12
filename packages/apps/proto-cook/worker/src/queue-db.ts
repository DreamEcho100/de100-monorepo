import type { DbInstance } from "@de100/apps-proto-cook-db";
import { fileProcessingJobs } from "@de100/apps-proto-cook-db/schema/files";
import type { FilesProcessingJobRecord } from "@de100/files-server/operations";
import type {
	FilesQueueAdapter,
	FilesWorkerJobKind,
	FilesWorkerJobPayload,
} from "@de100/files-server/worker";
import type { ProcessingJobStatus } from "@de100/files-shared";
import { and, asc, eq, isNull, lte, or } from "drizzle-orm";

export type ProtoCookFilesWorkerJobQueueStore = {
	claimNextDueJob(now: Date): Promise<FilesProcessingJobRecord | null>;
	createOrUpdateQueuedJob(
		job: FilesWorkerJobPayload,
		options: { runAfter?: Date | null },
	): Promise<FilesProcessingJobRecord>;
	markJobFailed(id: string, error: Record<string, unknown>): Promise<void>;
	markJobSucceeded(id: string): Promise<void>;
};

export function createProtoCookFilesDbPollingQueueAdapter(
	store: ProtoCookFilesWorkerJobQueueStore,
	input: { now?: () => Date } = {},
): FilesQueueAdapter {
	const now = input.now ?? (() => new Date());

	return {
		async ack(jobId) {
			await store.markJobSucceeded(jobId);
		},
		async enqueue(job, options = {}) {
			await store.createOrUpdateQueuedJob(job, {
				runAfter: options.runAfter ?? null,
			});
		},
		async fail(jobId, error) {
			await store.markJobFailed(jobId, error);
		},
		async next() {
			const job = await store.claimNextDueJob(now());
			return job ? createWorkerPayloadFromProcessingJob(job) : null;
		},
	};
}

export function createProtoCookFilesDrizzleJobQueueStore(
	db: DbInstance,
): ProtoCookFilesWorkerJobQueueStore {
	return {
		async claimNextDueJob(now) {
			const [job] = await db
				.select()
				.from(fileProcessingJobs)
				.where(
					and(
						eq(fileProcessingJobs.status, "queued"),
						or(isNull(fileProcessingJobs.runAfter), lte(fileProcessingJobs.runAfter, now)),
					),
				)
				.orderBy(asc(fileProcessingJobs.runAfter), asc(fileProcessingJobs.createdAt))
				.limit(1);

			if (!job) {
				return null;
			}

			const [claimed] = await db
				.update(fileProcessingJobs)
				.set({
					status: "running",
					updatedAt: now,
				})
				.where(and(eq(fileProcessingJobs.id, job.id), eq(fileProcessingJobs.status, "queued")))
				.returning();

			return claimed ? serializeProcessingJobRecord(claimed) : null;
		},
		async createOrUpdateQueuedJob(job, options) {
			const timestamp = new Date();
			const [existing] = await db
				.select()
				.from(fileProcessingJobs)
				.where(eq(fileProcessingJobs.id, job.processingJobId))
				.limit(1);

			if (existing) {
				const [updated] = await db
					.update(fileProcessingJobs)
					.set({
						input: job.metadata ?? null,
						runAfter: options.runAfter ?? null,
						status: "queued",
						updatedAt: timestamp,
					})
					.where(eq(fileProcessingJobs.id, job.processingJobId))
					.returning();

				if (!updated) {
					throw new Error(`Failed to update queued files job ${job.processingJobId}.`);
				}

				return serializeProcessingJobRecord(updated);
			}

			const [created] = await db
				.insert(fileProcessingJobs)
				.values({
					attempts: 0,
					createdAt: timestamp,
					error: null,
					fileId: job.fileId,
					id: job.processingJobId,
					input: job.metadata ?? null,
					kind: job.kind,
					output: null,
					runAfter: options.runAfter ?? null,
					status: "queued",
					updatedAt: timestamp,
				})
				.returning();

			if (!created) {
				throw new Error(`Failed to create queued files job ${job.processingJobId}.`);
			}

			return serializeProcessingJobRecord(created);
		},
		async markJobFailed(id, error) {
			await db
				.update(fileProcessingJobs)
				.set({
					error,
					status: "failed",
					updatedAt: new Date(),
				})
				.where(eq(fileProcessingJobs.id, id));
		},
		async markJobSucceeded(id) {
			await db
				.update(fileProcessingJobs)
				.set({
					status: "succeeded",
					updatedAt: new Date(),
				})
				.where(eq(fileProcessingJobs.id, id));
		},
	};
}

export function createWorkerPayloadFromProcessingJob(
	job: FilesProcessingJobRecord,
): FilesWorkerJobPayload {
	return {
		fileId: job.fileId,
		kind: toFilesWorkerJobKind(job.kind),
		metadata: job.input,
		processingJobId: job.id,
	};
}

function toFilesWorkerJobKind(kind: string): FilesWorkerJobKind {
	switch (kind) {
		case "image-processing":
		case "video-hls":
		case "video-hls-encryption":
		case "video-drm":
		case "audio-processing":
		case "document-processing":
		case "custom":
			return kind;
		default:
			return "custom";
	}
}

function serializeProcessingJobRecord(
	row: typeof fileProcessingJobs.$inferSelect,
): FilesProcessingJobRecord {
	return {
		attempts: row.attempts,
		createdAt: row.createdAt,
		error: row.error,
		fileId: row.fileId,
		id: row.id,
		input: row.input,
		kind: row.kind,
		output: row.output,
		runAfter: row.runAfter,
		status: row.status as ProcessingJobStatus,
		updatedAt: row.updatedAt,
	};
}
