import type {
	createUploadTargetInputSchema,
	createUploadTargetOutputSchema,
	FileKind,
	FileRecord,
	FilesStorageBackend,
	FilesUploadModeDecision,
	FileVisibility,
	fileRecordSchema,
	NormalizedFileRouteConfig,
	NormalizedFileRouteOptions,
} from "@de100/files-shared";
import {
	defaultDirectOrpcUploadMaxBytes,
	FilesError,
	filesErrorCodes,
	inferFileKindFromContentType,
	selectFileRouteRule,
	selectFilesUploadMode,
} from "@de100/files-shared";
import type { z } from "zod/v4";

import type {
	CreateFilesUploadTarget,
	FilesOperations,
	FilesProcessingJobRecord,
	FilesUploadPartRecord,
	FilesUploadSessionRecord,
	FilesVariantRecord,
} from "./operations";

export type FilesOrpcConfig = {
	directUpload: {
		enabled: boolean;
		maxBytes: number;
	};
	routes: Array<{
		config: NormalizedFileRouteConfig;
		options: NormalizedFileRouteOptions;
		slug: string;
	}>;
};

export type FilesDirectUploadFile = {
	arrayBuffer: () => Promise<ArrayBuffer>;
	name: string;
	size: number;
	type: string;
};

export type FilesDirectUploadInput = {
	file: FilesDirectUploadFile;
	kind?: FileKind;
	metadata?: Record<string, unknown>;
	requiresResumable?: boolean;
	routeSlug: string;
	visibility?: FileVisibility;
};

export type FilesDirectDownloadInput = {
	id: string;
};

export type FilesDirectDownloadFile = {
	arrayBuffer: () => Promise<ArrayBuffer>;
	size: number;
	text: () => Promise<string>;
	type: string;
};

export type FilesDirectDownloadOutput = {
	file: FilesDirectDownloadFile;
	record: FileRecord;
};

export type FilesUploadModeInput = {
	contentType?: string;
	fileSize: number;
	kind?: FileKind;
	requiresResumable?: boolean;
	routeSlug: string;
};

export type FilesCompleteUploadInput = {
	fileId: string;
	sessionId?: string;
};

export type FilesAbortUploadInput = {
	sessionId: string;
};

export type FilesSignedAccessInput = {
	expiresInSeconds?: number;
	id: string;
};

export type FilesSignedAccessOutput = {
	expiresAt: Date;
	token: string;
	url: string | null;
};

export type FilesEventIteratorEvent = {
	id: string;
	payload: Record<string, unknown>;
	type: "processing" | "upload";
};

export type FilesOrpcProcedureSchemas = {
	createUploadTargetInput: typeof createUploadTargetInputSchema;
	createUploadTargetOutput: typeof createUploadTargetOutputSchema;
	fileRecord: typeof fileRecordSchema;
};

export type FilesOrpcHandlers = {
	createUploadTarget(
		input: z.infer<typeof createUploadTargetInputSchema>,
		request: Request,
	): Promise<z.infer<typeof createUploadTargetOutputSchema>>;
	abortUpload(
		input: FilesAbortUploadInput,
		request: Request,
	): Promise<FilesUploadSessionRecord | null>;
	completeUpload(
		input: FilesCompleteUploadInput,
		request: Request,
	): Promise<z.infer<typeof fileRecordSchema> | null>;
	directDownload(
		input: FilesDirectDownloadInput,
		request: Request,
	): Promise<FilesDirectDownloadOutput | null>;
	directUpload(
		input: FilesDirectUploadInput,
		request: Request,
	): Promise<z.infer<typeof fileRecordSchema>>;
	deleteFile(
		input: { id: string },
		request: Request,
	): Promise<z.infer<typeof fileRecordSchema> | null>;
	getConfig(request: Request): Promise<FilesOrpcConfig>;
	getFile(
		input: { id: string },
		request: Request,
	): Promise<z.infer<typeof fileRecordSchema> | null>;
	getProcessingJob(
		input: { id: string },
		request: Request,
	): Promise<FilesProcessingJobRecord | null>;
	getUploadSession(
		input: { id: string },
		request: Request,
	): Promise<FilesUploadSessionRecord | null>;
	issueSignedAccess(
		input: FilesSignedAccessInput,
		request: Request,
	): Promise<FilesSignedAccessOutput | null>;
	listFiles(request: Request): Promise<Array<z.infer<typeof fileRecordSchema>>>;
	listUploadParts(input: { sessionId: string }, request: Request): Promise<FilesUploadPartRecord[]>;
	listVariants(input: { fileId: string }, request: Request): Promise<FilesVariantRecord[]>;
	resolveUploadMode(input: FilesUploadModeInput): FilesUploadModeDecision;
	watchProcessing(
		input: { fileId: string },
		request: Request,
	): Promise<AsyncIterable<FilesEventIteratorEvent>>;
	watchUpload(
		input: { sessionId: string },
		request: Request,
	): Promise<AsyncIterable<FilesEventIteratorEvent>>;
};

