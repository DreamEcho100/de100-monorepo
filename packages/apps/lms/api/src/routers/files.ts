import type { FilesDirectDownloadFile } from "@de100/files-server/orpc";
import {
	createUploadTargetInputSchema,
	createUploadTargetOutputSchema,
	fileKindSchema,
	fileRecordSchema,
	fileStatusSchema,
	filesUploadPlanSchema,
	filesUploadProtocolPreferenceSchema,
	filesUploadTargetProtocolSchema,
	fileVisibilitySchema,
	processingJobStatusSchema,
	uploadSessionStatusSchema,
} from "@de100/files-shared";
import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import type { Context } from "../context";
import { createLmsFilesOrpcHandlers } from "../files-orpc";
import { protectedProcedure, publicProcedure } from "../index";

type FilesUploadFile = {
	arrayBuffer: () => Promise<ArrayBuffer>;
	name: string;
	size: number;
	type: string;
};

const filesRouterBasePath = "/files";

const filesRecordIdInputSchema = z.object({
	id: z.string().min(1),
});

const filesFileIdInputSchema = z.object({
	fileId: z.string().min(1),
});

const filesSessionIdInputSchema = z.object({
	sessionId: z.string().min(1),
});

const filesCompleteUploadInputSchema = z.object({
	fileId: z.string().min(1),
	sessionId: z.string().min(1).optional(),
});

const filesSignedAccessInputSchema = z.object({
	expiresInSeconds: z.number().int().positive().optional(),
	id: z.string().min(1),
});

const filesDirectUploadInputSchema = z.object({
	file: z.custom<FilesUploadFile>((value) => isFilesUploadFile(value), {
		message: "Expected a File-like upload payload.",
	}),
	kind: fileKindSchema.optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
	requiresResumable: z.boolean().optional(),
	routeSlug: z.string().min(1),
	visibility: fileVisibilitySchema.default("private"),
});

const filesUploadModeInputSchema = z.object({
	contentType: z.string().min(1).optional(),
	fileSize: z.number().int().nonnegative(),
	kind: fileKindSchema.optional(),
	requiresResumable: z.boolean().optional(),
	routeSlug: z.string().min(1),
});

const filesUploadModeOutputSchema = filesUploadPlanSchema.extend({
	mode: z.enum(["orpc-direct", "upload-target"]),
	reason: z.enum([
		"direct-disabled",
		"direct-supported",
		"processing-integration-required",
		"resumable-required",
		"s3-compatible-multipart",
		"s3-compatible-single-part",
		"size-exceeds-direct-limit",
	]),
});

const filesDirectDownloadOutputSchema = z
	.object({
		file: z.custom<FilesDirectDownloadFile>((value) => isFilesDownloadFile(value)),
		record: fileRecordSchema,
	})
	.nullable();

const filesListOutputSchema = z.array(fileRecordSchema);
const filesSignedAccessOutputSchema = z
	.object({
		expiresAt: z.date(),
		token: z.string().min(1),
		url: z.string().min(1).nullable(),
	})
	.nullable();
