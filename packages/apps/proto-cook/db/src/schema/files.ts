import {
	fileKindValues,
	fileStatusValues,
	filesArtifactGroupKindValues,
	filesArtifactKindValues,
	filesHlsProtectionModeValues,
	filesPlaybackEventKindValues,
	filesPlaybackSessionStatusValues,
	filesUploadTargetProtocolValues,
	fileVisibilityValues,
	processingJobStatusValues,
	uploadSessionStatusValues,
} from "@de100/files-shared";
import { relations } from "drizzle-orm";
import {
	bigint,
	doublePrecision,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const fileKindEnum = pgEnum("file_kind", fileKindValues);
export const fileVisibilityEnum = pgEnum("file_visibility", fileVisibilityValues);
export const fileStatusEnum = pgEnum("file_status", fileStatusValues);
export const fileUploadSessionStatusEnum = pgEnum(
	"file_upload_session_status",
	uploadSessionStatusValues,
);
export const fileUploadProtocolEnum = pgEnum(
	"file_upload_protocol",
	filesUploadTargetProtocolValues,
);
export const fileProcessingJobStatusEnum = pgEnum(
	"file_processing_job_status",
	processingJobStatusValues,
);
export const fileArtifactGroupKindEnum = pgEnum(
	"file_artifact_group_kind",
	filesArtifactGroupKindValues,
);
export const fileArtifactKindEnum = pgEnum("file_artifact_kind", filesArtifactKindValues);
export const filePlaybackSessionStatusEnum = pgEnum(
	"file_playback_session_status",
	filesPlaybackSessionStatusValues,
);
export const fileHlsProtectionModeEnum = pgEnum(
	"file_hls_protection_mode",
	filesHlsProtectionModeValues,
);
export const filePlaybackEventKindEnum = pgEnum(
	"file_playback_event_kind",
	filesPlaybackEventKindValues,
);

export const courseStatusEnum = pgEnum("course_status", ["draft", "published", "archived"]);
export const courseLessonVisibilityEnum = pgEnum("course_lesson_visibility", [
	"preview",
	"enrolled",
	"private",
]);
export const courseEnrollmentStatusEnum = pgEnum("course_enrollment_status", [
	"active",
	"completed",
	"canceled",
]);
export const fileCaptionTrackKindEnum = pgEnum("file_caption_track_kind", [
	"captions",
	"subtitles",
]);

export const files = pgTable(
	"files",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
		fileName: text("file_name").notNull(),
		key: text("storage_key").notNull().unique(),
		bucketName: text("bucket_name"),
		contentType: text("content_type").notNull(),
		kind: fileKindEnum("kind").notNull(),
		size: bigint("size", { mode: "number" }).notNull(),
		visibility: fileVisibilityEnum("visibility").notNull(),
		status: fileStatusEnum("status").default("draft").notNull(),
		metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("files_user_id_idx").on(table.userId),
		index("files_status_idx").on(table.status),
		index("files_visibility_idx").on(table.visibility),
		index("files_kind_idx").on(table.kind),
	],
);

export const fileUploadSessions = pgTable(
	"file_upload_sessions",
	{
		id: text("id").primaryKey(),
		fileId: text("file_id")
			.notNull()
			.references(() => files.id, { onDelete: "cascade" }),
		userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
		protocol: fileUploadProtocolEnum("protocol").notNull(),
		status: fileUploadSessionStatusEnum("status").default("active").notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("file_upload_sessions_file_id_idx").on(table.fileId),
		index("file_upload_sessions_user_id_idx").on(table.userId),
		index("file_upload_sessions_status_idx").on(table.status),
	],
);

