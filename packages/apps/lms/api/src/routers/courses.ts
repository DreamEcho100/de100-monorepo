import type { DbInstance } from "@de100/apps-lms-db";
import { isSignedHlsPlaybackSessionUsable } from "@de100/files-server/hls-playback";
import { createFilesHlsPlaybackSource } from "@de100/files-server/hls-playback-source";
import { createFilesPlaybackEvent, recordFilesPlaybackEvent } from "@de100/files-server/telemetry";
import {
	fileRecordSchema,
	fileStatusSchema,
	filesPlaybackEventSchema,
	filesSignedHlsPlaybackSessionSchema,
	processingJobStatusSchema,
} from "@de100/files-shared";
import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import type { Context } from "../context";
import type { LmsCourseFilesRepository, LmsCourseRecord } from "../files-course";
import {
	attachLmsCourseVideoFile,
	canManageLmsCourse,
	createLmsCourseFilesRepository,
	createLmsCourseLessonPlaybackSession,
	lmsCourseEnrollmentStatusValues,
	lmsCourseLessonVisibilityValues,
	lmsCourseStatusValues,
} from "../files-course";
import { createLmsFilesRepositories } from "../files-repositories";
import { protectedProcedure, publicProcedure } from "../index";

const coursesRouterBasePath = "/courses";

const metadataSchema = z.record(z.string(), z.unknown()).nullable().optional();

const courseOutputSchema = z.object({
	createdAt: z.date(),
	deletedAt: z.date().nullable(),
	description: z.string().nullable(),
	id: z.string().min(1),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	ownerUserId: z.string().min(1).nullable(),
	slug: z.string().min(1),
	status: z.enum(lmsCourseStatusValues),
	title: z.string().min(1),
	updatedAt: z.date(),
});

const courseChapterOutputSchema = z.object({
	courseId: z.string().min(1),
	createdAt: z.date(),
	deletedAt: z.date().nullable(),
	id: z.string().min(1),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	position: z.number().int().nonnegative(),
	slug: z.string().min(1),
	title: z.string().min(1),
	updatedAt: z.date(),
});

const courseLessonOutputSchema = z.object({
	chapterId: z.string().min(1),
	courseId: z.string().min(1),
	createdAt: z.date(),
	deletedAt: z.date().nullable(),
	id: z.string().min(1),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	position: z.number().int().nonnegative(),
	slug: z.string().min(1),
	title: z.string().min(1),
	updatedAt: z.date(),
	visibility: z.enum(lmsCourseLessonVisibilityValues),
});

const courseVideoAssetOutputSchema = z.object({
	artifactGroupId: z.string().min(1).nullable(),
	courseId: z.string().min(1),
	createdAt: z.date(),
	fileId: z.string().min(1),
	id: z.string().min(1),
	lessonId: z.string().min(1),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	status: fileStatusSchema,
	updatedAt: z.date(),
});

const courseEnrollmentOutputSchema = z.object({
	courseId: z.string().min(1),
	createdAt: z.date(),
	id: z.string().min(1),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	status: z.enum(lmsCourseEnrollmentStatusValues),
	updatedAt: z.date(),
	userId: z.string().min(1),
});

const courseProcessingJobOutputSchema = z.object({
	attempts: z.number().int().nonnegative(),
	createdAt: z.date(),
	error: z.record(z.string(), z.unknown()).nullable(),
	fileId: z.string().min(1),
	id: z.string().min(1),
	input: z.record(z.string(), z.unknown()).nullable(),
	kind: z.string().min(1),
	output: z.record(z.string(), z.unknown()).nullable(),
	runAfter: z.date().nullable(),
	status: processingJobStatusSchema,
	updatedAt: z.date(),
});

const courseAccessDecisionOutputSchema = z.object({
	allowed: z.boolean(),
	reason: z.enum([
		"admin",
		"asset-unavailable",
		"course-owner",
		"course-unpublished",
		"enrolled",
		"not-enrolled",
		"preview",
	]),
});

const coursePlaybackSourceOutputSchema = z.object({
	captionTracks: z.array(
		z.object({
			default: z.boolean(),
			kind: z.enum(["captions", "chapters", "descriptions", "metadata", "subtitles"]),
			label: z.string().min(1),
			language: z.string().min(1),
			src: z.string().min(1),
		}),
	),
	masterArtifactId: z.string().min(1),
	masterUrl: z.string().min(1),
	sessionId: z.string().min(1),
	token: z.string().min(1),
});

const createCourseInputSchema = z.object({
	description: z.string().nullable().optional(),
	metadata: metadataSchema,
	slug: z.string().min(1),
	status: z.enum(lmsCourseStatusValues).optional(),
	title: z.string().min(1),
});

const createChapterInputSchema = z.object({
	courseSlug: z.string().min(1),
	metadata: metadataSchema,
	position: z.number().int().nonnegative(),
	slug: z.string().min(1),
	title: z.string().min(1),
});

