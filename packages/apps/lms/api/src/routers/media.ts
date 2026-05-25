import type { DbInstance } from "@de100/apps-lms-db";
import { media } from "@de100/apps-lms-db/schema/media";
import {
	mediaCapabilitiesOutputSchema,
	mediaListOutputSchema,
	mediaRecordIdInputSchema,
	mediaRecordOutputSchema,
	mediaSignedAccessInputSchema,
	mediaSignedAccessOutputSchema,
	mediaUploadInputSchema,
} from "@de100/apps-lms-validators/server";
import type { AppErrorCode } from "@de100/apps-lms-validators/shared";
import { appErrorCodes } from "@de100/apps-lms-validators/shared";
import { and, desc, eq, isNull } from "drizzle-orm";

import { createAppError, defineAppError } from "../errors";
import { protectedProcedure } from "../index";
import {
	createSignedMediaAccessUrl,
	issueSignedMediaAccessToken,
	verifySignedMediaAccessToken,
} from "../media-signed-access";
import {
	createMediaAccessUrl,
	createStorageKey,
	getMediaStorageProvider,
	MediaStorageUnavailableError,
} from "../media-storage";

function requireRequest(request: Request | null, appCode: AppErrorCode) {
	if (!request) {
		throw createAppError("INTERNAL_SERVER_ERROR", appCode);
	}

	return request;
}

function serializeMediaRecord(
	request: Request,
	provider: ReturnType<typeof getMediaStorageProvider>,
	record: typeof media.$inferSelect,
) {
	return {
		...record,
		accessUrl: createMediaAccessUrl(request, record.visibility, record.key),
		directUrl:
			record.visibility === "public" && record.status === "ready"
				? provider.getPublicDirectUrl(record.key)
				: null,
	};
}

async function getOwnedMediaRecord(db: DbInstance, userId: string, id: string) {
	const [currentMedia] = await db
		.select()
		.from(media)
		.where(and(eq(media.id, id), eq(media.userId, userId), isNull(media.deletedAt)))
		.limit(1);

	if (!currentMedia) {
		throw createAppError("NOT_FOUND", appErrorCodes.media.notFound);
	}

	return currentMedia;
}

async function removeMediaObject(
	provider: ReturnType<typeof getMediaStorageProvider>,
	record: typeof media.$inferSelect,
	appCode: AppErrorCode,
) {
	try {
		await provider.deleteObject({
			key: record.key,
			visibility: record.visibility,
		});
	} catch (error) {
		if (error instanceof MediaStorageUnavailableError) {
			throw createAppError("INTERNAL_SERVER_ERROR", appCode);
		}

		throw error;
	}
}

const mediaRouterBasePath = "/media";

