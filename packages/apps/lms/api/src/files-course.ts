import type { DbInstance } from "@de100/apps-lms-db";
import {
	courseChapters,
	courseEnrollments,
	courseLessons,
	courses,
	courseVideoAssets,
	fileArtifactGroups,
} from "@de100/apps-lms-db/schema/files";
import { canReadCourseLessonWithEntitlements } from "@de100/files-server/entitlements";
import { createSignedHlsPlaybackSession } from "@de100/files-server/hls-playback";
import type { FilesAuthContext, FilesRequestContext } from "@de100/files-server/operations";
import type { FileStatus } from "@de100/files-shared";
import { and, eq, isNull } from "drizzle-orm";

import type { LmsFilesRepositories } from "./files-repositories";

export const lmsCourseStatusValues = ["draft", "published", "archived"] as const;
export const lmsCourseLessonVisibilityValues = ["preview", "enrolled", "private"] as const;
export const lmsCourseEnrollmentStatusValues = ["active", "completed", "canceled"] as const;

export type LmsCourseStatus = (typeof lmsCourseStatusValues)[number];
export type LmsCourseLessonVisibility = (typeof lmsCourseLessonVisibilityValues)[number];
export type LmsCourseEnrollmentStatus = (typeof lmsCourseEnrollmentStatusValues)[number];

type LmsCourseRow = typeof courses.$inferSelect;
type LmsCourseChapterRow = typeof courseChapters.$inferSelect;
type LmsCourseLessonRow = typeof courseLessons.$inferSelect;
type LmsCourseVideoAssetRow = typeof courseVideoAssets.$inferSelect;
type LmsCourseEnrollmentRow = typeof courseEnrollments.$inferSelect;

export type LmsCourseRecord = {
	createdAt: Date;
	deletedAt: Date | null;
	description: string | null;
	id: string;
	metadata: Record<string, unknown> | null;
	ownerUserId: string | null;
	slug: string;
	status: LmsCourseStatus;
	title: string;
	updatedAt: Date;
};

export type LmsCourseChapterRecord = {
	courseId: string;
	createdAt: Date;
	deletedAt: Date | null;
	id: string;
	metadata: Record<string, unknown> | null;
	position: number;
	slug: string;
	title: string;
	updatedAt: Date;
};

export type LmsCourseLessonRecord = {
	chapterId: string;
	courseId: string;
	createdAt: Date;
	deletedAt: Date | null;
	id: string;
	metadata: Record<string, unknown> | null;
	position: number;
	slug: string;
	title: string;
	updatedAt: Date;
	visibility: LmsCourseLessonVisibility;
};

export type LmsCourseVideoAssetRecord = {
	artifactGroupId: string | null;
	courseId: string;
	createdAt: Date;
	fileId: string;
	id: string;
	lessonId: string;
	metadata: Record<string, unknown> | null;
	status: FileStatus;
	updatedAt: Date;
};

export type LmsCourseEnrollmentRecord = {
	courseId: string;
	createdAt: Date;
	id: string;
	metadata: Record<string, unknown> | null;
	status: LmsCourseEnrollmentStatus;
	updatedAt: Date;
	userId: string;
};

export type LmsCourseLessonAccessContext = {
	artifactGroupStatus: FileStatus | null;
	chapter: LmsCourseChapterRecord;
	course: LmsCourseRecord;
	enrollment: LmsCourseEnrollmentRecord | null;
	lesson: LmsCourseLessonRecord;
	videoAsset: LmsCourseVideoAssetRecord | null;
};

export type LmsCourseLessonAccessDecision = {
	allowed: boolean;
	reason:
		| "admin"
		| "course-owner"
		| "course-unpublished"
		| "enrolled"
		| "asset-unavailable"
		| "not-enrolled"
		| "preview";
};

