import type { DbInstance } from "@de100/apps-lms-db";
import type { FilesRequestContext } from "@de100/files-server/operations";
import type { FileRecord, FilesArtifactGroupRecord } from "@de100/files-shared";
import { describe, expect, it, vi } from "vitest";

import {
	attachLmsCourseVideoFile,
	canManageLmsCourse,
	createLmsCourseLessonPlaybackSession,
	resolveLmsCourseLessonAccess,
	selectLmsCourseVideoAssetStatus,
	serializeLmsCourseChapterRecord,
	serializeLmsCourseEnrollmentRecord,
	serializeLmsCourseLessonRecord,
	serializeLmsCourseRecord,
	serializeLmsCourseVideoAssetRecord,
	shouldQueueLmsCourseVideoProcessing,
} from "./files-course";
import type { LmsFilesRepositories } from "./files-repositories";

const now = new Date("2026-06-02T08:00:00.000Z");

describe("LMS course files policy", () => {
	it("resolves preview, enrollment, owner, admin, and unpublished access", () => {
		expect(
			resolveLmsCourseLessonAccess({
				courseOwnerUserId: "owner_1",
				courseStatus: "published",
				enrollmentStatus: null,
				lessonVisibility: "preview",
				userId: null,
			}),
		).toEqual({ allowed: true, reason: "preview" });

		expect(
			resolveLmsCourseLessonAccess({
				courseOwnerUserId: "owner_1",
				courseStatus: "published",
				enrollmentStatus: "active",
				lessonVisibility: "private",
				userId: "student_1",
			}),
		).toEqual({ allowed: true, reason: "enrolled" });

		expect(
			resolveLmsCourseLessonAccess({
				courseOwnerUserId: "owner_1",
				courseStatus: "draft",
				enrollmentStatus: null,
				lessonVisibility: "private",
				userId: "owner_1",
			}),
		).toEqual({ allowed: true, reason: "course-owner" });

		expect(
			resolveLmsCourseLessonAccess({
				courseOwnerUserId: "owner_1",
				courseStatus: "draft",
				enrollmentStatus: null,
				lessonVisibility: "private",
				role: "admin",
				userId: "admin_1",
			}),
		).toEqual({ allowed: true, reason: "admin" });

		expect(
			resolveLmsCourseLessonAccess({
				courseOwnerUserId: "owner_1",
				courseStatus: "draft",
				enrollmentStatus: "active",
				lessonVisibility: "preview",
				userId: "student_1",
			}),
		).toEqual({ allowed: false, reason: "course-unpublished" });

		expect(
			resolveLmsCourseLessonAccess({
				courseOwnerUserId: "owner_1",
				courseStatus: "published",
				enrollmentStatus: "canceled",
				lessonVisibility: "private",
				userId: "student_1",
			}),
		).toEqual({ allowed: false, reason: "not-enrolled" });
	});

	it("limits course management to admins and course owners", () => {
		expect(
			canManageLmsCourse({
				courseOwnerUserId: "owner_1",
				userId: "owner_1",
			}),
		).toBe(true);

		expect(
			canManageLmsCourse({
				courseOwnerUserId: "owner_1",
				role: "admin",
				userId: "admin_1",
			}),
		).toBe(true);

		expect(
			canManageLmsCourse({
				courseOwnerUserId: "owner_1",
				userId: "student_1",
			}),
		).toBe(false);
	});

	it("maps uploaded file status to course video asset processing decisions", () => {
		expect(selectLmsCourseVideoAssetStatus("stored")).toBe("processing");
		expect(selectLmsCourseVideoAssetStatus("ready")).toBe("processing");
		expect(selectLmsCourseVideoAssetStatus("draft")).toBe("draft");
		expect(selectLmsCourseVideoAssetStatus("deleted")).toBe("failed");
		expect(shouldQueueLmsCourseVideoProcessing("stored")).toBe(true);
		expect(shouldQueueLmsCourseVideoProcessing("ready")).toBe(true);
		expect(shouldQueueLmsCourseVideoProcessing("draft")).toBe(false);
	});
});