export const fileUploadParts = pgTable(
	"file_upload_parts",
	{
		id: text("id").primaryKey(),
		sessionId: text("session_id")
			.notNull()
			.references(() => fileUploadSessions.id, { onDelete: "cascade" }),
		fileId: text("file_id")
			.notNull()
			.references(() => files.id, { onDelete: "cascade" }),
		partNumber: integer("part_number").notNull(),
		size: bigint("size", { mode: "number" }).notNull(),
		etag: text("etag"),
		checksum: text("checksum"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("file_upload_parts_file_id_idx").on(table.fileId),
		uniqueIndex("file_upload_parts_session_part_idx").on(table.sessionId, table.partNumber),
	],
);

export const fileVariants = pgTable(
	"file_variants",
	{
		id: text("id").primaryKey(),
		fileId: text("file_id")
			.notNull()
			.references(() => files.id, { onDelete: "cascade" }),
		kind: text("kind").notNull(),
		key: text("storage_key").notNull().unique(),
		bucketName: text("bucket_name"),
		contentType: text("content_type").notNull(),
		size: bigint("size", { mode: "number" }).notNull(),
		width: integer("width"),
		height: integer("height"),
		metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
		status: fileStatusEnum("status").default("draft").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("file_variants_file_id_idx").on(table.fileId),
		index("file_variants_status_idx").on(table.status),
	],
);

export const fileArtifactGroups = pgTable(
	"file_artifact_groups",
	{
		id: text("id").primaryKey(),
		fileId: text("file_id")
			.notNull()
			.references(() => files.id, { onDelete: "cascade" }),
		kind: fileArtifactGroupKindEnum("kind").notNull(),
		storagePrefix: text("storage_prefix").notNull(),
		bucketName: text("bucket_name"),
		visibility: fileVisibilityEnum("visibility").notNull(),
		status: fileStatusEnum("status").default("draft").notNull(),
		revision: integer("revision").default(1).notNull(),
		metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("file_artifact_groups_file_id_idx").on(table.fileId),
		index("file_artifact_groups_kind_idx").on(table.kind),
		index("file_artifact_groups_status_idx").on(table.status),
		uniqueIndex("file_artifact_groups_file_kind_revision_idx").on(
			table.fileId,
			table.kind,
			table.revision,
		),
	],
);

export const fileArtifacts = pgTable(
	"file_artifacts",
	{
		id: text("id").primaryKey(),
		groupId: text("group_id")
			.notNull()
			.references(() => fileArtifactGroups.id, { onDelete: "cascade" }),
		fileId: text("file_id")
			.notNull()
			.references(() => files.id, { onDelete: "cascade" }),
		kind: fileArtifactKindEnum("kind").notNull(),
		key: text("storage_key").notNull().unique(),
		bucketName: text("bucket_name"),
		contentType: text("content_type").notNull(),
		size: bigint("size", { mode: "number" }).notNull(),
		width: integer("width"),
		height: integer("height"),
		durationMs: integer("duration_ms"),
		renditionLabel: text("rendition_label"),
		sortOrder: integer("sort_order").default(0).notNull(),
		metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
		status: fileStatusEnum("status").default("draft").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("file_artifacts_group_id_idx").on(table.groupId),
		index("file_artifacts_file_id_idx").on(table.fileId),
		index("file_artifacts_kind_idx").on(table.kind),
		index("file_artifacts_status_idx").on(table.status),
	],
);

export const filePlaybackSessions = pgTable(
	"file_playback_sessions",
	{
		id: text("id").primaryKey(),
		fileId: text("file_id")
			.notNull()
			.references(() => files.id, { onDelete: "cascade" }),
		artifactGroupId: text("artifact_group_id")
			.notNull()
			.references(() => fileArtifactGroups.id, { onDelete: "cascade" }),
		subjectUserId: text("subject_user_id").references(() => user.id, { onDelete: "set null" }),
		token: text("token").notNull().unique(),
		protectionMode: fileHlsProtectionModeEnum("protection_mode").notNull(),
		status: filePlaybackSessionStatusEnum("status").default("active").notNull(),
		issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("file_playback_sessions_file_id_idx").on(table.fileId),
		index("file_playback_sessions_artifact_group_id_idx").on(table.artifactGroupId),
		index("file_playback_sessions_subject_user_id_idx").on(table.subjectUserId),
		index("file_playback_sessions_status_idx").on(table.status),
		index("file_playback_sessions_expires_at_idx").on(table.expiresAt),
	],
);

export const fileCaptionTracks = pgTable(
	"file_caption_tracks",
	{
		id: text("id").primaryKey(),
		fileId: text("file_id")
			.notNull()
			.references(() => files.id, { onDelete: "cascade" }),
		artifactGroupId: text("artifact_group_id").references(() => fileArtifactGroups.id, {
			onDelete: "set null",
		}),
		kind: fileCaptionTrackKindEnum("kind").default("captions").notNull(),
		language: text("language").notNull(),
		label: text("label").notNull(),
		key: text("storage_key").notNull().unique(),
		bucketName: text("bucket_name"),
		contentType: text("content_type").default("text/vtt").notNull(),
		metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
		status: fileStatusEnum("status").default("draft").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("file_caption_tracks_file_id_idx").on(table.fileId),
		index("file_caption_tracks_artifact_group_id_idx").on(table.artifactGroupId),
		index("file_caption_tracks_language_idx").on(table.language),
		index("file_caption_tracks_status_idx").on(table.status),
	],
);

export const filePlaybackEvents = pgTable(
	"file_playback_events",
	{
		id: text("id").primaryKey(),
		fileId: text("file_id")
			.notNull()
			.references(() => files.id, { onDelete: "cascade" }),
		artifactGroupId: text("artifact_group_id").references(() => fileArtifactGroups.id, {
			onDelete: "set null",
		}),
		playbackSessionId: text("playback_session_id").references(() => filePlaybackSessions.id, {
			onDelete: "set null",
		}),
		subjectUserId: text("subject_user_id").references(() => user.id, { onDelete: "set null" }),
		eventKind: filePlaybackEventKindEnum("event_kind").notNull(),
		positionSeconds: doublePrecision("position_seconds"),
		durationSeconds: doublePrecision("duration_seconds"),
		bufferedSeconds: doublePrecision("buffered_seconds"),
		renditionLabel: text("rendition_label"),
		metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
		occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("file_playback_events_file_id_idx").on(table.fileId),
		index("file_playback_events_artifact_group_id_idx").on(table.artifactGroupId),
		index("file_playback_events_playback_session_id_idx").on(table.playbackSessionId),
		index("file_playback_events_subject_user_id_idx").on(table.subjectUserId),
		index("file_playback_events_event_kind_idx").on(table.eventKind),
		index("file_playback_events_occurred_at_idx").on(table.occurredAt),
	],
);

export const fileProcessingJobs = pgTable(
	"file_processing_jobs",
	{
		id: text("id").primaryKey(),
		fileId: text("file_id")
			.notNull()
			.references(() => files.id, { onDelete: "cascade" }),
		kind: text("kind").notNull(),
		status: fileProcessingJobStatusEnum("status").default("queued").notNull(),
		attempts: integer("attempts").default(0).notNull(),
		input: jsonb("input").$type<Record<string, unknown> | null>(),
		output: jsonb("output").$type<Record<string, unknown> | null>(),
		error: jsonb("error").$type<Record<string, unknown> | null>(),
		runAfter: timestamp("run_after", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("file_processing_jobs_file_id_idx").on(table.fileId),
		index("file_processing_jobs_status_idx").on(table.status),
		index("file_processing_jobs_run_after_idx").on(table.runAfter),
	],
);

export const courses = pgTable(
	"courses",
	{
		id: text("id").primaryKey(),
		ownerUserId: text("owner_user_id").references(() => user.id, { onDelete: "set null" }),
		slug: text("slug").notNull().unique(),
		title: text("title").notNull(),
		description: text("description"),
		status: courseStatusEnum("status").default("draft").notNull(),
		metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("courses_owner_user_id_idx").on(table.ownerUserId),
		index("courses_status_idx").on(table.status),
	],
);

export const courseChapters = pgTable(
	"course_chapters",
	{
		id: text("id").primaryKey(),
		courseId: text("course_id")
			.notNull()
			.references(() => courses.id, { onDelete: "cascade" }),
		slug: text("slug").notNull(),
		title: text("title").notNull(),
		position: integer("position").notNull(),
		metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("course_chapters_course_id_idx").on(table.courseId),
		uniqueIndex("course_chapters_course_slug_idx").on(table.courseId, table.slug),
		uniqueIndex("course_chapters_course_position_idx").on(table.courseId, table.position),
	],
);

export const courseLessons = pgTable(
	"course_lessons",
	{
		id: text("id").primaryKey(),
		courseId: text("course_id")
			.notNull()
			.references(() => courses.id, { onDelete: "cascade" }),
		chapterId: text("chapter_id")
			.notNull()
			.references(() => courseChapters.id, { onDelete: "cascade" }),
		slug: text("slug").notNull(),
		title: text("title").notNull(),
		position: integer("position").notNull(),
		visibility: courseLessonVisibilityEnum("visibility").default("enrolled").notNull(),
		metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("course_lessons_course_id_idx").on(table.courseId),
		index("course_lessons_chapter_id_idx").on(table.chapterId),
		index("course_lessons_visibility_idx").on(table.visibility),
		uniqueIndex("course_lessons_chapter_slug_idx").on(table.chapterId, table.slug),
		uniqueIndex("course_lessons_chapter_position_idx").on(table.chapterId, table.position),
	],
);

export const courseVideoAssets = pgTable(
	"course_video_assets",
	{
		id: text("id").primaryKey(),
		courseId: text("course_id")
			.notNull()
			.references(() => courses.id, { onDelete: "cascade" }),
		lessonId: text("lesson_id")
			.notNull()
			.references(() => courseLessons.id, { onDelete: "cascade" }),
		fileId: text("file_id")
			.notNull()
			.references(() => files.id, { onDelete: "cascade" }),
		artifactGroupId: text("artifact_group_id").references(() => fileArtifactGroups.id, {
			onDelete: "set null",
		}),
		status: fileStatusEnum("status").default("draft").notNull(),
		metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("course_video_assets_course_id_idx").on(table.courseId),
		index("course_video_assets_file_id_idx").on(table.fileId),
		index("course_video_assets_artifact_group_id_idx").on(table.artifactGroupId),
		uniqueIndex("course_video_assets_lesson_id_idx").on(table.lessonId),
	],
);

export const courseEnrollments = pgTable(
	"course_enrollments",
	{
		id: text("id").primaryKey(),
		courseId: text("course_id")
			.notNull()
			.references(() => courses.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		status: courseEnrollmentStatusEnum("status").default("active").notNull(),
		metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("course_enrollments_course_id_idx").on(table.courseId),
		index("course_enrollments_user_id_idx").on(table.userId),
		index("course_enrollments_status_idx").on(table.status),
		uniqueIndex("course_enrollments_course_user_idx").on(table.courseId, table.userId),
	],
);

export const filesRelations = relations(files, ({ many, one }) => ({
	artifactGroups: many(fileArtifactGroups),
	artifacts: many(fileArtifacts),
	captionTracks: many(fileCaptionTracks),
	jobs: many(fileProcessingJobs),
	parts: many(fileUploadParts),
	playbackEvents: many(filePlaybackEvents),
	playbackSessions: many(filePlaybackSessions),
	sessions: many(fileUploadSessions),
	user: one(user, {
		fields: [files.userId],
		references: [user.id],
	}),
	variants: many(fileVariants),
	videoAssets: many(courseVideoAssets),
}));

export const fileUploadSessionsRelations = relations(fileUploadSessions, ({ many, one }) => ({
	file: one(files, {
		fields: [fileUploadSessions.fileId],
		references: [files.id],
	}),
	parts: many(fileUploadParts),
	user: one(user, {
		fields: [fileUploadSessions.userId],
		references: [user.id],
	}),
}));

export const fileUploadPartsRelations = relations(fileUploadParts, ({ one }) => ({
	file: one(files, {
		fields: [fileUploadParts.fileId],
		references: [files.id],
	}),
	session: one(fileUploadSessions, {
		fields: [fileUploadParts.sessionId],
		references: [fileUploadSessions.id],
	}),
}));

export const fileVariantsRelations = relations(fileVariants, ({ one }) => ({
	file: one(files, {
		fields: [fileVariants.fileId],
		references: [files.id],
	}),
}));

export const fileArtifactGroupsRelations = relations(fileArtifactGroups, ({ many, one }) => ({
	artifacts: many(fileArtifacts),
	captionTracks: many(fileCaptionTracks),
	file: one(files, {
		fields: [fileArtifactGroups.fileId],
		references: [files.id],
	}),
	playbackEvents: many(filePlaybackEvents),
	playbackSessions: many(filePlaybackSessions),
	videoAssets: many(courseVideoAssets),
}));

export const fileArtifactsRelations = relations(fileArtifacts, ({ one }) => ({
	file: one(files, {
		fields: [fileArtifacts.fileId],
		references: [files.id],
	}),
	group: one(fileArtifactGroups, {
		fields: [fileArtifacts.groupId],
		references: [fileArtifactGroups.id],
	}),
}));

export const filePlaybackSessionsRelations = relations(filePlaybackSessions, ({ many, one }) => ({
	artifactGroup: one(fileArtifactGroups, {
		fields: [filePlaybackSessions.artifactGroupId],
		references: [fileArtifactGroups.id],
	}),
	events: many(filePlaybackEvents),
	file: one(files, {
		fields: [filePlaybackSessions.fileId],
		references: [files.id],
	}),
	subject: one(user, {
		fields: [filePlaybackSessions.subjectUserId],
		references: [user.id],
	}),
}));

export const fileCaptionTracksRelations = relations(fileCaptionTracks, ({ one }) => ({
	artifactGroup: one(fileArtifactGroups, {
		fields: [fileCaptionTracks.artifactGroupId],
		references: [fileArtifactGroups.id],
	}),
	file: one(files, {
		fields: [fileCaptionTracks.fileId],
		references: [files.id],
	}),
}));

export const filePlaybackEventsRelations = relations(filePlaybackEvents, ({ one }) => ({
	artifactGroup: one(fileArtifactGroups, {
		fields: [filePlaybackEvents.artifactGroupId],
		references: [fileArtifactGroups.id],
	}),
	file: one(files, {
		fields: [filePlaybackEvents.fileId],
		references: [files.id],
	}),
	playbackSession: one(filePlaybackSessions, {
		fields: [filePlaybackEvents.playbackSessionId],
		references: [filePlaybackSessions.id],
	}),
	subject: one(user, {
		fields: [filePlaybackEvents.subjectUserId],
		references: [user.id],
	}),
}));

export const fileProcessingJobsRelations = relations(fileProcessingJobs, ({ one }) => ({
	file: one(files, {
		fields: [fileProcessingJobs.fileId],
		references: [files.id],
	}),
}));

export const coursesRelations = relations(courses, ({ many, one }) => ({
	chapters: many(courseChapters),
	enrollments: many(courseEnrollments),
	lessons: many(courseLessons),
	owner: one(user, {
		fields: [courses.ownerUserId],
		references: [user.id],
	}),
	videoAssets: many(courseVideoAssets),
}));

export const courseChaptersRelations = relations(courseChapters, ({ many, one }) => ({
	course: one(courses, {
		fields: [courseChapters.courseId],
		references: [courses.id],
	}),
	lessons: many(courseLessons),
}));

export const courseLessonsRelations = relations(courseLessons, ({ many, one }) => ({
	chapter: one(courseChapters, {
		fields: [courseLessons.chapterId],
		references: [courseChapters.id],
	}),
	course: one(courses, {
		fields: [courseLessons.courseId],
		references: [courses.id],
	}),
	videoAssets: many(courseVideoAssets),
}));

export const courseVideoAssetsRelations = relations(courseVideoAssets, ({ one }) => ({
	artifactGroup: one(fileArtifactGroups, {
		fields: [courseVideoAssets.artifactGroupId],
		references: [fileArtifactGroups.id],
	}),
	course: one(courses, {
		fields: [courseVideoAssets.courseId],
		references: [courses.id],
	}),
	file: one(files, {
		fields: [courseVideoAssets.fileId],
		references: [files.id],
	}),
	lesson: one(courseLessons, {
		fields: [courseVideoAssets.lessonId],
		references: [courseLessons.id],
	}),
}));

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one }) => ({
	course: one(courses, {
		fields: [courseEnrollments.courseId],
		references: [courses.id],
	}),
	user: one(user, {
		fields: [courseEnrollments.userId],
		references: [user.id],
	}),
}));
