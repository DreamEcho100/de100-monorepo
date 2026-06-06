import type { DbInstance } from "@de100/apps-lms-db";
import {
	fileArtifactGroups,
	fileArtifacts,
	filePlaybackEvents,
	filePlaybackSessions,
	fileProcessingJobs,
	files,
	fileUploadParts,
	fileUploadSessions,
	fileVariants,
} from "@de100/apps-lms-db/schema/files";
import type {
	FileArtifactGroupRepository,
	FileArtifactRepository,
	FilePlaybackEventRepository,
	FilePlaybackSessionRepository,
	FileProcessingJobRepository,
	FilesAuthContext,
	FilesOperations,
	FilesProcessingJobRecord,
	FilesRepository,
	FilesUploadPartRecord,
	FilesUploadSessionRecord,
	FilesVariantRecord,
	FileUploadPartRepository,
	FileUploadSessionRepository,
	FileVariantRepository,
} from "@de100/files-server/operations";
import { and, asc, desc, eq, isNull, or } from "drizzle-orm";

type LmsFileRow = typeof files.$inferSelect;
type LmsUploadSessionRow = typeof fileUploadSessions.$inferSelect;
type LmsUploadPartRow = typeof fileUploadParts.$inferSelect;
type LmsFileVariantRow = typeof fileVariants.$inferSelect;
type LmsProcessingJobRow = typeof fileProcessingJobs.$inferSelect;
type LmsFileArtifactGroupRow = typeof fileArtifactGroups.$inferSelect;
type LmsFileArtifactRow = typeof fileArtifacts.$inferSelect;
type LmsFilePlaybackSessionRow = typeof filePlaybackSessions.$inferSelect;
type LmsFilePlaybackEventRow = typeof filePlaybackEvents.$inferSelect;

export type LmsFilesRepositories = Pick<
	FilesOperations,
	"artifacts" | "files" | "jobs" | "parts" | "sessions" | "variants"
>;

export function createLmsFilesRepositories(db: DbInstance): LmsFilesRepositories {
	return {
		artifacts: {
			groups: createLmsFileArtifactGroupRepository(db),
			items: createLmsFileArtifactRepository(db),
			playbackEvents: createLmsFilePlaybackEventRepository(db),
			playbackSessions: createLmsFilePlaybackSessionRepository(db),
		},
		files: createLmsFilesRepository(db),
		jobs: createLmsFileProcessingJobRepository(db),
		parts: createLmsFileUploadPartRepository(db),
		sessions: createLmsFileUploadSessionRepository(db),
		variants: createLmsFileVariantRepository(db),
	};
}

export function createLmsFilesRepository(db: DbInstance): FilesRepository {
	return {
		async createFile(input) {
			const timestamp = new Date();
			const [created] = await db
				.insert(files)
				.values({
					bucketName: input.bucketName,
					contentType: input.contentType,
					createdAt: timestamp,
					fileName: input.fileName,
					id: crypto.randomUUID(),
					key: input.key,
					kind: input.kind,
					metadata: input.metadata ?? null,
					size: input.size,
					status: input.status,
					updatedAt: timestamp,
					userId: input.userId,
					visibility: input.visibility,
				})
				.returning();

			if (!created) {
				throw new Error("Failed to create file record.");
			}

			return serializeLmsFileRecord(created);
		},
		async deleteFile(id, context) {
			if (!context.userId) {
				return null;
			}

			const timestamp = new Date();
			const [deleted] = await db
				.update(files)
				.set({
					deletedAt: timestamp,
					status: "deleted",
					updatedAt: timestamp,
				})
				.where(and(eq(files.id, id), eq(files.userId, context.userId), isNull(files.deletedAt)))
				.returning();

			return deleted ? serializeLmsFileRecord(deleted) : null;
		},
		async getFile(id, context) {
			const [record] = await db
				.select()
				.from(files)
				.where(and(eq(files.id, id), createReadableFilePredicate(context)))
				.limit(1);

			return record ? serializeLmsFileRecord(record) : null;
		},
		async getFileByKey(key) {
			const [record] = await db
				.select()
				.from(files)
				.where(and(eq(files.key, key), isNull(files.deletedAt)))
				.limit(1);

			return record ? serializeLmsFileRecord(record) : null;
		},
		async listFiles(context) {
			const records = await db
				.select()
				.from(files)
				.where(createListFilesPredicate(context))
				.orderBy(desc(files.createdAt));

			return records.map(serializeLmsFileRecord);
		},
		async updateFileStatus(id, status) {
			const timestamp = new Date();
			const [record] = await db
				.update(files)
				.set({
					...(status === "deleted" ? { deletedAt: timestamp } : {}),
					status,
					updatedAt: timestamp,
				})
				.where(eq(files.id, id))
				.returning();

			return record ? serializeLmsFileRecord(record) : null;
		},
	};
}

