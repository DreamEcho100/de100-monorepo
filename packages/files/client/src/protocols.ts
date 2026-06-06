import type { CreateUploadTargetOutput, FilesUploadTargetProtocol } from "@de100/files-shared";
import { FilesError, filesErrorCodes } from "@de100/files-shared";

import type { FilesUploadProgress } from "./client";

export type FilesProtocolExecutorInput = {
	file: File;
	onProgress?: (progress: FilesUploadProgress) => void;
	signal?: AbortSignal;
	target: CreateUploadTargetOutput;
};

export type FilesProtocolExecutorResult = {
	target: CreateUploadTargetOutput;
};

export type FilesProtocolExecutor = (
	input: FilesProtocolExecutorInput,
) => Promise<FilesProtocolExecutorResult>;

export type FilesProtocolExecutorMap = Partial<
	Record<FilesUploadTargetProtocol, FilesProtocolExecutor>
>;

export function createFilesDefaultProtocolExecutors(
	options: { fetch?: typeof fetch } = {},
): FilesProtocolExecutorMap {
	const fetchExecutor = createFilesFetchProtocolExecutor(options);

	return {
		custom: fetchExecutor,
		"s3-put": fetchExecutor,
		xhr: fetchExecutor,
	};
}

export function createFilesFetchProtocolExecutor(
	options: { fetch?: typeof fetch } = {},
): FilesProtocolExecutor {
	const fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis);

	return async (input) => {
		input.onProgress?.({
			file: input.file,
			loaded: 0,
			progress: 0,
			total: input.file.size,
		});

		const response = await fetchFn(input.target.uploadUrl, {
			body: createUploadBody(input.file, input.target),
			headers: input.target.headers ?? undefined,
			method: input.target.method,
			signal: input.signal,
		});

		if (!response.ok) {
			throw new FilesError(
				filesErrorCodes.uploadFailed,
				`Upload target failed with ${response.status}.`,
			);
		}

		input.onProgress?.({
			file: input.file,
			loaded: input.file.size,
			progress: 100,
			total: input.file.size,
		});

		return {
			target: input.target,
		};
	};
}

export function createMissingFilesProtocolExecutor(protocol: FilesUploadTargetProtocol) {
	return async () => {
		throw new FilesError(
			filesErrorCodes.missingDependency,
			`Files upload protocol ${protocol} requires an enabled protocol executor.`,
		);
	};
}

export function resolveFilesProtocolExecutor(
	protocol: FilesUploadTargetProtocol,
	executors: FilesProtocolExecutorMap,
): FilesProtocolExecutor {
	return executors[protocol] ?? createMissingFilesProtocolExecutor(protocol);
}

function createUploadBody(file: File, target: CreateUploadTargetOutput) {
	if (target.method === "PUT") {
		return file;
	}

	const formData = new FormData();
	for (const [key, value] of Object.entries(target.fields ?? {})) {
		formData.append(key, value);
	}
	formData.append("file", file, file.name);

	return formData;
}
