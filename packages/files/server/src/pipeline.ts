import type {
	FileRecord,
	FilesGeneratedVariant,
	FilesPipelineRunResult,
	FilesPipelineRunStatus,
	FilesPipelineStageName,
	FilesProcessingStageStatus,
} from "@de100/files-shared";

import type {
	FilesOperations,
	FilesProcessingJobRecord,
	FilesRequestContext,
	FilesVariantRecord,
} from "./operations";

export type FilesPipelineCleanup = () => Promise<void> | void;

export type FilesPipelineInput<TAppContext = unknown> = {
	cleanup?: FilesPipelineCleanup;
	context: FilesRequestContext<TAppContext>;
	file: FileRecord;
	job?: FilesProcessingJobRecord;
	tempFilePath?: string;
};

export type FilesPipelineState = {
	attempt: number;
	metadata: Record<string, unknown>;
	tempFilePath?: string;
	variants: FilesGeneratedVariant[];
};

export type FilesPipelineStageInput<TAppContext = unknown> = FilesPipelineInput<TAppContext> & {
	state: Readonly<FilesPipelineState>;
};

export type FilesPipelineStageResult = {
	cleanup?: FilesPipelineCleanup | FilesPipelineCleanup[];
	metadata?: Record<string, unknown>;
	nextTempFilePath?: string;
	reason?: string;
	status?: Exclude<FilesProcessingStageStatus, "failed">;
	variants?: FilesPipelineGeneratedVariant[];
};

export type FilesPipelineGeneratedVariant = Omit<FilesGeneratedVariant, "status"> & {
	status?: FilesGeneratedVariant["status"];
};

export type FilesPipelineStageRunResult = {
	durationMs: number;
	error?: Record<string, unknown>;
	metadata?: Record<string, unknown>;
	name: FilesPipelineStageName;
	reason?: string;
	status: FilesProcessingStageStatus;
	variants?: FilesGeneratedVariant[];
};

export type FilesPipelineStage<TAppContext = unknown> = {
	name: FilesPipelineStageName;
	run(input: FilesPipelineStageInput<TAppContext>): Promise<FilesPipelineStageResult | undefined>;
};

export type FilesPipelineRetryPolicy = {
	maxAttempts?: number;
	shouldRetry?: (input: {
		attempt: number;
		error: unknown;
		stage: FilesPipelineStage;
	}) => boolean | Promise<boolean>;
};

export type FilesPipelineOptions = {
	retry?: FilesPipelineRetryPolicy;
};

export type FilesPipeline<TAppContext = unknown> = {
	run(input: FilesPipelineInput<TAppContext>): Promise<FilesPipelineRunResult>;
	stages: Array<FilesPipelineStage<TAppContext>>;
};

export type RunFilesProcessingJobInput<TAppContext = unknown> = {
	context: FilesRequestContext<TAppContext>;
	file: FileRecord;
	job?: FilesProcessingJobRecord;
	jobId?: string;
	jobInput?: Record<string, unknown> | null;
	kind: string;
	operations: FilesOperations<TAppContext>;
	pipeline: FilesPipeline<TAppContext>;
	tempFilePath?: string;
};

export type FilesProcessingJobRunResult = FilesPipelineRunResult & {
	job: FilesProcessingJobRecord;
	persistedVariants: FilesVariantRecord[];
};

