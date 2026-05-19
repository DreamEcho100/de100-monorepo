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
import { ORPCError } from "@orpc/server";
import { and, desc, eq, isNull } from "drizzle-orm";

import { protectedProcedure } from "../index";
import {
	createSignedMediaAccessUrl,
	issueSignedMediaAccessToken,
	verifySignedMediaAccessToken,
} from "../media-signed-access";
import {
	createMediaAccessUrl,
	createStorageKey,
	getMediaBucket,
	getMediaBucketName,
	getMediaStorageCapabilities,
	getPublicMediaDirectUrl,
	MediaBindingsUnavailableError,
} from "../media-storage";

function requireRequest(request: Request | null) {
	if (!request) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Media procedures require the active request context.",
		});
	}

	return request;
}

function serializeMediaRecord(request: Request, record: typeof media.$inferSelect) {
	return {
		...record,
		accessUrl: createMediaAccessUrl(request, record.visibility, record.key),
		directUrl:
			record.visibility === "public" && record.status === "ready"
				? getPublicMediaDirectUrl(request, record.key)
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
		throw new ORPCError("NOT_FOUND");
	}

	return currentMedia;
}

async function removeMediaObject(request: Request, record: typeof media.$inferSelect) {
	try {
		const bucket = getMediaBucket(request, record.visibility);
		await bucket.delete(record.key);
	} catch (error) {
		if (error instanceof MediaBindingsUnavailableError) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: error.message,
			});
		}

		throw error;
	}
}

const mediaRouterBasePath = "/media";

export const mediaRouter = {
	getCapabilities: protectedProcedure
		.output(mediaCapabilitiesOutputSchema)
		.route({
			method: "GET",
			path: `${mediaRouterBasePath}/capabilities`,
			summary: "Describe the active media backend and delivery capabilities",
			tags: ["Media"],
		})
		.handler(async ({ context }) => {
			const request = requireRequest(context.request);

			return getMediaStorageCapabilities(request);
		}),

	issueSignedAccess: protectedProcedure
		.errors({
			NOT_FOUND: {
				message: "Media record not found.",
			},
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
			const request = requireRequest(context.request);
			const currentMedia = await getOwnedMediaRecord(context.db, context.session.user.id, input.id);

			if (currentMedia.status !== "ready") {
				throw new ORPCError("NOT_FOUND");
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
			INTERNAL_SERVER_ERROR: {
				message: "Media upload failed.",
			},
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
			const request = requireRequest(context.request);
			const bucket = getMediaBucket(request, input.visibility);
			const bucketName = getMediaBucketName(request, input.visibility);
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
				await bucket.put(key, uploadBody, {
					httpMetadata: {
						cacheControl:
							input.visibility === "public"
								? "public, max-age=31536000, immutable"
								: "private, no-store, max-age=0",
						contentDisposition: `inline; filename="${input.file.name.replace(/"/g, "")}"`,
						contentType,
					},
				});
			} catch (error) {
				if (error instanceof MediaBindingsUnavailableError) {
					throw new ORPCError("INTERNAL_SERVER_ERROR", {
						message: error.message,
					});
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
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Failed to persist uploaded media metadata.",
				});
			}

			return serializeMediaRecord(request, createdMedia);
		}),

	getAll: protectedProcedure
		.output(mediaListOutputSchema)
		.route({
			method: "GET",
			path: `${mediaRouterBasePath}`,
			summary: "List media records owned by the signed-in user",
			tags: ["Media"],
		})
		.handler(async ({ context }) => {
			const request = requireRequest(context.request);

			const records = await context.db
				.select()
				.from(media)
				.where(and(eq(media.userId, context.session.user.id), isNull(media.deletedAt)))
				.orderBy(desc(media.createdAt));

			return records.map((record) => serializeMediaRecord(request, record));
		}),

	confirmUpload: protectedProcedure
		.errors({
			INTERNAL_SERVER_ERROR: {
				message: "Media confirmation failed.",
			},
			NOT_FOUND: {
				message: "Media record not found.",
			},
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
			const request = requireRequest(context.request);
			const currentMedia = await getOwnedMediaRecord(context.db, context.session.user.id, input.id);

			if (currentMedia.status === "ready") {
				return serializeMediaRecord(request, currentMedia);
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
				throw new ORPCError("NOT_FOUND");
			}

			return serializeMediaRecord(request, confirmedMedia);
		}),

	delete: protectedProcedure
		.errors({
			INTERNAL_SERVER_ERROR: {
				message: "Media deletion failed.",
			},
			NOT_FOUND: {
				message: "Media record not found.",
			},
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
			const request = requireRequest(context.request);
			const currentMedia = await getOwnedMediaRecord(context.db, context.session.user.id, input.id);

			await removeMediaObject(request, currentMedia);

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
				throw new ORPCError("NOT_FOUND");
			}

			return serializeMediaRecord(request, deletedMedia);
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