describe("LMS course files workflows", () => {
	it("attaches stored video files to lessons and queues HLS processing", async () => {
		const file = createFileRecord({ kind: "video", status: "stored" });
		const attachVideoAsset = vi.fn(async (input) => ({
			artifactGroupId: null,
			courseId: input.courseId,
			createdAt: now,
			fileId: input.fileId,
			id: "asset_1",
			lessonId: input.lessonId,
			metadata: input.metadata ?? null,
			status: input.status,
			updatedAt: now,
		}));
		const files = createFakeFilesRepositories(file);

		await expect(
			attachLmsCourseVideoFile({
				auth: { userId: "owner_1" },
				courseId: "course_1",
				fileId: file.id,
				files,
				lessonId: "lesson_1",
				metadata: { routeSlug: "lesson-video" },
				repository: { attachVideoAsset },
			}),
		).resolves.toMatchObject({
			asset: {
				fileId: file.id,
				status: "processing",
			},
			job: {
				fileId: file.id,
				kind: "video-hls",
				status: "queued",
			},
		});
		expect(attachVideoAsset).toHaveBeenCalledWith(
			expect.objectContaining({
				courseId: "course_1",
				fileId: file.id,
				lessonId: "lesson_1",
				status: "processing",
			}),
		);
	});

	it("rejects non-video files for course video assets", async () => {
		const file = createFileRecord({ kind: "image", status: "stored" });

		await expect(
			attachLmsCourseVideoFile({
				auth: { userId: "owner_1" },
				courseId: "course_1",
				fileId: file.id,
				files: createFakeFilesRepositories(file),
				lessonId: "lesson_1",
				repository: {
					async attachVideoAsset() {
						throw new Error("not used");
					},
				},
			}),
		).rejects.toThrow("must be a video");
	});

	it("creates signed HLS playback sessions only for entitled ready assets", async () => {
		const playbackSessions = {
			createSession: vi.fn(async (session) => session),
			getSessionByToken: vi.fn(),
			updateSessionStatus: vi.fn(),
		};
		const files = createFakeFilesRepositories(createFileRecord({ kind: "video", status: "ready" }));
		const groups = {
			createGroup: vi.fn(),
			getGroup: vi.fn(async () => createArtifactGroupRecord()),
			listGroups: vi.fn(),
			updateGroupStatus: vi.fn(),
		};
		files.artifacts = {
			groups,
			items: files.artifacts?.items,
			playbackSessions,
		} as LmsFilesRepositories["artifacts"];

		await expect(
			createLmsCourseLessonPlaybackSession({
				accessContext: createAccessContext({
					artifactGroupStatus: "ready",
					enrollmentStatus: "active",
					videoAssetStatus: "ready",
				}),
				auth: { userId: "student_1" },
				files,
				requestContext: createRequestContext({ userId: "student_1" }),
			}),
		).resolves.toMatchObject({
			decision: { allowed: true, reason: "enrolled" },
			session: {
				artifactGroupId: "group_1",
				fileId: "file_1",
				protectionMode: "signed-session",
				status: "active",
				subjectId: "student_1",
			},
		});
		expect(playbackSessions.createSession).toHaveBeenCalledOnce();
		expect(groups.getGroup).toHaveBeenCalledWith("group_1");

		await expect(
			createLmsCourseLessonPlaybackSession({
				accessContext: createAccessContext({
					artifactGroupStatus: "ready",
					enrollmentStatus: null,
					videoAssetStatus: "ready",
				}),
				auth: { userId: "student_2" },
				files,
				requestContext: createRequestContext({ userId: "student_2" }),
			}),
		).resolves.toMatchObject({
			decision: { allowed: false, reason: "not-enrolled" },
			session: null,
		});
	});

	it("uses encrypted artifact-group metadata for AES HLS playback sessions", async () => {
		const playbackSessions = {
			createSession: vi.fn(async (session) => session),
			getSessionByToken: vi.fn(),
			updateSessionStatus: vi.fn(),
		};
		const files = createFakeFilesRepositories(createFileRecord({ kind: "video", status: "ready" }));
		files.artifacts = {
			groups: {
				createGroup: vi.fn(),
				getGroup: vi.fn(async () =>
					createArtifactGroupRecord({
						kind: "hls-encrypted",
						metadata: { protectionMode: "aes-128" },
					}),
				),
				listGroups: vi.fn(),
				updateGroupStatus: vi.fn(),
			},
			items: files.artifacts?.items,
			playbackSessions,
		} as LmsFilesRepositories["artifacts"];

		await expect(
			createLmsCourseLessonPlaybackSession({
				accessContext: createAccessContext({
					artifactGroupStatus: "ready",
					enrollmentStatus: "active",
					videoAssetStatus: "ready",
				}),
				auth: { userId: "student_1" },
				files,
				requestContext: createRequestContext({ userId: "student_1" }),
			}),
		).resolves.toMatchObject({
			session: {
				artifactGroupId: "group_1",
				protectionMode: "aes-128",
			},
		});
		expect(playbackSessions.createSession).toHaveBeenCalledWith(
			expect.objectContaining({
				protectionMode: "aes-128",
			}),
		);
	});
});