export type CreateFilesOrpcHandlersOptions<TAppContext = unknown> = {
	completeUpload?: (
		input: FilesCompleteUploadInput,
		context: Awaited<ReturnType<FilesOperations<TAppContext>["createContext"]>>,
		file: FileRecord,
	) => Promise<z.infer<typeof fileRecordSchema> | null>;
	createUploadTarget: CreateFilesUploadTarget;
	directDownload?: (
		input: FilesDirectDownloadInput,
		context: Awaited<ReturnType<FilesOperations<TAppContext>["createContext"]>>,
	) => Promise<FilesDirectDownloadOutput | null>;
	directUpload?: (
		input: FilesDirectUploadInput,
		context: Awaited<ReturnType<FilesOperations<TAppContext>["createContext"]>>,
	) => Promise<z.infer<typeof fileRecordSchema>>;
	issueSignedAccess?: (
		input: FilesSignedAccessInput,
		context: Awaited<ReturnType<FilesOperations<TAppContext>["createContext"]>>,
	) => Promise<FilesSignedAccessOutput | null>;
	maxDirectUploadBytes?: number;
	operations: FilesOperations<TAppContext>;
	routes?: FilesOrpcConfig["routes"];
	storageBackend?: FilesStorageBackend;
	watchProcessing?: (
		input: { fileId: string },
		context: Awaited<ReturnType<FilesOperations<TAppContext>["createContext"]>>,
	) => AsyncIterable<FilesEventIteratorEvent>;
	watchUpload?: (
		input: { sessionId: string },
		context: Awaited<ReturnType<FilesOperations<TAppContext>["createContext"]>>,
	) => AsyncIterable<FilesEventIteratorEvent>;
};

