import type { DbInstance } from "@de100/apps-lms-db";
import { createFilesEventBus } from "@de100/files-server/events";
import type { FilesAuthContext, FilesRequestContext } from "@de100/files-server/operations";
import type {
	FilesDirectDownloadInput,
	FilesDirectDownloadOutput,
	FilesDirectUploadInput,
} from "@de100/files-server/orpc";
import { createFilesOrpcHandlers } from "@de100/files-server/orpc";
import {
	defaultDirectOrpcUploadMaxBytes,
	inferFileKindFromContentType,
	selectFilesUploadMode,
} from "@de100/files-shared";

import type { Context } from "./context";
import { processLmsUploadedFile } from "./files-processing";
import { createLmsFilesRepositories } from "./files-repositories";
import { createSignedFilesAccessUrl, issueSignedFilesAccessToken } from "./files-signed-access";
import {
	createFilesAccessUrl,
	createFilesStorageKey,
	getFilesStorageProvider,
} from "./files-storage";

export const lmsDirectOrpcUploadMaxBytes = defaultDirectOrpcUploadMaxBytes;
const lmsFilesEventBus = createFilesEventBus();

export type CreateLmsFilesOrpcHandlersOptions = {
	context: Context & { db: DbInstance };
};

export function createLmsFilesOrpcHandlers(options: CreateLmsFilesOrpcHandlersOptions) {
	const repositories = createLmsFilesRepositories(options.context.db);

	return createFilesOrpcHandlers<{ db: DbInstance }>({
		async completeUpload(_input, filesContext, file) {
			const processed = await processLmsUploadedFile({
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
			const selectedMode = selectFilesUploadMode({
				contentType: input.contentType,
				fileSize: input.fileSize,
				kind,
				maxDirectUploadBytes: lmsDirectOrpcUploadMaxBytes,
				requiresResumable: input.protocol === "tus" || input.protocol === "s3-multipart",
				routeProtocols: [input.protocol],
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

			lmsFilesEventBus.publishUpload({
				id: crypto.randomUUID(),
				payload: {
					fileId: fileRecord.id,
					protocol,
					status: "active",
				},
				sessionId,
				type: "upload",
			});

			return {
				expiresAt,
				fields: {
					fileId: fileRecord.id,
					key,
				},
				headers: input.contentType ? { "content-type": input.contentType } : null,
				method: protocol === "s3-put" ? "PUT" : "POST",
				protocol,
				sessionId,
				targetId,
				uploadUrl: createFilesUploadUrl(filesContext.request, protocol, sessionId),
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
		maxDirectUploadBytes: lmsDirectOrpcUploadMaxBytes,
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
		watchProcessing: (input) => lmsFilesEventBus.watchProcessing(input),
		watchUpload: (input) => lmsFilesEventBus.watchUpload(input),
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

	const repositories = createLmsFilesRepositories(filesContext.app.db);
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
	const processed = await processLmsUploadedFile({
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
	lmsFilesEventBus.publishUpload({
		id: crypto.randomUUID(),
		payload: {
			fileId,
			protocol: "orpc-direct",
			status: "ready",
		},
		sessionId: fileId,
		type: "upload",
	});
	lmsFilesEventBus.publishProcessing({
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
	const repositories = createLmsFilesRepositories(filesContext.app.db);
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

function createFilesUploadUrl(request: Request, protocol: string, sessionId: string) {
	return new URL(`/api/files/upload/${protocol}/${sessionId}`, request.url).toString();
}