export function createLmsFileUploadSessionRepository(db: DbInstance): FileUploadSessionRepository {
	return {
		async createSession(input) {
			const timestamp = new Date();
			const [created] = await db
				.insert(fileUploadSessions)
				.values({
					createdAt: timestamp,
					expiresAt: input.expiresAt,
					fileId: input.fileId,
					id: input.id,
					protocol: input.protocol,
					status: input.status,
					updatedAt: timestamp,
					userId: input.userId,
				})
				.returning();

			if (!created) {
				throw new Error("Failed to create file upload session.");
			}

			return serializeLmsUploadSessionRecord(created);
		},
		async getSession(id, context) {
			const [session] = await db
				.select()
				.from(fileUploadSessions)
				.where(and(eq(fileUploadSessions.id, id), createSessionOwnerPredicate(context)))
				.limit(1);

			return session ? serializeLmsUploadSessionRecord(session) : null;
		},
		async updateSessionStatus(id, status) {
			const [session] = await db
				.update(fileUploadSessions)
				.set({
					status,
					updatedAt: new Date(),
				})
				.where(eq(fileUploadSessions.id, id))
				.returning();

			return session ? serializeLmsUploadSessionRecord(session) : null;
		},
	};
}

export function createLmsFileUploadPartRepository(db: DbInstance): FileUploadPartRepository {
	return {
		async createPart(input) {
			const timestamp = new Date();
			const [created] = await db
				.insert(fileUploadParts)
				.values({
					checksum: input.checksum ?? null,
					createdAt: timestamp,
					etag: input.etag ?? null,
					fileId: input.fileId,
					id: input.id,
					partNumber: input.partNumber,
					sessionId: input.sessionId,
					size: input.size,
					updatedAt: timestamp,
				})
				.returning();

			if (!created) {
				throw new Error("Failed to create file upload part.");
			}

			return serializeLmsUploadPartRecord(created);
		},
		async listParts(sessionId) {
			const parts = await db
				.select()
				.from(fileUploadParts)
				.where(eq(fileUploadParts.sessionId, sessionId))
				.orderBy(asc(fileUploadParts.partNumber));

			return parts.map(serializeLmsUploadPartRecord);
		},
	};
}

export function createLmsFileVariantRepository(db: DbInstance): FileVariantRepository {
	return {
		async createVariant(input) {
			const timestamp = new Date();
			const [created] = await db
				.insert(fileVariants)
				.values({
					bucketName: input.bucketName,
					contentType: input.contentType,
					createdAt: timestamp,
					fileId: input.fileId,
					height: input.height ?? null,
					id: input.id,
					key: input.key,
					kind: input.kind,
					metadata: input.metadata ?? null,
					size: input.size,
					status: input.status,
					updatedAt: timestamp,
					width: input.width ?? null,
				})
				.returning();

			if (!created) {
				throw new Error("Failed to create file variant.");
			}

			return serializeLmsFileVariantRecord(created);
		},
		async listVariants(fileId) {
			const variants = await db
				.select()
				.from(fileVariants)
				.where(and(eq(fileVariants.fileId, fileId), isNull(fileVariants.deletedAt)))
				.orderBy(asc(fileVariants.kind));

			return variants.map(serializeLmsFileVariantRecord);
		},
		async updateVariantStatus(id, status) {
			const timestamp = new Date();
			const [variant] = await db
				.update(fileVariants)
				.set({
					...(status === "deleted" ? { deletedAt: timestamp } : {}),
					status,
					updatedAt: timestamp,
				})
				.where(eq(fileVariants.id, id))
				.returning();

			return variant ? serializeLmsFileVariantRecord(variant) : null;
		},
	};
}