export type LmsCourseFilesRepository = {
	attachVideoAsset(input: {
		artifactGroupId?: string | null;
		courseId: string;
		fileId: string;
		lessonId: string;
		metadata?: Record<string, unknown> | null;
		status: FileStatus;
	}): Promise<LmsCourseVideoAssetRecord>;
	createChapter(input: {
		courseId: string;
		metadata?: Record<string, unknown> | null;
		position: number;
		slug: string;
		title: string;
	}): Promise<LmsCourseChapterRecord>;
	createCourse(input: {
		description?: string | null;
		metadata?: Record<string, unknown> | null;
		ownerUserId?: string | null;
		slug: string;
		status?: LmsCourseStatus;
		title: string;
	}): Promise<LmsCourseRecord>;
	createLesson(input: {
		chapterId: string;
		courseId: string;
		metadata?: Record<string, unknown> | null;
		position: number;
		slug: string;
		title: string;
		visibility?: LmsCourseLessonVisibility;
	}): Promise<LmsCourseLessonRecord>;
	enrollUser(input: {
		courseId: string;
		metadata?: Record<string, unknown> | null;
		status?: LmsCourseEnrollmentStatus;
		userId: string;
	}): Promise<LmsCourseEnrollmentRecord>;
	getChapterBySlugs(input: {
		chapterSlug: string;
		courseSlug: string;
	}): Promise<LmsCourseChapterRecord | null>;
	getCourseBySlug(slug: string): Promise<LmsCourseRecord | null>;
	getLessonAccessContext(input: {
		chapterSlug: string;
		courseSlug: string;
		lessonSlug: string;
		userId: string | null;
	}): Promise<LmsCourseLessonAccessContext | null>;
	updateVideoAssetArtifactGroup(input: {
		artifactGroupId: string;
		id: string;
		status: FileStatus;
	}): Promise<LmsCourseVideoAssetRecord | null>;
};

