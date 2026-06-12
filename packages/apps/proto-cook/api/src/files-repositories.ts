import type { DbInstance } from "@de100/apps-proto-cook-db";
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
} from "@de100/apps-proto-cook-db/schema/files";
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

type ProtoCookFileRow = typeof files.$inferSelect;
type ProtoCookUploadSessionRow = typeof fileUploadSessions.$inferSelect;
type ProtoCookUploadPartRow = typeof fileUploadParts.$inferSelect;
type ProtoCookFileVariantRow = typeof fileVariants.$inferSelect;
type ProtoCookProcessingJobRow = typeof fileProcessingJobs.$inferSelect;
type ProtoCookFileArtifactGroupRow = typeof fileArtifactGroups.$inferSelect;
type ProtoCookFileArtifactRow = typeof fileArtifacts.$inferSelect;
type ProtoCookFilePlaybackSessionRow = typeof filePlaybackSessions.$inferSelect;
type ProtoCookFilePlaybackEventRow = typeof filePlaybackEvents.$inferSelect;

export type ProtoCookFilesRepositories = Pick<
	FilesOperations,
	"artifacts" | "files" | "jobs" | "parts" | "sessions" | "variants"
>;

export function createProtoCookFilesRepositories(db: DbInstance): ProtoCookFilesRepositories {
	return {
		artifacts: {
			groups: createProtoCookFileArtifactGroupRepository(db),
			items: createProtoCookFileArtifactRepository(db),
			playbackEvents: createProtoCookFilePlaybackEventRepository(db),
			playbackSessions: createProtoCookFilePlaybackSessionRepository(db),
		},
		files: createProtoCookFilesRepository(db),
		jobs: createProtoCookFileProcessingJobRepository(db),
		parts: createProtoCookFileUploadPartRepository(db),
		sessions: createProtoCookFileUploadSessionRepository(db),
		variants: createProtoCookFileVariantRepository(db),
	};
}

export function createProtoCookFilesRepository(db: DbInstance): FilesRepository {
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

			return serializeProtoCookFileRecord(created);
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

			return deleted ? serializeProtoCookFileRecord(deleted) : null;
		},
		async getFile(id, context) {
			const [record] = await db
				.select()
				.from(files)
				.where(and(eq(files.id, id), createReadableFilePredicate(context)))
				.limit(1);

			return record ? serializeProtoCookFileRecord(record) : null;
		},
		async getFileByKey(key) {
			const [record] = await db
				.select()
				.from(files)
				.where(and(eq(files.key, key), isNull(files.deletedAt)))
				.limit(1);

			return record ? serializeProtoCookFileRecord(record) : null;
		},
		async listFiles(context) {
			const records = await db
				.select()
				.from(files)
				.where(createListFilesPredicate(context))
				.orderBy(desc(files.createdAt));

			return records.map(serializeProtoCookFileRecord);
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

			return record ? serializeProtoCookFileRecord(record) : null;
		},
	};
}

export function createProtoCookFileUploadSessionRepository(
	db: DbInstance,
): FileUploadSessionRepository {
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

			return serializeProtoCookUploadSessionRecord(created);
		},
		async getSession(id, context) {
			const [session] = await db
				.select()
				.from(fileUploadSessions)
				.where(and(eq(fileUploadSessions.id, id), createSessionOwnerPredicate(context)))
				.limit(1);

			return session ? serializeProtoCookUploadSessionRecord(session) : null;
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

			return session ? serializeProtoCookUploadSessionRecord(session) : null;
		},
	};
}

export function createProtoCookFileUploadPartRepository(db: DbInstance): FileUploadPartRepository {
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

			return serializeProtoCookUploadPartRecord(created);
		},
		async listParts(sessionId) {
			const parts = await db
				.select()
				.from(fileUploadParts)
				.where(eq(fileUploadParts.sessionId, sessionId))
				.orderBy(asc(fileUploadParts.partNumber));

			return parts.map(serializeProtoCookUploadPartRecord);
		},
	};
}

export function createProtoCookFileVariantRepository(db: DbInstance): FileVariantRepository {
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

			return serializeProtoCookFileVariantRecord(created);
		},
		async listVariants(fileId) {
			const variants = await db
				.select()
				.from(fileVariants)
				.where(and(eq(fileVariants.fileId, fileId), isNull(fileVariants.deletedAt)))
				.orderBy(asc(fileVariants.kind));

			return variants.map(serializeProtoCookFileVariantRecord);
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

			return variant ? serializeProtoCookFileVariantRecord(variant) : null;
		},
	};
}