const createLessonInputSchema = z.object({
	chapterSlug: z.string().min(1),
	courseSlug: z.string().min(1),
	metadata: metadataSchema,
	position: z.number().int().nonnegative(),
	slug: z.string().min(1),
	title: z.string().min(1),
	visibility: z.enum(lmsCourseLessonVisibilityValues).optional(),
});

const courseSlugInputSchema = z.object({
	courseSlug: z.string().min(1),
	metadata: metadataSchema,
	status: z.enum(lmsCourseEnrollmentStatusValues).optional(),
});

const lessonSlugInputSchema = z.object({
	chapterSlug: z.string().min(1),
	courseSlug: z.string().min(1),
	lessonSlug: z.string().min(1),
});

const attachLessonVideoInputSchema = lessonSlugInputSchema.extend({
	fileId: z.string().min(1),
	metadata: metadataSchema,
});

const playbackSessionInputSchema = lessonSlugInputSchema.extend({
	expiresInSeconds: z.number().int().positive().optional(),
});

const recordPlaybackEventInputSchema = z.object({
	bufferedSeconds: z.number().nonnegative().nullable().optional(),
	durationSeconds: z.number().nonnegative().nullable().optional(),
	eventKind: filesPlaybackEventSchema.shape.eventKind,
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	positionSeconds: z.number().nonnegative().nullable().optional(),
	renditionLabel: z.string().min(1).nullable().optional(),
	token: z.string().min(1),
});