export function createLmsCourseFilesRepository(db: DbInstance): LmsCourseFilesRepository {
	return {
		async attachVideoAsset(input) {
			const timestamp = new Date();
			const id = crypto.randomUUID();
			const [asset] = await db
				.insert(courseVideoAssets)
				.values({
					artifactGroupId: input.artifactGroupId ?? null,
					courseId: input.courseId,
					createdAt: timestamp,
					fileId: input.fileId,
					id,
					lessonId: input.lessonId,
					metadata: input.metadata ?? null,
					status: input.status,
					updatedAt: timestamp,
				})
				.onConflictDoUpdate({
					set: {
						artifactGroupId: input.artifactGroupId ?? null,
						fileId: input.fileId,
						metadata: input.metadata ?? null,
						status: input.status,
						updatedAt: timestamp,
					},
					target: courseVideoAssets.lessonId,
				})
				.returning();

			if (!asset) {
				throw new Error("Failed to attach course video asset.");
			}

			return serializeLmsCourseVideoAssetRecord(asset);
		},
		async createChapter(input) {
			const timestamp = new Date();
			const [chapter] = await db
				.insert(courseChapters)
				.values({
					courseId: input.courseId,
					createdAt: timestamp,
					id: crypto.randomUUID(),
					metadata: input.metadata ?? null,
					position: input.position,
					slug: input.slug,
					title: input.title,
					updatedAt: timestamp,
				})
				.returning();

			if (!chapter) {
				throw new Error("Failed to create course chapter.");
			}

			return serializeLmsCourseChapterRecord(chapter);
		},
		async createCourse(input) {
			const timestamp = new Date();
			const [course] = await db
				.insert(courses)
				.values({
					createdAt: timestamp,
					description: input.description ?? null,
					id: crypto.randomUUID(),
					metadata: input.metadata ?? null,
					ownerUserId: input.ownerUserId ?? null,
					slug: input.slug,
					status: input.status ?? "draft",
					title: input.title,
					updatedAt: timestamp,
				})
				.returning();

			if (!course) {
				throw new Error("Failed to create course.");
			}

			return serializeLmsCourseRecord(course);
		},
		async createLesson(input) {
			const timestamp = new Date();
			const [lesson] = await db
				.insert(courseLessons)
				.values({
					chapterId: input.chapterId,
					courseId: input.courseId,
					createdAt: timestamp,
					id: crypto.randomUUID(),
					metadata: input.metadata ?? null,
					position: input.position,
					slug: input.slug,
					title: input.title,
					updatedAt: timestamp,
					visibility: input.visibility ?? "enrolled",
				})
				.returning();

			if (!lesson) {
				throw new Error("Failed to create course lesson.");
			}

			return serializeLmsCourseLessonRecord(lesson);
		},
		async enrollUser(input) {
			const timestamp = new Date();
			const [enrollment] = await db
				.insert(courseEnrollments)
				.values({
					courseId: input.courseId,
					createdAt: timestamp,
					id: crypto.randomUUID(),
					metadata: input.metadata ?? null,
					status: input.status ?? "active",
					updatedAt: timestamp,
					userId: input.userId,
				})
				.onConflictDoUpdate({
					set: {
						metadata: input.metadata ?? null,
						status: input.status ?? "active",
						updatedAt: timestamp,
					},
					target: [courseEnrollments.courseId, courseEnrollments.userId],
				})
				.returning();

			if (!enrollment) {
				throw new Error("Failed to create course enrollment.");
			}

			return serializeLmsCourseEnrollmentRecord(enrollment);
		},
		async getChapterBySlugs(input) {
			const [row] = await db
				.select({ chapter: courseChapters })
				.from(courseChapters)
				.innerJoin(courses, eq(courseChapters.courseId, courses.id))
				.where(
					and(
						eq(courses.slug, input.courseSlug),
						eq(courseChapters.slug, input.chapterSlug),
						isNull(courses.deletedAt),
						isNull(courseChapters.deletedAt),
					),
				)
				.limit(1);

			return row ? serializeLmsCourseChapterRecord(row.chapter) : null;
		},
		async getCourseBySlug(slug) {
			const [course] = await db
				.select()
				.from(courses)
				.where(and(eq(courses.slug, slug), isNull(courses.deletedAt)))
				.limit(1);

			return course ? serializeLmsCourseRecord(course) : null;
		},
		async getLessonAccessContext(input) {
			const [row] = await db
				.select({
					artifactGroupStatus: fileArtifactGroups.status,
					asset: courseVideoAssets,
					chapter: courseChapters,
					course: courses,
					enrollment: courseEnrollments,
					lesson: courseLessons,
				})
				.from(courseLessons)
				.innerJoin(courseChapters, eq(courseLessons.chapterId, courseChapters.id))
				.innerJoin(courses, eq(courseLessons.courseId, courses.id))
				.leftJoin(courseVideoAssets, eq(courseVideoAssets.lessonId, courseLessons.id))
				.leftJoin(fileArtifactGroups, eq(fileArtifactGroups.id, courseVideoAssets.artifactGroupId))
				.leftJoin(
					courseEnrollments,
					and(
						eq(courseEnrollments.courseId, courses.id),
						input.userId
							? eq(courseEnrollments.userId, input.userId)
							: isNull(courseEnrollments.userId),
					),
				)
				.where(
					and(
						eq(courses.slug, input.courseSlug),
						eq(courseChapters.slug, input.chapterSlug),
						eq(courseLessons.slug, input.lessonSlug),
						isNull(courses.deletedAt),
						isNull(courseChapters.deletedAt),
						isNull(courseLessons.deletedAt),
					),
				)
				.limit(1);

			return row
				? {
						artifactGroupStatus: row.artifactGroupStatus,
						chapter: serializeLmsCourseChapterRecord(row.chapter),
						course: serializeLmsCourseRecord(row.course),
						enrollment: row.enrollment ? serializeLmsCourseEnrollmentRecord(row.enrollment) : null,
						lesson: serializeLmsCourseLessonRecord(row.lesson),
						videoAsset: row.asset ? serializeLmsCourseVideoAssetRecord(row.asset) : null,
					}
				: null;
		},
		async updateVideoAssetArtifactGroup(input) {
			const [asset] = await db
				.update(courseVideoAssets)
				.set({
					artifactGroupId: input.artifactGroupId,
					status: input.status,
					updatedAt: new Date(),
				})
				.where(eq(courseVideoAssets.id, input.id))
				.returning();

			return asset ? serializeLmsCourseVideoAssetRecord(asset) : null;
		},
	};
}