export function createFilesPipeline<TAppContext = unknown>(
	stages: Array<FilesPipelineStage<TAppContext>>,
	options: FilesPipelineOptions = {},
): FilesPipeline<TAppContext> {
	return {
		async run(input) {
			const maxAttempts = normalizeMaxAttempts(options.retry?.maxAttempts);
			const stageResults: FilesPipelineStageRunResult[] = [];
			let attempts = 0;
			let lastFailure: Record<string, unknown> | undefined;
			let lastMetadata: Record<string, unknown> = {};
			let lastVariants: FilesGeneratedVariant[] = [];

			for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
				attempts = attempt;
				const attemptResult = await runFilesPipelineAttempt({
					attempt,
					input,
					stages,
				});
				stageResults.push(...attemptResult.stageResults);

				if (attemptResult.status === "succeeded") {
					return {
						attempts: attempt,
						metadata: attemptResult.metadata,
						stageResults,
						status: "succeeded",
						variants: attemptResult.variants,
					};
				}

				lastFailure = attemptResult.error;
				lastMetadata = attemptResult.metadata;
				lastVariants = attemptResult.variants;
				const canRetry =
					attempt < maxAttempts &&
					attemptResult.failedStage !== undefined &&
					(await shouldRetryPipelineAttempt({
						attempt,
						error: attemptResult.rawError,
						retry: options.retry,
						stage: attemptResult.failedStage,
					}));

				if (!canRetry) {
					break;
				}
			}

			return {
				attempts,
				error: lastFailure,
				metadata: lastMetadata,
				stageResults,
				status: "failed",
				variants: lastVariants,
			};
		},
		stages: [...stages],
	};
}

export async function runFilesProcessingJob<TAppContext = unknown>(
	input: RunFilesProcessingJobInput<TAppContext>,
): Promise<FilesProcessingJobRunResult> {
	const job =
		input.job ??
		(await input.operations.jobs.createJob({
			fileId: input.file.id,
			id: input.jobId ?? crypto.randomUUID(),
			input: input.jobInput ?? null,
			kind: input.kind,
			status: "queued",
		}));

	await Promise.all([
		input.operations.files.updateFileStatus(input.file.id, "processing"),
		input.operations.jobs.updateJob(job.id, {
			attempts: job.attempts + 1,
			error: null,
			runAfter: null,
			status: "running",
		}),
	]);

	const result = await input.pipeline.run({
		context: input.context,
		file: input.file,
		job,
		tempFilePath: input.tempFilePath,
	});
	const attempts = job.attempts + result.attempts;

	if (result.status === "failed") {
		const failedJob = await input.operations.jobs.updateJob(job.id, {
			attempts,
			error: result.error ?? null,
			output: createPipelineJobOutput(result),
			status: "failed",
		});
		await input.operations.files.updateFileStatus(input.file.id, "failed");

		return {
			...result,
			job: failedJob ?? job,
			persistedVariants: [],
		};
	}

	const persistedVariants = await persistFilesPipelineVariants(input, result.variants);
	const succeededJob = await input.operations.jobs.updateJob(job.id, {
		attempts,
		error: null,
		output: createPipelineJobOutput(result),
		status: "succeeded",
	});
	await input.operations.files.updateFileStatus(input.file.id, "ready");

	return {
		...result,
		job: succeededJob ?? job,
		persistedVariants,
	};
}

export function serializeFilesProcessingError(error: unknown): Record<string, unknown> {
	if (error instanceof Error) {
		return {
			message: error.message,
			name: error.name,
			stack: error.stack,
		};
	}

	return {
		message: String(error),
		name: "UnknownProcessingError",
	};
}