export function createFilesOrpcHandlers<TAppContext = unknown>(
	options: CreateFilesOrpcHandlersOptions<TAppContext>,
): FilesOrpcHandlers {
	const maxDirectUploadBytes = options.maxDirectUploadBytes ?? defaultDirectOrpcUploadMaxBytes;

	return {
		async abortUpload(input, request) {
			const context = await options.operations.createContext(request);
			const session = await options.operations.sessions.getSession(input.sessionId, context.auth);
			if (!session) {
				return null;
			}

			return options.operations.sessions.updateSessionStatus(input.sessionId, "aborted");
		},
		async completeUpload(input, request) {
			const context = await options.operations.createContext(request);
			const file = await options.operations.files.getFile(input.fileId, context.auth);
			if (!file) {
				return null;
			}

			if (input.sessionId) {
				const session = await options.operations.sessions.getSession(input.sessionId, context.auth);
				if (!session || session.fileId !== input.fileId) {
					return null;
				}

				await options.operations.sessions.updateSessionStatus(input.sessionId, "completed");
			}

			return (
				options.completeUpload?.(input, context, file) ??
				options.operations.files.updateFileStatus(input.fileId, "ready")
			);
		},
		async createUploadTarget(input, request) {
			const context = await options.operations.createContext(request);
			return options.createUploadTarget(input, context);
		},
		async directDownload(input, request) {
			if (!options.directDownload) {
				throw new FilesError(
					filesErrorCodes.adapterUnavailable,
					"Direct oRPC download is not configured.",
				);
			}

			const context = await options.operations.createContext(request);
			return options.directDownload(input, context);
		},
		async directUpload(input, request) {
			if (!options.directUpload) {
				throw new FilesError(
					filesErrorCodes.adapterUnavailable,
					"Direct oRPC upload is not configured.",
				);
			}

			const decision = resolveFilesUploadMode({
				contentType: input.file.type,
				fileSize: input.file.size,
				kind: input.kind ?? inferFileKindFromContentType(input.file.type),
				maxDirectUploadBytes: options.maxDirectUploadBytes,
				options,
				routeSlug: input.routeSlug,
				requiresResumable: input.requiresResumable,
			});

			if (decision.mode !== "orpc-direct") {
				throw new FilesError(
					filesErrorCodes.uploadFailed,
					`Direct oRPC upload is not available for this file: ${decision.reason}.`,
				);
			}

			const context = await options.operations.createContext(request);
			return options.directUpload(input, context);
		},
		async deleteFile(input, request) {
			const context = await options.operations.createContext(request);
			return options.operations.files.deleteFile(input.id, context.auth);
		},
		async getConfig() {
			return {
				directUpload: {
					enabled: Boolean(options.directUpload),
					maxBytes: maxDirectUploadBytes,
				},
				routes: options.routes ?? [],
			};
		},
		async getFile(input, request) {
			const context = await options.operations.createContext(request);
			return options.operations.files.getFile(input.id, context.auth);
		},
		async getProcessingJob(input, request) {
			const context = await options.operations.createContext(request);
			const job = await options.operations.jobs.getJob(input.id);
			if (!job) {
				return null;
			}

			const file = await options.operations.files.getFile(job.fileId, context.auth);
			return file ? job : null;
		},
		async getUploadSession(input, request) {
			const context = await options.operations.createContext(request);
			return options.operations.sessions.getSession(input.id, context.auth);
		},
		async issueSignedAccess(input, request) {
			if (!options.issueSignedAccess) {
				throw new FilesError(
					filesErrorCodes.adapterUnavailable,
					"Signed files access is not configured.",
				);
			}

			const context = await options.operations.createContext(request);
			return options.issueSignedAccess(input, context);
		},
		async listFiles(request) {
			const context = await options.operations.createContext(request);
			return options.operations.files.listFiles(context.auth);
		},
		async listUploadParts(input, request) {
			const context = await options.operations.createContext(request);
			const session = await options.operations.sessions.getSession(input.sessionId, context.auth);
			if (!session) {
				return [];
			}

			return options.operations.parts.listParts(input.sessionId);
		},
		async listVariants(input, request) {
			const context = await options.operations.createContext(request);
			const file = await options.operations.files.getFile(input.fileId, context.auth);
			if (!file) {
				return [];
			}

			return options.operations.variants.listVariants(input.fileId);
		},
		resolveUploadMode(input) {
			return resolveFilesUploadMode({
				contentType: input.contentType,
				fileSize: input.fileSize,
				kind: input.kind,
				maxDirectUploadBytes: options.maxDirectUploadBytes,
				options,
				routeSlug: input.routeSlug,
				requiresResumable: input.requiresResumable,
			});
		},
		async watchProcessing(input, request) {
			const context = await options.operations.createContext(request);
			return options.watchProcessing?.(input, context) ?? createEmptyFilesEventIterator();
		},
		async watchUpload(input, request) {
			const context = await options.operations.createContext(request);
			return options.watchUpload?.(input, context) ?? createEmptyFilesEventIterator();
		},
	};
}

function resolveFilesUploadMode<TAppContext>(
	input: FilesUploadModeInput & {
		maxDirectUploadBytes?: number;
		options: Pick<CreateFilesOrpcHandlersOptions<TAppContext>, "routes" | "storageBackend">;
	},
): FilesUploadModeDecision {
	const kind = input.kind ?? inferFileKindFromContentType(input.contentType);
	const route = input.options.routes?.find((candidate) => candidate.slug === input.routeSlug);
	const routeRule = route
		? selectFileRouteRule(route.config, {
				contentType: input.contentType,
				kind,
			})
		: null;

	return selectFilesUploadMode({
		contentType: input.contentType,
		fileSize: input.fileSize,
		kind,
		maxDirectUploadBytes: input.maxDirectUploadBytes,
		requiresResumable: input.requiresResumable ?? routeRule?.requiresResumable,
		routeProtocols: routeRule?.protocols,
		storageBackend: input.options.storageBackend,
	});
}

async function* createEmptyFilesEventIterator(): AsyncIterable<FilesEventIteratorEvent> {}