export function createLmsFileArtifactGroupRepository(db: DbInstance): FileArtifactGroupRepository {
	return {
		async createGroup(input) {
			const timestamp = new Date();
			const [created] = await db
				.insert(fileArtifactGroups)
				.values({
					bucketName: input.bucketName ?? null,
					createdAt: timestamp,
					fileId: input.fileId,
					id: input.id ?? crypto.randomUUID(),
					kind: input.kind,
					metadata: input.metadata ?? null,
					revision: input.revision,
					status: input.status,
					storagePrefix: input.storagePrefix,
					updatedAt: timestamp,
					visibility: input.visibility,
				})
				.returning();

			if (!created) {
				throw new Error("Failed to create file artifact group.");
			}

			return serializeLmsFileArtifactGroupRecord(created);
		},
		async getGroup(id) {
			const [group] = await db
				.select()
				.from(fileArtifactGroups)
				.where(and(eq(fileArtifactGroups.id, id), isNull(fileArtifactGroups.deletedAt)))
				.limit(1);

			return group ? serializeLmsFileArtifactGroupRecord(group) : null;
		},
		async listGroups(fileId) {
			const groups = await db
				.select()
				.from(fileArtifactGroups)
				.where(and(eq(fileArtifactGroups.fileId, fileId), isNull(fileArtifactGroups.deletedAt)))
				.orderBy(desc(fileArtifactGroups.createdAt));

			return groups.map(serializeLmsFileArtifactGroupRecord);
		},
		async updateGroupStatus(id, status) {
			const timestamp = new Date();
			const [group] = await db
				.update(fileArtifactGroups)
				.set({
					...(status === "deleted" ? { deletedAt: timestamp } : {}),
					status,
					updatedAt: timestamp,
				})
				.where(eq(fileArtifactGroups.id, id))
				.returning();

			return group ? serializeLmsFileArtifactGroupRecord(group) : null;
		},
	};
}

export function createLmsFileArtifactRepository(db: DbInstance): FileArtifactRepository {
	return {
		async createArtifact(input) {
			const timestamp = new Date();
			const [created] = await db
				.insert(fileArtifacts)
				.values({
					bucketName: input.bucketName ?? null,
					contentType: input.contentType,
					createdAt: timestamp,
					durationMs: input.durationMs ?? null,
					fileId: input.fileId,
					groupId: input.groupId,
					height: input.height ?? null,
					id: input.id ?? crypto.randomUUID(),
					key: input.key,
					kind: input.kind,
					metadata: input.metadata ?? null,
					renditionLabel: input.renditionLabel ?? null,
					size: input.size,
					sortOrder: input.sortOrder,
					status: input.status,
					updatedAt: timestamp,
					width: input.width ?? null,
				})
				.returning();

			if (!created) {
				throw new Error("Failed to create file artifact.");
			}

			return serializeLmsFileArtifactRecord(created);
		},
		async listArtifacts(groupId) {
			const artifacts = await db
				.select()
				.from(fileArtifacts)
				.where(and(eq(fileArtifacts.groupId, groupId), isNull(fileArtifacts.deletedAt)))
				.orderBy(asc(fileArtifacts.sortOrder), asc(fileArtifacts.kind));

			return artifacts.map(serializeLmsFileArtifactRecord);
		},
		async updateArtifactStatus(id, status) {
			const timestamp = new Date();
			const [artifact] = await db
				.update(fileArtifacts)
				.set({
					...(status === "deleted" ? { deletedAt: timestamp } : {}),
					status,
					updatedAt: timestamp,
				})
				.where(eq(fileArtifacts.id, id))
				.returning();

			return artifact ? serializeLmsFileArtifactRecord(artifact) : null;
		},
	};
}

export function createLmsFilePlaybackSessionRepository(
	db: DbInstance,
): FilePlaybackSessionRepository {
	return {
		async createSession(input) {
			const timestamp = new Date();
			const [created] = await db
				.insert(filePlaybackSessions)
				.values({
					artifactGroupId: input.artifactGroupId,
					createdAt: timestamp,
					expiresAt: input.expiresAt,
					fileId: input.fileId,
					id: input.id,
					issuedAt: input.issuedAt,
					metadata: input.metadata,
					protectionMode: input.protectionMode,
					status: input.status,
					subjectUserId: input.subjectId,
					token: input.token,
					updatedAt: timestamp,
				})
				.returning();

			if (!created) {
				throw new Error("Failed to create file playback session.");
			}

			return serializeLmsFilePlaybackSessionRecord(created);
		},
		async getSessionByToken(token) {
			const [session] = await db
				.select()
				.from(filePlaybackSessions)
				.where(eq(filePlaybackSessions.token, token))
				.limit(1);

			return session ? serializeLmsFilePlaybackSessionRecord(session) : null;
		},
		async updateSessionStatus(id, status) {
			const [session] = await db
				.update(filePlaybackSessions)
				.set({
					status,
					updatedAt: new Date(),
				})
				.where(eq(filePlaybackSessions.id, id))
				.returning();

			return session ? serializeLmsFilePlaybackSessionRecord(session) : null;
		},
	};
}