describe("LMS course files serializers", () => {
	it("serializes course, lesson, asset, and enrollment rows", () => {
		expect(
			serializeLmsCourseRecord({
				createdAt: now,
				deletedAt: null,
				description: "Desc",
				id: "course_1",
				metadata: { level: "intro" },
				ownerUserId: "owner_1",
				slug: "course",
				status: "published",
				title: "Course",
				updatedAt: now,
			}),
		).toMatchObject({
			id: "course_1",
			slug: "course",
			status: "published",
		});

		expect(
			serializeLmsCourseChapterRecord({
				courseId: "course_1",
				createdAt: now,
				deletedAt: null,
				id: "chapter_1",
				metadata: null,
				position: 1,
				slug: "intro",
				title: "Intro",
				updatedAt: now,
			}),
		).toMatchObject({ courseId: "course_1", position: 1 });

		expect(
			serializeLmsCourseLessonRecord({
				chapterId: "chapter_1",
				courseId: "course_1",
				createdAt: now,
				deletedAt: null,
				id: "lesson_1",
				metadata: null,
				position: 1,
				slug: "welcome",
				title: "Welcome",
				updatedAt: now,
				visibility: "preview",
			}),
		).toMatchObject({ id: "lesson_1", visibility: "preview" });

		expect(
			serializeLmsCourseVideoAssetRecord({
				artifactGroupId: "group_1",
				courseId: "course_1",
				createdAt: now,
				fileId: "file_1",
				id: "asset_1",
				lessonId: "lesson_1",
				metadata: null,
				status: "ready",
				updatedAt: now,
			}),
		).toMatchObject({ artifactGroupId: "group_1", status: "ready" });

		expect(
			serializeLmsCourseEnrollmentRecord({
				courseId: "course_1",
				createdAt: now,
				id: "enrollment_1",
				metadata: null,
				status: "active",
				updatedAt: now,
				userId: "student_1",
			}),
		).toMatchObject({ status: "active", userId: "student_1" });
	});
});

function createFileRecord(input: Pick<FileRecord, "kind" | "status">): FileRecord {
	return {
		accessUrl: null,
		bucketName: "private-files",
		contentType: input.kind === "video" ? "video/mp4" : "image/png",
		createdAt: now,
		deletedAt: null,
		fileName: input.kind === "video" ? "lesson.mp4" : "image.png",
		id: "file_1",
		key: "user_1/file",
		kind: input.kind,
		metadata: null,
		size: 1024,
		status: input.status,
		updatedAt: now,
		userId: "owner_1",
		visibility: "private",
	};
}