export function createProtoCookFileArtifactGroupRepository(
	db: DbInstance,
): FileArtifactGroupRepository {
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

			return serializeProtoCookFileArtifactGroupRecord(created);
		},
		async getGroup(id) {
			const [group] = await db
				.select()
				.from(fileArtifactGroups)
				.where(and(eq(fileArtifactGroups.id, id), isNull(fileArtifactGroups.deletedAt)))
				.limit(1);

			return group ? serializeProtoCookFileArtifactGroupRecord(group) : null;
		},
		async listGroups(fileId) {
			const groups = await db
				.select()
				.from(fileArtifactGroups)
				.where(and(eq(fileArtifactGroups.fileId, fileId), isNull(fileArtifactGroups.deletedAt)))
				.orderBy(desc(fileArtifactGroups.createdAt));

			return groups.map(serializeProtoCookFileArtifactGroupRecord);
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

			return group ? serializeProtoCookFileArtifactGroupRecord(group) : null;
		},
	};
}

export function createProtoCookFileArtifactRepository(db: DbInstance): FileArtifactRepository {
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

			return serializeProtoCookFileArtifactRecord(created);
		},
		async listArtifacts(groupId) {
			const artifacts = await db
				.select()
				.from(fileArtifacts)
				.where(and(eq(fileArtifacts.groupId, groupId), isNull(fileArtifacts.deletedAt)))
				.orderBy(asc(fileArtifacts.sortOrder), asc(fileArtifacts.kind));

			return artifacts.map(serializeProtoCookFileArtifactRecord);
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

			return artifact ? serializeProtoCookFileArtifactRecord(artifact) : null;
		},
	};
}

export function createProtoCookFilePlaybackSessionRepository(
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

			return serializeProtoCookFilePlaybackSessionRecord(created);
		},
		async getSessionByToken(token) {
			const [session] = await db
				.select()
				.from(filePlaybackSessions)
				.where(eq(filePlaybackSessions.token, token))
				.limit(1);

			return session ? serializeProtoCookFilePlaybackSessionRecord(session) : null;
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

			return session ? serializeProtoCookFilePlaybackSessionRecord(session) : null;
		},
	};
}

export function createProtoCookFilePlaybackEventRepository(
	db: DbInstance,
): FilePlaybackEventRepository {
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

			return serializeProtoCookFilePlaybackEventRecord(created);
		},
		async listEvents(input) {
			const events = await db
				.select()
				.from(filePlaybackEvents)
				.where(eq(filePlaybackEvents.fileId, input.fileId))
				.orderBy(desc(filePlaybackEvents.occurredAt))
				.limit(input.limit ?? 100);

			return events.map(serializeProtoCookFilePlaybackEventRecord);
		},
	};
}

export function createProtoCookFileProcessingJobRepository(
	db: DbInstance,
): FileProcessingJobRepository {
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

			return serializeProtoCookProcessingJobRecord(created);
		},
		async getJob(id) {
			const [job] = await db
				.select()
				.from(fileProcessingJobs)
				.where(eq(fileProcessingJobs.id, id))
				.limit(1);

			return job ? serializeProtoCookProcessingJobRecord(job) : null;
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

			return job ? serializeProtoCookProcessingJobRecord(job) : null;
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

			return job ? serializeProtoCookProcessingJobRecord(job) : null;
		},
	};
}

export function serializeProtoCookFileRecord(
	row: ProtoCookFileRow,
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

export function serializeProtoCookUploadSessionRecord(
	row: ProtoCookUploadSessionRow,
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

export function serializeProtoCookUploadPartRecord(
	row: ProtoCookUploadPartRow,
): FilesUploadPartRecord {
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

export function serializeProtoCookFileVariantRecord(
	row: ProtoCookFileVariantRow,
): FilesVariantRecord {
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

export function serializeProtoCookFileArtifactGroupRecord(row: ProtoCookFileArtifactGroupRow) {
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

export function serializeProtoCookFileArtifactRecord(row: ProtoCookFileArtifactRow) {
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

export function serializeProtoCookFilePlaybackSessionRecord(row: ProtoCookFilePlaybackSessionRow) {
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

export function serializeProtoCookFilePlaybackEventRecord(row: ProtoCookFilePlaybackEventRow) {
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

export function serializeProtoCookProcessingJobRecord(
	row: ProtoCookProcessingJobRow,
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
	if (context.role === "admin" || context.role === "worker") {
		return isNull(files.deletedAt);
	}

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
	if (context.role === "admin" || context.role === "worker") {
		return isNull(files.deletedAt);
	}

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