export function createLmsFilePlaybackEventRepository(db: DbInstance): FilePlaybackEventRepository {
	return {
		async createEvent(input) {
			const timestamp = new Date();
			const [created] = await db
				.insert(filePlaybackEvents)
				.values({
					artifactGroupId: input.artifactGroupId,
					bufferedSeconds: input.bufferedSeconds,
					createdAt: timestamp,
					durationSeconds: input.durationSeconds,
					eventKind: input.eventKind,
					fileId: input.fileId,
					id: input.id,
					metadata: input.metadata,
					occurredAt: input.occurredAt,
					playbackSessionId: input.playbackSessionId,
					positionSeconds: input.positionSeconds,
					renditionLabel: input.renditionLabel,
					subjectUserId: input.subjectId,
				})
				.returning();

			if (!created) {
				throw new Error("Failed to create file playback event.");
			}

			return serializeLmsFilePlaybackEventRecord(created);
		},
		async listEvents(input) {
			const events = await db
				.select()
				.from(filePlaybackEvents)
				.where(eq(filePlaybackEvents.fileId, input.fileId))
				.orderBy(desc(filePlaybackEvents.occurredAt))
				.limit(input.limit ?? 100);

			return events.map(serializeLmsFilePlaybackEventRecord);
		},
	};
}

export function createLmsFileProcessingJobRepository(db: DbInstance): FileProcessingJobRepository {
	return {
		async createJob(input) {
			const timestamp = new Date();
			const [created] = await db
				.insert(fileProcessingJobs)
				.values({
					attempts: input.attempts ?? 0,
					createdAt: timestamp,
					error: input.error ?? null,
					fileId: input.fileId,
					id: input.id,
					input: input.input ?? null,
					kind: input.kind,
					output: input.output ?? null,
					runAfter: input.runAfter ?? null,
					status: input.status,
					updatedAt: timestamp,
				})
				.returning();

			if (!created) {
				throw new Error("Failed to create file processing job.");
			}

			return serializeLmsProcessingJobRecord(created);
		},
		async getJob(id) {
			const [job] = await db
				.select()
				.from(fileProcessingJobs)
				.where(eq(fileProcessingJobs.id, id))
				.limit(1);

			return job ? serializeLmsProcessingJobRecord(job) : null;
		},
		async updateJob(id, patch) {
			const [job] = await db
				.update(fileProcessingJobs)
				.set({
					...(patch.attempts !== undefined ? { attempts: patch.attempts } : {}),
					...(patch.error !== undefined ? { error: patch.error } : {}),
					...(patch.input !== undefined ? { input: patch.input } : {}),
					...(patch.output !== undefined ? { output: patch.output } : {}),
					...(patch.runAfter !== undefined ? { runAfter: patch.runAfter } : {}),
					...(patch.status !== undefined ? { status: patch.status } : {}),
					updatedAt: new Date(),
				})
				.where(eq(fileProcessingJobs.id, id))
				.returning();

			return job ? serializeLmsProcessingJobRecord(job) : null;
		},
		async updateJobStatus(id, status) {
			const [job] = await db
				.update(fileProcessingJobs)
				.set({
					status,
					updatedAt: new Date(),
				})
				.where(eq(fileProcessingJobs.id, id))
				.returning();

			return job ? serializeLmsProcessingJobRecord(job) : null;
		},
	};
}

export function serializeLmsFileRecord(
	row: LmsFileRow,
): Awaited<ReturnType<FilesRepository["createFile"]>> {
	return {
		accessUrl: null,
		bucketName: row.bucketName,
		contentType: row.contentType,
		createdAt: row.createdAt,
		deletedAt: row.deletedAt,
		fileName: row.fileName,
		id: row.id,
		key: row.key,
		kind: row.kind,
		metadata: row.metadata,
		size: row.size,
		status: row.status,
		updatedAt: row.updatedAt,
		userId: row.userId,
		visibility: row.visibility,
	};
}

export function serializeLmsUploadSessionRecord(
	row: LmsUploadSessionRow,
): FilesUploadSessionRecord {
	return {
		createdAt: row.createdAt,
		expiresAt: row.expiresAt,
		fileId: row.fileId,
		id: row.id,
		protocol: row.protocol,
		status: row.status,
		updatedAt: row.updatedAt,
		userId: row.userId,
	};
}

