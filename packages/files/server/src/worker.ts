import type {
	FileRecord,
	FilesArtifactGroupRecord,
	ProcessingJobStatus,
} from "@de100/files-shared";

import type { FilesProcessingJobRecord, FilesRequestContext } from "./operations";

export type FilesWorkerJobKind =
	| "image-processing"
	| "video-hls"
	| "video-hls-encryption"
	| "video-drm"
	| "audio-processing"
	| "document-processing"
	| "custom";

export type FilesWorkerJobPayload = {
	fileId: string;
	kind: FilesWorkerJobKind;
	metadata?: Record<string, unknown> | null;
	processingJobId: string;
};

export type FilesQueueAdapter = {
	ack(jobId: string): Promise<void>;
	enqueue(job: FilesWorkerJobPayload, options?: FilesQueueEnqueueOptions): Promise<void>;
	fail(jobId: string, error: Record<string, unknown>): Promise<void>;
	next(): Promise<FilesWorkerJobPayload | null>;
};

export type FilesQueueEnqueueOptions = {
	runAfter?: Date | null;
};

export type FilesWorkerRunInput<TAppContext = unknown> = {
	context: FilesRequestContext<TAppContext>;
	file: FileRecord;
	job: FilesProcessingJobRecord;
};

export type FilesWorkerRunResult = {
	artifactGroups?: FilesArtifactGroupRecord[];
	jobStatus: ProcessingJobStatus;
	metadata?: Record<string, unknown>;
};

export function createFilesArtifactStagingPrefix(input: {
	attempt: number;
	fileId: string;
	groupId: string;
	jobId: string;
}) {
	return `files/${input.fileId}/staging/${input.jobId}/attempt-${input.attempt}/${input.groupId}`;
}

export function createFilesArtifactPromotedPrefix(input: {
	fileId: string;
	groupId: string;
	revision: number;
}) {
	return `files/${input.fileId}/artifacts/${input.groupId}/rev-${input.revision}`;
}

export function normalizeFilesWorkerConcurrency(value: number | undefined) {
	if (value === undefined) {
		return 1;
	}

	return Math.max(1, Math.trunc(value));
}