const filesUploadSessionOutputSchema = z.object({
	createdAt: z.date(),
	expiresAt: z.date(),
	fileId: z.string().min(1),
	id: z.string().min(1),
	protocol: filesUploadTargetProtocolSchema,
	status: uploadSessionStatusSchema,
	updatedAt: z.date(),
	userId: z.string().min(1).nullable(),
});
const filesUploadPartOutputSchema = z.object({
	checksum: z.string().nullable(),
	createdAt: z.date(),
	etag: z.string().nullable(),
	fileId: z.string().min(1),
	id: z.string().min(1),
	partNumber: z.number().int().positive(),
	sessionId: z.string().min(1),
	size: z.number().int().nonnegative(),
	updatedAt: z.date(),
});
const filesVariantOutputSchema = z.object({
	bucketName: z.string().nullable(),
	contentType: z.string().min(1),
	createdAt: z.date(),
	deletedAt: z.date().nullable(),
	fileId: z.string().min(1),
	height: z.number().int().nonnegative().nullable(),
	id: z.string().min(1),
	key: z.string().min(1),
	kind: z.string().min(1),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	size: z.number().int().nonnegative(),
	status: fileStatusSchema,
	updatedAt: z.date(),
	width: z.number().int().nonnegative().nullable(),
});
const filesProcessingJobOutputSchema = z.object({
	createdAt: z.date(),
	fileId: z.string().min(1),
	id: z.string().min(1),
	kind: z.string().min(1),
	status: processingJobStatusSchema,
	updatedAt: z.date(),
});
const filesConfigOutputSchema = z.object({
	directUpload: z.object({
		enabled: z.boolean(),
		maxBytes: z.number().int().nonnegative(),
	}),
	routes: z.array(
		z.object({
			config: z.record(
				z.string(),
				z.object({
					access: fileVisibilitySchema,
					contentDisposition: z.enum(["attachment", "inline"]),
					maxFileCount: z.number().int().positive(),
					maxFileSizeBytes: z.number().int().nonnegative(),
					minFileCount: z.number().int().positive(),
					protocols: z.array(filesUploadProtocolPreferenceSchema),
				}),
			),
			options: z.object({
				awaitServerData: z.boolean(),
				presignedUrlTtlSeconds: z.number().int().positive(),
			}),
			slug: z.string().min(1),
		}),
	),
});

