import { processLmsUploadedFile } from "@de100/apps-lms-api/files-processing";
import type { LmsFilesRepositories } from "@de100/apps-lms-api/files-repositories";
import { createLmsFilesRepositories } from "@de100/apps-lms-api/files-repositories";
import type { DbInstance } from "@de100/apps-lms-db";
import type { FilesProcessingJobRecord } from "@de100/files-server/operations";
import type { FilesPipeline } from "@de100/files-server/pipeline";
import { serializeFilesProcessingError } from "@de100/files-server/pipeline";
import type { FilesQueueAdapter, FilesWorkerJobPayload } from "@de100/files-server/worker";

export type LmsFilesWorkerContext = {
	db: DbInstance;
	request?: LmsFilesProcessingContext["request"];
};

type LmsFilesProcessingContext = Parameters<typeof processLmsUploadedFile>[0]["filesContext"];

export type LmsFilesWorkerRunOnceInput = LmsFilesWorkerContext & {
	pipeline?: FilesPipeline<{ db: DbInstance }>;
	queue: FilesQueueAdapter;
	repositories?: LmsFilesRepositories;
};

export type LmsFilesWorkerRunOnceResult =
	| {
			status: "idle";
	  }
	| {
			fileId: string;
			job: FilesProcessingJobRecord;
			status: "succeeded";
	  }
	| {
			error: Record<string, unknown>;
			fileId?: string;
			jobId: string;
			status: "failed" | "missing-file" | "missing-job";
	  };

export type LmsFilesWorkerLoopInput = LmsFilesWorkerRunOnceInput & {
	maxIterations?: number;
	pollIntervalMs: number;
	signal?: AbortSignal;
};

export type LmsFilesWorkerLoopResult = {
	failed: number;
	idle: number;
	iterations: number;
	succeeded: number;
};

export async function runLmsFilesWorkerOnce(
	input: LmsFilesWorkerRunOnceInput,
): Promise<LmsFilesWorkerRunOnceResult> {
	const payload = await input.queue.next();
	if (!payload) {
		return { status: "idle" };
	}

	return runClaimedWorkerJob(input, payload);
}

export async function runLmsFilesWorkerLoop(
	input: LmsFilesWorkerLoopInput,
): Promise<LmsFilesWorkerLoopResult> {
	const result: LmsFilesWorkerLoopResult = {
		failed: 0,
		idle: 0,
		iterations: 0,
		succeeded: 0,
	};

	while (!input.signal?.aborted) {
		if (input.maxIterations !== undefined && result.iterations >= input.maxIterations) {
			break;
		}

		const iteration = await runLmsFilesWorkerOnce(input);
		result.iterations += 1;

		switch (iteration.status) {
			case "idle":
				result.idle += 1;
				await sleep(input.pollIntervalMs, input.signal);
				break;
			case "succeeded":
				result.succeeded += 1;
				break;
			case "failed":
			case "missing-file":
			case "missing-job":
				result.failed += 1;
				break;
			default: {
				const exhaustive: never = iteration;
				throw new Error(`Unsupported worker result: ${JSON.stringify(exhaustive)}`);
			}
		}
	}

	return result;
}

async function runClaimedWorkerJob(
	input: LmsFilesWorkerRunOnceInput,
	payload: FilesWorkerJobPayload,
): Promise<LmsFilesWorkerRunOnceResult> {
	const repositories = input.repositories ?? createLmsFilesRepositories(input.db);
	const request =
		input.request ??
		(new Request(
			"http://localhost/internal/files-worker",
		) as unknown as LmsFilesProcessingContext["request"]);
	const filesContext: LmsFilesProcessingContext = {
		app: {
			db: input.db,
		},
		auth: {
			role: "worker",
			userId: null,
		},
		request,
	};

	const job = await repositories.jobs.getJob(payload.processingJobId);
	if (!job) {
		const error = {
			message: `Files processing job ${payload.processingJobId} was not found.`,
			name: "FilesWorkerMissingJob",
		};
		await input.queue.fail(payload.processingJobId, error);
		return {
			error,
			jobId: payload.processingJobId,
			status: "missing-job",
		};
	}

	const file = await repositories.files.getFile(job.fileId, filesContext.auth);
	if (!file) {
		const error = {
			message: `File ${job.fileId} for processing job ${job.id} was not found.`,
			name: "FilesWorkerMissingFile",
		};
		await repositories.jobs.updateJob(job.id, {
			error,
			status: "failed",
		});
		await input.queue.fail(job.id, error);
		return {
			error,
			fileId: job.fileId,
			jobId: job.id,
			status: "missing-file",
		};
	}

	try {
		const processed = await processLmsUploadedFile({
			file,
			filesContext,
			job,
			kind: job.kind,
			pipeline: input.pipeline,
			repositories,
		});

		if (processed.result.status === "failed") {
			const error = processed.result.error ?? {
				message: `Files processing job ${job.id} failed without an error payload.`,
				name: "FilesWorkerProcessingFailed",
			};
			await input.queue.fail(job.id, error);
			return {
				error,
				fileId: file.id,
				jobId: job.id,
				status: "failed",
			};
		}

		await input.queue.ack(job.id);
		return {
			fileId: file.id,
			job: processed.result.job,
			status: "succeeded",
		};
	} catch (error) {
		const serializedError = serializeFilesProcessingError(error);
		await Promise.all([
			repositories.jobs.updateJob(job.id, {
				error: serializedError,
				status: "failed",
			}),
			repositories.files.updateFileStatus(file.id, "failed"),
			input.queue.fail(job.id, serializedError),
		]);

		return {
			error: serializedError,
			fileId: file.id,
			jobId: job.id,
			status: "failed",
		};
	}
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	if (ms <= 0 || signal?.aborted) {
		return;
	}

	await new Promise<void>((resolve) => {
		const timeout = setTimeout(resolve, ms);
		signal?.addEventListener(
			"abort",
			() => {
				clearTimeout(timeout);
				resolve();
			},
			{ once: true },
		);
	});
}