async function runFilesPipelineAttempt<TAppContext>(input: {
	attempt: number;
	input: FilesPipelineInput<TAppContext>;
	stages: Array<FilesPipelineStage<TAppContext>>;
}): Promise<{
	error?: Record<string, unknown>;
	failedStage?: FilesPipelineStage<TAppContext>;
	metadata: Record<string, unknown>;
	rawError?: unknown;
	stageResults: FilesPipelineStageRunResult[];
	status: FilesPipelineRunStatus;
	variants: FilesGeneratedVariant[];
}> {
	const cleanupCallbacks = input.input.cleanup ? [input.input.cleanup] : [];
	const metadata: Record<string, unknown> = {};
	const stageResults: FilesPipelineStageRunResult[] = [];
	const variants: FilesGeneratedVariant[] = [];
	let tempFilePath = input.input.tempFilePath;

	for (const stage of input.stages) {
		const startedAt = performance.now();
		try {
			const stageResult = await stage.run({
				...input.input,
				state: {
					attempt: input.attempt,
					metadata,
					tempFilePath,
					variants,
				},
			});
			const durationMs = Math.max(0, performance.now() - startedAt);

			if (stageResult?.cleanup) {
				cleanupCallbacks.push(...normalizeCleanupCallbacks(stageResult.cleanup));
			}

			if (stageResult?.nextTempFilePath !== undefined) {
				tempFilePath = stageResult.nextTempFilePath;
			}

			if (stageResult?.metadata) {
				Object.assign(metadata, stageResult.metadata);
			}

			const stageVariants = stageResult?.variants?.map(normalizeFilesGeneratedVariant);
			if (stageVariants?.length) {
				variants.push(...stageVariants);
			}

			stageResults.push({
				durationMs,
				metadata: stageResult?.metadata,
				name: stage.name,
				reason: stageResult?.reason,
				status: stageResult?.status ?? "succeeded",
				variants: stageVariants,
			});
		} catch (error) {
			const serializedError = serializeFilesProcessingError(error);
			stageResults.push({
				durationMs: Math.max(0, performance.now() - startedAt),
				error: serializedError,
				name: stage.name,
				status: "failed",
			});
			await runFilesPipelineCleanup(cleanupCallbacks);

			return {
				error: serializedError,
				failedStage: stage,
				metadata,
				rawError: error,
				stageResults,
				status: "failed",
				variants,
			};
		}
	}

	await runFilesPipelineCleanup(cleanupCallbacks);

	return {
		metadata,
		stageResults,
		status: "succeeded",
		variants,
	};
}

async function shouldRetryPipelineAttempt(input: {
	attempt: number;
	error: unknown;
	retry?: FilesPipelineRetryPolicy;
	stage: FilesPipelineStage;
}) {
	return input.retry?.shouldRetry
		? input.retry.shouldRetry({
				attempt: input.attempt,
				error: input.error,
				stage: input.stage,
			})
		: true;
}

async function persistFilesPipelineVariants<TAppContext>(
	input: RunFilesProcessingJobInput<TAppContext>,
	variants: FilesGeneratedVariant[],
) {
	const persistedVariants: FilesVariantRecord[] = [];
	for (const variant of variants) {
		persistedVariants.push(
			await input.operations.variants.createVariant({
				bucketName: variant.bucketName ?? input.file.bucketName,
				contentType: variant.contentType,
				fileId: input.file.id,
				height: variant.height ?? null,
				id: variant.id ?? crypto.randomUUID(),
				key: variant.key,
				kind: variant.kind,
				metadata: variant.metadata ?? null,
				size: variant.size,
				status: variant.status ?? "ready",
				width: variant.width ?? null,
			}),
		);
	}

	return persistedVariants;
}

function createPipelineJobOutput(result: FilesPipelineRunResult): Record<string, unknown> {
	return {
		attempts: result.attempts,
		error: result.error,
		metadata: result.metadata,
		stageResults: result.stageResults,
		status: result.status,
		variants: result.variants,
	};
}

function normalizeFilesGeneratedVariant(
	variant: FilesPipelineGeneratedVariant,
): FilesGeneratedVariant {
	return {
		...variant,
		status: variant.status ?? "ready",
	};
}

function normalizeCleanupCallbacks(input: FilesPipelineCleanup | FilesPipelineCleanup[]) {
	return Array.isArray(input) ? input : [input];
}

async function runFilesPipelineCleanup(cleanupCallbacks: FilesPipelineCleanup[]) {
	for (const callback of [...cleanupCallbacks].reverse()) {
		await callback();
	}
}

function normalizeMaxAttempts(maxAttempts: number | undefined) {
	return Math.max(1, Math.trunc(maxAttempts ?? 1));
}