export const filesRouter = {
	abortUpload: protectedProcedure
		.input(filesSessionIdInputSchema)
		.output(filesUploadSessionOutputSchema.nullable())
		.route({
			method: "POST",
			path: `${filesRouterBasePath}/sessions/{sessionId}/abort`,
			summary: "Abort an active files upload session",
			tags: ["Files"],
		})
		.handler(async ({ context, input }) => {
			const request = requireFilesRequest(context);
			const handlers = createLmsFilesOrpcHandlers({
				context: context as Context & { db: typeof context.db },
			});

			return handlers.abortUpload(input, request);
		}),

	completeUpload: protectedProcedure
		.input(filesCompleteUploadInputSchema)
		.output(fileRecordSchema.nullable())
		.route({
			method: "POST",
			path: `${filesRouterBasePath}/{fileId}/complete`,
			summary: "Complete a files upload and mark the file ready",
			tags: ["Files"],
		})
		.handler(async ({ context, input }) => {
			const request = requireFilesRequest(context);
			const handlers = createLmsFilesOrpcHandlers({
				context: context as Context & { db: typeof context.db },
			});

			return handlers.completeUpload(input, request);
		}),

	config: publicProcedure
		.output(filesConfigOutputSchema)
		.route({
			method: "GET",
			path: `${filesRouterBasePath}/config`,
			summary: "Describe files oRPC capabilities and route configuration",
			tags: ["Files"],
		})
		.handler(async ({ context }) => {
			const request = requireFilesRequest(context);
			const handlers = createLmsFilesOrpcHandlers({
				context: context as Context & { db: typeof context.db },
			});

			return handlers.getConfig(request);
		}),

	createUploadTarget: protectedProcedure
		.input(createUploadTargetInputSchema)
		.output(createUploadTargetOutputSchema)
		.route({
			method: "POST",
			path: `${filesRouterBasePath}/targets`,
			summary: "Create a non-RPC upload target for a file",
			tags: ["Files"],
		})
		.handler(async ({ context, input }) => {
			const request = requireFilesRequest(context);
			const handlers = createLmsFilesOrpcHandlers({
				context: context as Context & { db: typeof context.db },
			});

			return handlers.createUploadTarget(input, request);
		}),

	delete: protectedProcedure
		.input(filesRecordIdInputSchema)
		.output(fileRecordSchema.nullable())
		.route({
			method: "DELETE",
			path: `${filesRouterBasePath}/{id}`,
			summary: "Delete a file owned by the signed-in user",
			tags: ["Files"],
		})
		.handler(async ({ context, input }) => {
			const request = requireFilesRequest(context);
			const handlers = createLmsFilesOrpcHandlers({
				context: context as Context & { db: typeof context.db },
			});

			return handlers.deleteFile(input, request);
		}),

	downloadDirect: publicProcedure
		.input(filesRecordIdInputSchema)
		.output(filesDirectDownloadOutputSchema)
		.route({
			method: "POST",
			path: `${filesRouterBasePath}/{id}/download-direct`,
			summary: "Download a file through oRPC when supported by the active link",
			tags: ["Files"],
		})
		.handler(async ({ context, input }) => {
			const request = requireFilesRequest(context);
			const handlers = createLmsFilesOrpcHandlers({
				context: context as Context & { db: typeof context.db },
			});

			return handlers.directDownload(input, request);
		}),

	get: publicProcedure
		.input(filesRecordIdInputSchema)
		.output(fileRecordSchema.nullable())
		.route({
			method: "GET",
			path: `${filesRouterBasePath}/{id}`,
			summary: "Get a readable file record",
			tags: ["Files"],
		})
		.handler(async ({ context, input }) => {
			const request = requireFilesRequest(context);
			const handlers = createLmsFilesOrpcHandlers({
				context: context as Context & { db: typeof context.db },
			});

			return handlers.getFile(input, request);
		}),

	getAll: publicProcedure
		.output(filesListOutputSchema)
		.route({
			method: "GET",
			path: filesRouterBasePath,
			summary: "List readable files",
			tags: ["Files"],
		})
		.handler(async ({ context }) => {
			const request = requireFilesRequest(context);
			const handlers = createLmsFilesOrpcHandlers({
				context: context as Context & { db: typeof context.db },
			});

			return handlers.listFiles(request);
		}),

	getProcessingJob: protectedProcedure
		.input(filesRecordIdInputSchema)
		.output(filesProcessingJobOutputSchema.nullable())
		.route({
			method: "GET",
			path: `${filesRouterBasePath}/jobs/{id}`,
			summary: "Get a files processing job visible to the signed-in user",
			tags: ["Files"],
		})
		.handler(async ({ context, input }) => {
			const request = requireFilesRequest(context);
			const handlers = createLmsFilesOrpcHandlers({
				context: context as Context & { db: typeof context.db },
			});

			return handlers.getProcessingJob(input, request);
		}),

	getUploadSession: protectedProcedure
		.input(filesSessionIdInputSchema)
		.output(filesUploadSessionOutputSchema.nullable())
		.route({
			method: "GET",
			path: `${filesRouterBasePath}/sessions/{sessionId}`,
			summary: "Get a files upload session owned by the signed-in user",
			tags: ["Files"],
		})
		.handler(async ({ context, input }) => {
			const request = requireFilesRequest(context);
			const handlers = createLmsFilesOrpcHandlers({
				context: context as Context & { db: typeof context.db },
			});

			return handlers.getUploadSession({ id: input.sessionId }, request);
		}),

	issueSignedAccess: protectedProcedure
		.input(filesSignedAccessInputSchema)
		.output(filesSignedAccessOutputSchema)
		.route({
			method: "POST",
			path: `${filesRouterBasePath}/{id}/signed-access`,
			summary: "Issue a short-lived signed access URL for a ready file",
			tags: ["Files"],
		})
		.handler(async ({ context, input }) => {
			const request = requireFilesRequest(context);
			const handlers = createLmsFilesOrpcHandlers({
				context: context as Context & { db: typeof context.db },
			});

			return handlers.issueSignedAccess(input, request);
		}),

	listUploadParts: protectedProcedure
		.input(filesSessionIdInputSchema)
		.output(z.array(filesUploadPartOutputSchema))
		.route({
			method: "GET",
			path: `${filesRouterBasePath}/sessions/{sessionId}/parts`,
			summary: "List uploaded parts for a files upload session",
			tags: ["Files"],
		})
		.handler(async ({ context, input }) => {
			const request = requireFilesRequest(context);
			const handlers = createLmsFilesOrpcHandlers({
				context: context as Context & { db: typeof context.db },
			});

			return handlers.listUploadParts(input, request);
		}),

	listVariants: publicProcedure
		.input(filesFileIdInputSchema)
		.output(z.array(filesVariantOutputSchema))
		.route({
			method: "GET",
			path: `${filesRouterBasePath}/{fileId}/variants`,
			summary: "List variants for a readable file",
			tags: ["Files"],
		})
		.handler(async ({ context, input }) => {
			const request = requireFilesRequest(context);
			const handlers = createLmsFilesOrpcHandlers({
				context: context as Context & { db: typeof context.db },
			});

			return handlers.listVariants(input, request);
		}),

	resolveUploadMode: publicProcedure
		.input(filesUploadModeInputSchema)
		.output(filesUploadModeOutputSchema)
		.route({
			method: "POST",
			path: `${filesRouterBasePath}/upload-mode`,
			summary: "Resolve whether a file should use direct oRPC or target-based upload",
			tags: ["Files"],
		})
		.handler(({ context, input }) => {
			requireFilesRequest(context);
			const handlers = createLmsFilesOrpcHandlers({
				context: context as Context & { db: typeof context.db },
			});

			return handlers.resolveUploadMode(input);
		}),

	uploadDirect: protectedProcedure
		.input(filesDirectUploadInputSchema)
		.output(fileRecordSchema)
		.route({
			method: "POST",
			path: `${filesRouterBasePath}/upload-direct`,
			summary: "Upload a file directly through oRPC when direct transfer policy allows it",
			tags: ["Files"],
		})
		.handler(async ({ context, input }) => {
			const request = requireFilesRequest(context);
			const handlers = createLmsFilesOrpcHandlers({
				context: context as Context & { db: typeof context.db },
			});

			return handlers.directUpload(input, request);
		}),

	watchProcessing: protectedProcedure
		.input(filesFileIdInputSchema)
		.route({
			method: "GET",
			path: `${filesRouterBasePath}/{fileId}/processing-events`,
			summary: "Stream files processing events for a readable file",
			tags: ["Files"],
		})
		.handler(async ({ context, input }) => {
			const request = requireFilesRequest(context);
			const handlers = createLmsFilesOrpcHandlers({
				context: context as Context & { db: typeof context.db },
			});

			return handlers.watchProcessing(input, request);
		}),

	watchUpload: protectedProcedure
		.input(filesSessionIdInputSchema)
		.route({
			method: "GET",
			path: `${filesRouterBasePath}/sessions/{sessionId}/events`,
			summary: "Stream files upload-session events",
			tags: ["Files"],
		})
		.handler(async ({ context, input }) => {
			const request = requireFilesRequest(context);
			const handlers = createLmsFilesOrpcHandlers({
				context: context as Context & { db: typeof context.db },
			});

			return handlers.watchUpload(input, request);
		}),
};

function requireFilesRequest(context: Context) {
	if (!context.request) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Files procedures require a request context.",
		});
	}

	return context.request;
}

function isFilesUploadFile(value: unknown): value is FilesUploadFile {
	return (
		typeof value === "object" &&
		value !== null &&
		"arrayBuffer" in value &&
		"name" in value &&
		"size" in value &&
		"type" in value &&
		typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function" &&
		typeof (value as { name?: unknown }).name === "string" &&
		typeof (value as { size?: unknown }).size === "number" &&
		typeof (value as { type?: unknown }).type === "string"
	);
}

function isFilesDownloadFile(value: unknown): value is FilesDirectDownloadFile {
	return (
		typeof value === "object" &&
		value !== null &&
		"arrayBuffer" in value &&
		"size" in value &&
		"text" in value &&
		"type" in value &&
		typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function" &&
		typeof (value as { size?: unknown }).size === "number" &&
		typeof (value as { text?: unknown }).text === "function" &&
		typeof (value as { type?: unknown }).type === "string"
	);
}