export async function attachLmsCourseVideoFile(input: {
	auth: FilesAuthContext;
	courseId: string;
	fileId: string;
	files: LmsFilesRepositories;
	lessonId: string;
	metadata?: Record<string, unknown> | null;
	repository: Pick<LmsCourseFilesRepository, "attachVideoAsset">;
}) {
	const file = await input.files.files.getFile(input.fileId, input.auth);
	if (!file || file.deletedAt !== null) {
		throw new Error("Course video source file was not found.");
	}

	if (file.kind !== "video") {
		throw new Error("Course video source file must be a video.");
	}

	const status = selectLmsCourseVideoAssetStatus(file.status);
	const asset = await input.repository.attachVideoAsset({
		courseId: input.courseId,
		fileId: file.id,
		lessonId: input.lessonId,
		metadata: input.metadata,
		status,
	});
	const job = shouldQueueLmsCourseVideoProcessing(file.status)
		? await input.files.jobs.createJob({
				fileId: file.id,
				id: crypto.randomUUID(),
				input: {
					courseId: input.courseId,
					lessonId: input.lessonId,
					videoAssetId: asset.id,
				},
				kind: "video-hls",
				status: "queued",
			})
		: null;

	return {
		asset,
		file,
		job,
	};
}

export async function createLmsCourseLessonPlaybackSession(input: {
	accessContext: LmsCourseLessonAccessContext;
	auth: FilesAuthContext;
	expiresInSeconds?: number;
	files: LmsFilesRepositories;
	requestContext: FilesRequestContext<{ db: DbInstance }>;
}) {
	const decision = await canReadLmsCourseLesson(input.accessContext, input.requestContext);
	if (!decision.allowed || !input.accessContext.videoAsset?.artifactGroupId) {
		return {
			decision: decision.allowed
				? ({
						allowed: false,
						reason: "asset-unavailable",
					} satisfies LmsCourseLessonAccessDecision)
				: decision,
			session: null,
		};
	}

	if (
		input.accessContext.videoAsset.status !== "ready" ||
		input.accessContext.artifactGroupStatus !== "ready"
	) {
		return {
			decision: {
				allowed: false,
				reason: "asset-unavailable" as const,
			},
			session: null,
		};
	}

	const now = new Date();
	const session = createSignedHlsPlaybackSession({
		artifactGroupId: input.accessContext.videoAsset.artifactGroupId,
		expiresAt: new Date(now.getTime() + (input.expiresInSeconds ?? 3600) * 1000),
		fileId: input.accessContext.videoAsset.fileId,
		issuedAt: now,
		metadata: {
			chapterId: input.accessContext.chapter.id,
			courseId: input.accessContext.course.id,
			lessonId: input.accessContext.lesson.id,
		},
		subjectId: input.auth.userId,
	});

	await input.files.artifacts?.playbackSessions?.createSession(session);

	return {
		decision,
		session,
	};
}

export async function canReadLmsCourseLesson(
	accessContext: LmsCourseLessonAccessContext,
	requestContext: FilesRequestContext<{ db: DbInstance }>,
): Promise<LmsCourseLessonAccessDecision> {
	const decision = resolveLmsCourseLessonAccess({
		courseOwnerUserId: accessContext.course.ownerUserId,
		courseStatus: accessContext.course.status,
		enrollmentStatus: accessContext.enrollment?.status ?? null,
		lessonVisibility: accessContext.lesson.visibility,
		role: requestContext.auth.role,
		userId: requestContext.auth.userId,
	});

	if (!decision.allowed) {
		return decision;
	}

	const entitled = await canReadCourseLessonWithEntitlements({
		adapter: {
			canReadCourseLesson: () => true,
			canReadFile: () => false,
		},
		context: requestContext,
		courseId: accessContext.course.id,
		lessonId: accessContext.lesson.id,
		preview: accessContext.lesson.visibility === "preview",
	});

	return entitled ? decision : { allowed: false, reason: "not-enrolled" };
}

