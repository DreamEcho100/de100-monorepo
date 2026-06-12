import type { DbInstance } from "@de100/apps-proto-cook-db";
import { createFilesEventBus } from "@de100/files-server/events";
import type { FilesAuthContext, FilesRequestContext } from "@de100/files-server/operations";
import type {
	FilesDirectDownloadInput,
	FilesDirectDownloadOutput,
	FilesDirectUploadInput,
	FilesUploadModeInput,
} from "@de100/files-server/orpc";
import { createFilesOrpcHandlers } from "@de100/files-server/orpc";
import type {
	FilesStorageBackend,
	FilesUploadModeDecision,
	FilesUploadProtocolPreference,
	FilesUploadTargetProtocol,
} from "@de100/files-shared";
import {
	defaultDirectOrpcUploadMaxBytes,
	inferFileKindFromContentType,
	selectFileRouteRule,
	selectFilesUploadMode,
} from "@de100/files-shared";

import type { Context } from "./context";
import { processProtoCookUploadedFile } from "./files-processing";
import { createProtoCookFilesRepositories } from "./files-repositories";
import { protoCookFilesRouteConfig } from "./files-routes";
import { createSignedFilesAccessUrl, issueSignedFilesAccessToken } from "./files-signed-access";
import {
	createFilesAccessUrl,
	createFilesStorageKey,
	createFilesStorageUploadTarget,
	getFilesStorageBackend,
	getFilesStorageProvider,
} from "./files-storage";

export const protoCookDirectOrpcUploadMaxBytes = defaultDirectOrpcUploadMaxBytes;
const protoCookFilesEventBus = createFilesEventBus();

export type CreateProtoCookFilesOrpcHandlersOptions = {
	context: Context & { db: DbInstance };
};

export function createProtoCookFilesOrpcHandlers(options: CreateProtoCookFilesOrpcHandlersOptions) {
	const repositories = createProtoCookFilesRepositories(options.context.db);
	const initialRequest = (options.context.request ??
		new Request("http://localhost/api/files")) as unknown as Request;
	const storageBackend = getFilesStorageBackend(initialRequest);

	return createFilesOrpcHandlers<{ db: DbInstance }>({
		async completeUpload(_input, filesContext, file) {
			const processed = await processProtoCookUploadedFile({
				file,
				filesContext,
				repositories,
			});

			return processed.record
				? {
						...processed.record,
						accessUrl: createFilesAccessUrl(
							filesContext.request,
							processed.record.visibility,
							processed.record.key,
						),
					}
				: null;
		},
		async createUploadTarget(input, filesContext) {
			const auth = filesContext.auth;
			const storageProvider = getFilesStorageProvider(filesContext.request);
			const visibility = input.visibility ?? "private";
			const kind = inferFileKindFromContentType(input.contentType);
			const key = createFilesStorageKey({
				fileName: input.fileName,
				userId: requireFilesUserId(auth),
				visibility,
			});
			const fileRecord = await repositories.files.createFile({
				bucketName: storageProvider.getBucketName(visibility),
				contentType: input.contentType,
				fileName: input.fileName,
				key,
				kind,
				metadata: input.metadata ?? null,
				size: input.fileSize,
				status: "draft",
				userId: auth.userId,
				visibility,
			});
			const targetId = crypto.randomUUID();
			const sessionId = crypto.randomUUID();
			const selectedMode = resolveProtoCookFilesUploadMode({
				contentType: input.contentType,
				fileSize: input.fileSize,
				kind,
				maxDirectUploadBytes: protoCookDirectOrpcUploadMaxBytes,
				requestedProtocol: input.protocol,
				routeSlug: input.routeSlug,
				storageBackend,
			});
			const protocol =
				input.protocol === "auto"
					? selectedMode.protocol === "orpc-direct"
						? "xhr"
						: selectedMode.protocol
					: input.protocol;
			const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

			await repositories.sessions.createSession({
				expiresAt,
				fileId: fileRecord.id,
				id: sessionId,
				protocol,
				status: "active",
				userId: auth.userId,
			});

			protoCookFilesEventBus.publishUpload({
				id: crypto.randomUUID(),
				payload: {
					fileId: fileRecord.id,
					protocol,
					status: "active",
				},
				sessionId,
				type: "upload",
			});

			const target = await createFilesStorageUploadTarget(filesContext.request, {
				contentType: input.contentType,
				expiresInSeconds: 60 * 60,
				fields: {
					fileId: fileRecord.id,
					key,
				},
				key,
				protocol,
				sessionId,
				targetId,
				visibility,
			});

			if (!target) {
				throw new Error(
					`Files upload protocol ${protocol} is not available for ${storageBackend} storage.`,
				);
			}

			return {
				...target,
				expiresAt,
				fields: {
					...(target.fields ?? {}),
					fileId: fileRecord.id,
					key,
				},
			};
		},
		async directDownload(input, filesContext) {
			return directDownloadFile(input, filesContext);
		},
		async directUpload(input, filesContext) {
			return directUploadFile(input, filesContext);
		},
		async issueSignedAccess(input, filesContext) {
			const record = await repositories.files.getFile(input.id, filesContext.auth);
			if (!record || record.status !== "ready") {
				return null;
			}

			const signedAccess = await issueSignedFilesAccessToken({
				expiresInSeconds: input.expiresInSeconds,
				fileId: record.id,
				userId: filesContext.auth.userId,
			});

			return {
				expiresAt: signedAccess.expiresAt,
				token: signedAccess.token,
				url: createSignedFilesAccessUrl(filesContext.request, signedAccess.token),
			};
		},
		maxDirectUploadBytes: protoCookDirectOrpcUploadMaxBytes,
		operations: {
			createContext: async (request) => ({
				app: {
					db: options.context.db,
				},
				auth: createFilesAuthContext(options.context),
				request,
			}),
			...repositories,
		},
		routes: protoCookFilesRouteConfig,
		storageBackend,
		watchProcessing: (input) => protoCookFilesEventBus.watchProcessing(input),
		watchUpload: (input) => protoCookFilesEventBus.watchUpload(input),
	});
}