export const coursesRouter = {
	attachLessonVideo: protectedProcedure
		.input(attachLessonVideoInputSchema)
		.output(
			z.object({
				asset: courseVideoAssetOutputSchema,
				file: fileRecordSchema,
				job: courseProcessingJobOutputSchema.nullable(),
			}),
		)
		.route({
			method: "POST",
			path: `${coursesRouterBasePath}/{courseSlug}/{chapterSlug}/{lessonSlug}/video`,
			summary: "Attach an uploaded video file to a course lesson and queue HLS processing",
			tags: ["Courses", "Files"],
		})
		.handler(async ({ context, input }) => {
			const repository = createLmsCourseFilesRepository(context.db);
			const accessContext = await repository.getLessonAccessContext({
				chapterSlug: input.chapterSlug,
				courseSlug: input.courseSlug,
				lessonSlug: input.lessonSlug,
				userId: context.session.user.id,
			});
			const resolvedAccessContext = requireCourseAccessContext(accessContext);
			const course = resolvedAccessContext.course;
			requireCanManageCourse({
				course,
				userId: context.session.user.id,
			});

			return attachLmsCourseVideoFile({
				auth: { userId: context.session.user.id },
				courseId: resolvedAccessContext.course.id,
				fileId: input.fileId,
				files: createLmsFilesRepositories(context.db),
				lessonId: resolvedAccessContext.lesson.id,
				metadata: input.metadata,
				repository,
			});
		}),

	createChapter: protectedProcedure
		.input(createChapterInputSchema)
		.output(courseChapterOutputSchema)
		.route({
			method: "POST",
			path: `${coursesRouterBasePath}/{courseSlug}/chapters`,
			summary: "Create a chapter owned by the signed-in course owner",
			tags: ["Courses"],
		})
		.handler(async ({ context, input }) => {
			const repository = createLmsCourseFilesRepository(context.db);
			const course = await requireCourseBySlug(repository, input.courseSlug);
			requireCanManageCourse({
				course,
				userId: context.session.user.id,
			});

			return repository.createChapter({
				courseId: course.id,
				metadata: input.metadata,
				position: input.position,
				slug: input.slug,
				title: input.title,
			});
		}),

	createCourse: protectedProcedure
		.input(createCourseInputSchema)
		.output(courseOutputSchema)
		.route({
			method: "POST",
			path: coursesRouterBasePath,
			summary: "Create an LMS course owned by the signed-in user",
			tags: ["Courses"],
		})
		.handler(({ context, input }) => {
			const repository = createLmsCourseFilesRepository(context.db);

			return repository.createCourse({
				description: input.description,
				metadata: input.metadata,
				ownerUserId: context.session.user.id,
				slug: input.slug,
				status: input.status,
				title: input.title,
			});
		}),

	createLesson: protectedProcedure
		.input(createLessonInputSchema)
		.output(courseLessonOutputSchema)
		.route({
			method: "POST",
			path: `${coursesRouterBasePath}/{courseSlug}/{chapterSlug}/lessons`,
			summary: "Create a lesson owned by the signed-in course owner",
			tags: ["Courses"],
		})
		.handler(async ({ context, input }) => {
			const repository = createLmsCourseFilesRepository(context.db);
			const course = await requireCourseBySlug(repository, input.courseSlug);
			requireCanManageCourse({
				course,
				userId: context.session.user.id,
			});
			const chapter = await repository.getChapterBySlugs({
				chapterSlug: input.chapterSlug,
				courseSlug: input.courseSlug,
			});
			if (!chapter) {
				throw new ORPCError("NOT_FOUND");
			}

			return repository.createLesson({
				chapterId: chapter.id,
				courseId: course.id,
				metadata: input.metadata,
				position: input.position,
				slug: input.slug,
				title: input.title,
				visibility: input.visibility,
			});
		}),

	createPlaybackSession: publicProcedure
		.input(playbackSessionInputSchema)
		.output(
			z.object({
				decision: courseAccessDecisionOutputSchema,
				playback: coursePlaybackSourceOutputSchema.nullable(),
				session: filesSignedHlsPlaybackSessionSchema.nullable(),
			}),
		)
		.route({
			method: "POST",
			path: `${coursesRouterBasePath}/{courseSlug}/{chapterSlug}/{lessonSlug}/playback-session`,
			summary: "Create a signed HLS playback session for a readable course lesson",
			tags: ["Courses", "Files"],
		})
		.handler(async ({ context, input }) => {
			const request = requireRequest(context);
			const repository = createLmsCourseFilesRepository(context.db);
			const userId = context.session?.user.id ?? null;
			const accessContext = await repository.getLessonAccessContext({
				chapterSlug: input.chapterSlug,
				courseSlug: input.courseSlug,
				lessonSlug: input.lessonSlug,
				userId,
			});
			const resolvedAccessContext = requireCourseAccessContext(accessContext);
			const files = createLmsFilesRepositories(context.db);

			const result = await createLmsCourseLessonPlaybackSession({
				accessContext: resolvedAccessContext,
				auth: { userId },
				expiresInSeconds: input.expiresInSeconds,
				files,
				requestContext: {
					app: { db: context.db },
					auth: { userId },
					request,
				},
			});
			const artifactGroupId = result.session?.artifactGroupId;
			const artifactGroup = artifactGroupId
				? await files.artifacts?.groups.getGroup(artifactGroupId)
				: null;
			const artifacts = artifactGroup
				? await files.artifacts?.items.listArtifacts(artifactGroup.id)
				: [];

			return {
				...result,
				playback:
					result.session && artifactGroup
						? createFilesHlsPlaybackSource({
								artifactGroup,
								artifacts: artifacts ?? [],
								session: result.session,
							})
						: null,
			};
		}),

	enrollCurrentUser: protectedProcedure
		.input(courseSlugInputSchema)
		.output(courseEnrollmentOutputSchema)
		.route({
			method: "POST",
			path: `${coursesRouterBasePath}/{courseSlug}/enrollments/me`,
			summary: "Enroll the signed-in user in a published course",
			tags: ["Courses"],
		})
		.handler(async ({ context, input }) => {
			const repository = createLmsCourseFilesRepository(context.db);
			const course = await requireCourseBySlug(repository, input.courseSlug);
			const canManage = canManageLmsCourse({
				courseOwnerUserId: course.ownerUserId,
				userId: context.session.user.id,
			});
			if (course.status !== "published" && !canManage) {
				throw new ORPCError("FORBIDDEN");
			}

			return repository.enrollUser({
				courseId: course.id,
				metadata: input.metadata,
				status: input.status,
				userId: context.session.user.id,
			});
		}),

	recordPlaybackEvent: publicProcedure
		.input(recordPlaybackEventInputSchema)
		.output(filesPlaybackEventSchema)
		.route({
			method: "POST",
			path: `${coursesRouterBasePath}/playback-events`,
			summary: "Record a course-video playback QoE event for a signed HLS session",
			tags: ["Courses", "Files"],
		})
		.handler(async ({ context, input }) => {
			const files = createLmsFilesRepositories(context.db);
			const session = await files.artifacts?.playbackSessions?.getSessionByToken(input.token);
			if (!session || !isSignedHlsPlaybackSessionUsable(session)) {
				throw new ORPCError("NOT_FOUND");
			}

			const event = createFilesPlaybackEvent({
				artifactGroupId: session.artifactGroupId,
				bufferedSeconds: input.bufferedSeconds ?? null,
				durationSeconds: input.durationSeconds ?? null,
				eventKind: input.eventKind,
				fileId: session.fileId,
				metadata: input.metadata ?? null,
				playbackSessionId: session.id,
				positionSeconds: input.positionSeconds ?? null,
				renditionLabel: input.renditionLabel ?? null,
				subjectId: session.subjectId,
			});
			await recordFilesPlaybackEvent({
				event,
				repository: files.artifacts?.playbackEvents,
			});

			return event;
		}),
};

async function requireCourseBySlug(repository: LmsCourseFilesRepository, slug: string) {
	const course = await repository.getCourseBySlug(slug);
	if (!course) {
		throw new ORPCError("NOT_FOUND");
	}

	return course;
}

function requireCourseAccessContext<T>(accessContext: T | null): T {
	if (!accessContext) {
		throw new ORPCError("NOT_FOUND");
	}

	return accessContext;
}

function requireCanManageCourse(input: { course: LmsCourseRecord; userId: string }) {
	if (
		!canManageLmsCourse({
			courseOwnerUserId: input.course.ownerUserId,
			userId: input.userId,
		})
	) {
		throw new ORPCError("FORBIDDEN");
	}
}

function requireRequest(context: Context & { db: DbInstance }) {
	if (!context.request) {
		throw new ORPCError("INTERNAL_SERVER_ERROR");
	}

	return context.request;
}