function createArtifactGroupRecord(
	input: Partial<Pick<FilesArtifactGroupRecord, "kind" | "metadata" | "status">> = {},
): FilesArtifactGroupRecord {
	return {
		bucketName: "private-files",
		createdAt: now,
		deletedAt: null,
		fileId: "file_1",
		id: "group_1",
		kind: input.kind ?? "hls",
		metadata: input.metadata ?? { protectionMode: "signed-session" },
		revision: 1,
		status: input.status ?? "ready",
		storagePrefix: "courses/course_1/lesson_1/hls",
		updatedAt: now,
		visibility: "private",
	};
}

function createFakeFilesRepositories(file: FileRecord): LmsFilesRepositories {
	return {
		artifacts: {
			groups: {
				createGroup: vi.fn(),
				getGroup: vi.fn(),
				listGroups: vi.fn(),
				updateGroupStatus: vi.fn(),
			},
			items: {
				createArtifact: vi.fn(),
				listArtifacts: vi.fn(),
				updateArtifactStatus: vi.fn(),
			},
		},
		files: {
			createFile: vi.fn(),
			deleteFile: vi.fn(),
			getFile: vi.fn(async () => file),
			getFileByKey: vi.fn(),
			listFiles: vi.fn(),
			updateFileStatus: vi.fn(),
		},
		jobs: {
			createJob: vi.fn(async (input) => ({
				attempts: input.attempts ?? 0,
				createdAt: now,
				error: input.error ?? null,
				fileId: input.fileId,
				id: input.id,
				input: input.input ?? null,
				kind: input.kind,
				output: input.output ?? null,
				runAfter: input.runAfter ?? null,
				status: input.status,
				updatedAt: now,
			})),
			getJob: vi.fn(),
			updateJob: vi.fn(),
			updateJobStatus: vi.fn(),
		},
		parts: {
			createPart: vi.fn(),
			listParts: vi.fn(),
		},
		sessions: {
			createSession: vi.fn(),
			getSession: vi.fn(),
			updateSessionStatus: vi.fn(),
		},
		variants: {
			createVariant: vi.fn(),
			listVariants: vi.fn(),
			updateVariantStatus: vi.fn(),
		},
	};
}

function createRequestContext(input: {
	role?: string;
	userId: string | null;
}): FilesRequestContext<{ db: DbInstance }> {
	return {
		app: { db: {} as DbInstance },
		auth: {
			role: input.role,
			userId: input.userId,
		},
		request: new Request("https://app.test/api/files") as unknown as Request,
	};
}

function createAccessContext(input: {
	artifactGroupStatus: FileRecord["status"] | null;
	enrollmentStatus: "active" | "completed" | "canceled" | null;
	videoAssetStatus: FileRecord["status"];
}) {
	return {
		artifactGroupStatus: input.artifactGroupStatus,
		chapter: {
			courseId: "course_1",
			createdAt: now,
			deletedAt: null,
			id: "chapter_1",
			metadata: null,
			position: 1,
			slug: "intro",
			title: "Intro",
			updatedAt: now,
		},
		course: {
			createdAt: now,
			deletedAt: null,
			description: null,
			id: "course_1",
			metadata: null,
			ownerUserId: "owner_1",
			slug: "course",
			status: "published" as const,
			title: "Course",
			updatedAt: now,
		},
		enrollment: input.enrollmentStatus
			? {
					courseId: "course_1",
					createdAt: now,
					id: "enrollment_1",
					metadata: null,
					status: input.enrollmentStatus,
					updatedAt: now,
					userId: "student_1",
				}
			: null,
		lesson: {
			chapterId: "chapter_1",
			courseId: "course_1",
			createdAt: now,
			deletedAt: null,
			id: "lesson_1",
			metadata: null,
			position: 1,
			slug: "lesson",
			title: "Lesson",
			updatedAt: now,
			visibility: "private" as const,
		},
		videoAsset: {
			artifactGroupId: "group_1",
			courseId: "course_1",
			createdAt: now,
			fileId: "file_1",
			id: "asset_1",
			lessonId: "lesson_1",
			metadata: null,
			status: input.videoAssetStatus,
			updatedAt: now,
		},
	};
}