export function resolveProtoCookFilesUploadMode(
	input: FilesUploadModeInput & {
		maxDirectUploadBytes?: number;
		requestedProtocol?: FilesUploadProtocolPreference;
		storageBackend?: FilesStorageBackend;
	},
): FilesUploadModeDecision {
	const kind = input.kind ?? inferFileKindFromContentType(input.contentType);
	const route = protoCookFilesRouteConfig.find((candidate) => candidate.slug === input.routeSlug);
	const routeRule = route
		? selectFileRouteRule(route.config, {
				contentType: input.contentType,
				kind,
			})
		: null;
	const forcedProtocol = normalizeRequestedProtocol(input.requestedProtocol);

	return selectFilesUploadMode({
		contentType: input.contentType,
		fileSize: input.fileSize,
		forcedProtocol,
		kind,
		maxDirectUploadBytes: input.maxDirectUploadBytes ?? protoCookDirectOrpcUploadMaxBytes,
		requiresResumable:
			input.requiresResumable ??
			routeRule?.requiresResumable ??
			isResumableTargetProtocol(forcedProtocol),
		routeProtocols: forcedProtocol ? [forcedProtocol] : routeRule?.protocols,
		storageBackend: input.storageBackend,
	});
}

async function directUploadFile(
	input: FilesDirectUploadInput,
	filesContext: FilesRequestContext<{ db: DbInstance }>,
) {
	const storageProvider = getFilesStorageProvider(filesContext.request);
	const visibility = input.visibility ?? "private";
	const contentType = input.file.type || "application/octet-stream";
	const userId = requireFilesUserId(filesContext.auth);
	const key = createFilesStorageKey({
		fileName: input.file.name,
		userId,
		visibility,
	});
	const uploadBody = new Blob([await input.file.arrayBuffer()], { type: contentType });

	await storageProvider.putObject({
		httpMetadata: {
			cacheControl:
				visibility === "public"
					? "public, max-age=31536000, immutable"
					: "private, no-store, max-age=0",
			contentDisposition: `inline; filename="${input.file.name.replace(/"/g, "")}"`,
			contentType,
		},
		key,
		value: uploadBody,
		visibility,
	});

	const repositories = createProtoCookFilesRepositories(filesContext.app.db);
	const record = await repositories.files.createFile({
		bucketName: storageProvider.getBucketName(visibility),
		contentType,
		fileName: input.file.name,
		key,
		kind: input.kind ?? inferFileKindFromContentType(contentType),
		metadata: input.metadata ?? null,
		size: input.file.size,
		status: "stored",
		userId,
		visibility,
	});
	const processed = await processProtoCookUploadedFile({
		file: record,
		filesContext,
		repositories,
	});
	const processedRecord = processed.record ?? record;

	publishDirectUploadEvents(processedRecord.id);

	return {
		...processedRecord,
		accessUrl: createFilesAccessUrl(
			filesContext.request,
			processedRecord.visibility,
			processedRecord.key,
		),
	};
}

function publishDirectUploadEvents(fileId: string) {
	protoCookFilesEventBus.publishUpload({
		id: crypto.randomUUID(),
		payload: {
			fileId,
			protocol: "orpc-direct",
			status: "ready",
		},
		sessionId: fileId,
		type: "upload",
	});
	protoCookFilesEventBus.publishProcessing({
		id: crypto.randomUUID(),
		fileId,
		payload: {
			fileId,
			status: "ready",
		},
		type: "processing",
	});
}

async function directDownloadFile(
	input: FilesDirectDownloadInput,
	filesContext: FilesRequestContext<{ db: DbInstance }>,
): Promise<FilesDirectDownloadOutput | null> {
	const repositories = createProtoCookFilesRepositories(filesContext.app.db);
	const record = await repositories.files.getFile(input.id, filesContext.auth);
	if (!record) {
		return null;
	}

	const storageProvider = getFilesStorageProvider(filesContext.request);
	const object = await storageProvider.getObject({
		key: record.key,
		visibility: record.visibility,
	});

	if (!object?.body) {
		return null;
	}

	return {
		file: await new Response(object.body).blob(),
		record,
	};
}

function createFilesAuthContext(context: Context): FilesAuthContext {
	return {
		userId: context.session?.user?.id ?? null,
	};
}

function requireFilesUserId(auth: FilesAuthContext) {
	if (!auth.userId) {
		throw new Error("Authenticated files user is required.");
	}

	return auth.userId;
}

function normalizeRequestedProtocol(
	protocol: FilesUploadProtocolPreference | undefined,
): FilesUploadTargetProtocol | undefined {
	return protocol && protocol !== "auto" ? protocol : undefined;
}

function isResumableTargetProtocol(protocol: FilesUploadTargetProtocol | undefined) {
	return protocol === "tus" || protocol === "s3-multipart";
}