export function serializeLmsUploadPartRecord(row: LmsUploadPartRow): FilesUploadPartRecord {
	return {
		checksum: row.checksum,
		createdAt: row.createdAt,
		etag: row.etag,
		fileId: row.fileId,
		id: row.id,
		partNumber: row.partNumber,
		sessionId: row.sessionId,
		size: row.size,
		updatedAt: row.updatedAt,
	};
}

export function serializeLmsFileVariantRecord(row: LmsFileVariantRow): FilesVariantRecord {
	return {
		bucketName: row.bucketName,
		contentType: row.contentType,
		createdAt: row.createdAt,
		deletedAt: row.deletedAt,
		fileId: row.fileId,
		height: row.height,
		id: row.id,
		key: row.key,
		kind: row.kind,
		metadata: row.metadata,
		size: row.size,
		status: row.status,
		updatedAt: row.updatedAt,
		width: row.width,
	};
}

export function serializeLmsFileArtifactGroupRecord(row: LmsFileArtifactGroupRow) {
	return {
		bucketName: row.bucketName,
		createdAt: row.createdAt,
		deletedAt: row.deletedAt,
		fileId: row.fileId,
		id: row.id,
		kind: row.kind,
		metadata: row.metadata,
		revision: row.revision,
		status: row.status,
		storagePrefix: row.storagePrefix,
		updatedAt: row.updatedAt,
		visibility: row.visibility,
	};
}

export function serializeLmsFileArtifactRecord(row: LmsFileArtifactRow) {
	return {
		bucketName: row.bucketName,
		contentType: row.contentType,
		createdAt: row.createdAt,
		deletedAt: row.deletedAt,
		durationMs: row.durationMs,
		fileId: row.fileId,
		groupId: row.groupId,
		height: row.height,
		id: row.id,
		key: row.key,
		kind: row.kind,
		metadata: row.metadata,
		renditionLabel: row.renditionLabel,
		size: row.size,
		sortOrder: row.sortOrder,
		status: row.status,
		updatedAt: row.updatedAt,
		width: row.width,
	};
}

export function serializeLmsFilePlaybackSessionRecord(row: LmsFilePlaybackSessionRow) {
	return {
		artifactGroupId: row.artifactGroupId,
		expiresAt: row.expiresAt,
		fileId: row.fileId,
		id: row.id,
		issuedAt: row.issuedAt,
		metadata: row.metadata,
		protectionMode: row.protectionMode,
		status: row.status,
		subjectId: row.subjectUserId,
		token: row.token,
	};
}

export function serializeLmsFilePlaybackEventRecord(row: LmsFilePlaybackEventRow) {
	return {
		artifactGroupId: row.artifactGroupId,
		bufferedSeconds: row.bufferedSeconds,
		durationSeconds: row.durationSeconds,
		eventKind: row.eventKind,
		fileId: row.fileId,
		id: row.id,
		metadata: row.metadata,
		occurredAt: row.occurredAt,
		playbackSessionId: row.playbackSessionId,
		positionSeconds: row.positionSeconds,
		renditionLabel: row.renditionLabel,
		subjectId: row.subjectUserId,
	};
}

export function serializeLmsProcessingJobRecord(
	row: LmsProcessingJobRow,
): FilesProcessingJobRecord {
	return {
		attempts: row.attempts,
		createdAt: row.createdAt,
		error: row.error,
		fileId: row.fileId,
		id: row.id,
		input: row.input,
		kind: row.kind,
		output: row.output,
		runAfter: row.runAfter,
		status: row.status,
		updatedAt: row.updatedAt,
	};
}

function createReadableFilePredicate(context: FilesAuthContext) {
	const publicReadyPredicate = and(
		eq(files.visibility, "public"),
		eq(files.status, "ready"),
		isNull(files.deletedAt),
	);

	if (!context.userId) {
		return publicReadyPredicate;
	}

	return and(isNull(files.deletedAt), or(eq(files.userId, context.userId), publicReadyPredicate));
}

function createListFilesPredicate(context: FilesAuthContext) {
	if (!context.userId) {
		return and(eq(files.visibility, "public"), eq(files.status, "ready"), isNull(files.deletedAt));
	}

	return and(eq(files.userId, context.userId), isNull(files.deletedAt));
}

function createSessionOwnerPredicate(context: FilesAuthContext) {
	if (!context.userId) {
		return isNull(fileUploadSessions.userId);
	}

	return eq(fileUploadSessions.userId, context.userId);
}