export function resolveLmsCourseLessonAccess(input: {
	courseOwnerUserId: string | null;
	courseStatus: LmsCourseStatus;
	enrollmentStatus: LmsCourseEnrollmentStatus | null;
	lessonVisibility: LmsCourseLessonVisibility;
	role?: string;
	userId: string | null;
}): LmsCourseLessonAccessDecision {
	const isAdmin = input.role === "admin";
	const isOwner = Boolean(input.userId && input.userId === input.courseOwnerUserId);
	const isPublished = input.courseStatus === "published";

	if (isAdmin) {
		return { allowed: true, reason: "admin" };
	}

	if (isOwner) {
		return { allowed: true, reason: "course-owner" };
	}

	if (!isPublished) {
		return { allowed: false, reason: "course-unpublished" };
	}

	if (input.lessonVisibility === "preview") {
		return { allowed: true, reason: "preview" };
	}

	if (input.enrollmentStatus === "active" || input.enrollmentStatus === "completed") {
		return { allowed: true, reason: "enrolled" };
	}

	return { allowed: false, reason: "not-enrolled" };
}

export function canManageLmsCourse(input: {
	courseOwnerUserId: string | null;
	role?: string;
	userId: string | null;
}) {
	return (
		input.role === "admin" || Boolean(input.userId && input.userId === input.courseOwnerUserId)
	);
}

export function selectLmsCourseVideoAssetStatus(fileStatus: FileStatus): FileStatus {
	switch (fileStatus) {
		case "stored":
		case "processing":
		case "ready":
			return "processing";
		case "failed":
		case "deleted":
			return "failed";
		case "draft":
		case "uploading":
			return "draft";
	}
}

export function shouldQueueLmsCourseVideoProcessing(fileStatus: FileStatus) {
	return fileStatus === "stored" || fileStatus === "ready";
}

export function serializeLmsCourseRecord(row: LmsCourseRow): LmsCourseRecord {
	return {
		createdAt: row.createdAt,
		deletedAt: row.deletedAt,
		description: row.description,
		id: row.id,
		metadata: row.metadata,
		ownerUserId: row.ownerUserId,
		slug: row.slug,
		status: row.status,
		title: row.title,
		updatedAt: row.updatedAt,
	};
}

export function serializeLmsCourseChapterRecord(row: LmsCourseChapterRow): LmsCourseChapterRecord {
	return {
		courseId: row.courseId,
		createdAt: row.createdAt,
		deletedAt: row.deletedAt,
		id: row.id,
		metadata: row.metadata,
		position: row.position,
		slug: row.slug,
		title: row.title,
		updatedAt: row.updatedAt,
	};
}

export function serializeLmsCourseLessonRecord(row: LmsCourseLessonRow): LmsCourseLessonRecord {
	return {
		chapterId: row.chapterId,
		courseId: row.courseId,
		createdAt: row.createdAt,
		deletedAt: row.deletedAt,
		id: row.id,
		metadata: row.metadata,
		position: row.position,
		slug: row.slug,
		title: row.title,
		updatedAt: row.updatedAt,
		visibility: row.visibility,
	};
}

export function serializeLmsCourseVideoAssetRecord(
	row: LmsCourseVideoAssetRow,
): LmsCourseVideoAssetRecord {
	return {
		artifactGroupId: row.artifactGroupId,
		courseId: row.courseId,
		createdAt: row.createdAt,
		fileId: row.fileId,
		id: row.id,
		lessonId: row.lessonId,
		metadata: row.metadata,
		status: row.status,
		updatedAt: row.updatedAt,
	};
}

export function serializeLmsCourseEnrollmentRecord(
	row: LmsCourseEnrollmentRow,
): LmsCourseEnrollmentRecord {
	return {
		courseId: row.courseId,
		createdAt: row.createdAt,
		id: row.id,
		metadata: row.metadata,
		status: row.status,
		updatedAt: row.updatedAt,
		userId: row.userId,
	};
}