export const mediaRouter = {
	getCapabilities: protectedProcedure
		.errors({
			INTERNAL_SERVER_ERROR: defineAppError(appErrorCodes.media.backendLoadFailed),
		})
		.output(mediaCapabilitiesOutputSchema)
		.route({
			method: "GET",
			path: `${mediaRouterBasePath}/capabilities`,
			summary: "Describe the active media backend and delivery capabilities",
			tags: ["Media"],
		})
		.handler(async ({ context }) => {
			const request = requireRequest(context.request, appErrorCodes.media.backendLoadFailed);
			const provider = getMediaStorageProvider(request);

			return provider.getCapabilities();
		}),

	issueSignedAccess: protectedProcedure
		.errors({
			INTERNAL_SERVER_ERROR: defineAppError(appErrorCodes.media.signedAccessFailed),
			NOT_FOUND: defineAppError(appErrorCodes.media.notFound),
		})
		.input(mediaSignedAccessInputSchema)
		.output(mediaSignedAccessOutputSchema)
		.route({
			method: "POST",
			path: `${mediaRouterBasePath}/{id}/signed-access`,
			summary: "Issue a short-lived signed access URL for a media record",
			tags: ["Media"],
		})
		.handler(async ({ context, input }) => {
			const request = requireRequest(context.request, appErrorCodes.media.signedAccessFailed);
			const currentMedia = await getOwnedMediaRecord(context.db, context.session.user.id, input.id);

			if (currentMedia.status !== "ready") {
				throw createAppError("NOT_FOUND", appErrorCodes.media.notFound);
			}

			const signedAccess = await issueSignedMediaAccessToken({
				expiresInSeconds: input.expiresInSeconds,
				mediaId: currentMedia.id,
				userId: context.session.user.id,
			});

			return {
				expiresAt: signedAccess.expiresAt,
				url: createSignedMediaAccessUrl(request, signedAccess.token),
			};
		}),

	upload: protectedProcedure
		.errors({
			INTERNAL_SERVER_ERROR: defineAppError(appErrorCodes.media.uploadFailed),
		})
		.input(mediaUploadInputSchema)
		.output(mediaRecordOutputSchema)
		.route({
			method: "POST",
			path: `${mediaRouterBasePath}`,
			summary: "Upload a media file for the signed-in user",
			tags: ["Media"],
		})
		.handler(async ({ context, input }) => {
			const request = requireRequest(context.request, appErrorCodes.media.uploadFailed);
			const provider = getMediaStorageProvider(request);
			const bucketName = provider.getBucketName(input.visibility);
			const key = createStorageKey({
				fileName: input.file.name,
				userId: context.session.user.id,
				visibility: input.visibility,
			});
			const contentType = input.file.type || "application/octet-stream";
			const uploadBody =
				input.file instanceof Blob
					? input.file
					: new Blob([await input.file.arrayBuffer()], { type: contentType });

			try {
				await provider.putObject({
					httpMetadata: {
						cacheControl:
							input.visibility === "public"
								? "public, max-age=31536000, immutable"
								: "private, no-store, max-age=0",
						contentDisposition: `inline; filename="${input.file.name.replace(/"/g, "")}"`,
						contentType,
					},
					key,
					value: uploadBody,
					visibility: input.visibility,
				});
			} catch (error) {
				if (error instanceof MediaStorageUnavailableError) {
					throw createAppError("INTERNAL_SERVER_ERROR", appErrorCodes.media.uploadFailed);
				}

				throw error;
			}

			const timestamp = new Date();
			const [createdMedia] = await context.db
				.insert(media)
				.values({
					bucketName,
					contentType,
					createdAt: timestamp,
					fileName: input.file.name,
					id: crypto.randomUUID(),
					key,
					size: input.file.size,
					status: "draft",
					updatedAt: timestamp,
					userId: context.session.user.id,
					visibility: input.visibility,
				})
				.returning();

			if (!createdMedia) {
				throw createAppError("INTERNAL_SERVER_ERROR", appErrorCodes.media.uploadFailed);
			}

			return serializeMediaRecord(request, provider, createdMedia);
		}),

	getAll: protectedProcedure
		.errors({
			INTERNAL_SERVER_ERROR: defineAppError(appErrorCodes.media.loadFailed),
		})
		.output(mediaListOutputSchema)
		.route({
			method: "GET",
			path: `${mediaRouterBasePath}`,
			summary: "List media records owned by the signed-in user",
			tags: ["Media"],
		})
		.handler(async ({ context }) => {
			const request = requireRequest(context.request, appErrorCodes.media.loadFailed);
			const provider = getMediaStorageProvider(request);

			const records = await context.db
				.select()
				.from(media)
				.where(and(eq(media.userId, context.session.user.id), isNull(media.deletedAt)))
				.orderBy(desc(media.createdAt));

			return records.map((record) => serializeMediaRecord(request, provider, record));
		}),

	confirmUpload: protectedProcedure
		.errors({
			INTERNAL_SERVER_ERROR: defineAppError(appErrorCodes.media.confirmFailed),
			NOT_FOUND: defineAppError(appErrorCodes.media.notFound),
		})
		.input(mediaRecordIdInputSchema)
		.output(mediaRecordOutputSchema)
		.route({
			method: "POST",
			path: `${mediaRouterBasePath}/{id}/confirm`,
			summary: "Mark an uploaded media record as ready",
			tags: ["Media"],
		})
		.handler(async ({ context, input }) => {
			const request = requireRequest(context.request, appErrorCodes.media.confirmFailed);
			const provider = getMediaStorageProvider(request);
			const currentMedia = await getOwnedMediaRecord(context.db, context.session.user.id, input.id);

			if (currentMedia.status === "ready") {
				return serializeMediaRecord(request, provider, currentMedia);
			}

			const timestamp = new Date();
			const [confirmedMedia] = await context.db
				.update(media)
				.set({
					confirmedAt: currentMedia.confirmedAt ?? timestamp,
					status: "ready",
					updatedAt: timestamp,
				})
				.where(and(eq(media.id, input.id), eq(media.userId, context.session.user.id)))
				.returning();

			if (!confirmedMedia) {
				throw createAppError("NOT_FOUND", appErrorCodes.media.notFound);
			}

			return serializeMediaRecord(request, provider, confirmedMedia);
		}),

	delete: protectedProcedure
		.errors({
			INTERNAL_SERVER_ERROR: defineAppError(appErrorCodes.media.deleteFailed),
			NOT_FOUND: defineAppError(appErrorCodes.media.notFound),
		})
		.input(mediaRecordIdInputSchema)
		.output(mediaRecordOutputSchema)
		.route({
			method: "DELETE",
			path: `${mediaRouterBasePath}/{id}`,
			summary: "Delete a media record owned by the signed-in user",
			tags: ["Media"],
		})
		.handler(async ({ context, input }) => {
			const request = requireRequest(context.request, appErrorCodes.media.deleteFailed);
			const provider = getMediaStorageProvider(request);
			const currentMedia = await getOwnedMediaRecord(context.db, context.session.user.id, input.id);

			await removeMediaObject(provider, currentMedia, appErrorCodes.media.deleteFailed);

			const timestamp = new Date();
			const [deletedMedia] = await context.db
				.update(media)
				.set({
					deletedAt: timestamp,
					status: "deleted",
					updatedAt: timestamp,
				})
				.where(and(eq(media.id, input.id), eq(media.userId, context.session.user.id)))
				.returning();

			if (!deletedMedia) {
				throw createAppError("NOT_FOUND", appErrorCodes.media.notFound);
			}

			return serializeMediaRecord(request, provider, deletedMedia);
		}),
};

export async function resolveSignedMediaAccessToken(db: DbInstance, token: string) {
	const payload = await verifySignedMediaAccessToken(token);
	if (!payload) {
		return null;
	}

	const [mediaRecord] = await db
		.select()
		.from(media)
		.where(and(eq(media.id, payload.mediaId), eq(media.status, "ready"), isNull(media.deletedAt)))
		.limit(1);

	if (!mediaRecord) {
		return null;
	}

	return mediaRecord;
}
