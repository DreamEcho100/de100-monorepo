import type { FileRecord } from "@de100/files-shared";

import type { FilesEntitlementAdapter, FilesRequestContext } from "./operations";

export type CanReadFileInput<TAppContext = unknown> = {
	adapter?: FilesEntitlementAdapter<TAppContext>;
	context: FilesRequestContext<TAppContext>;
	file: FileRecord;
};

export type CanReadCourseLessonInput<TAppContext = unknown> = {
	adapter?: FilesEntitlementAdapter<TAppContext>;
	context: FilesRequestContext<TAppContext>;
	courseId: string;
	lessonId: string;
	preview: boolean;
};

export async function canReadFileWithEntitlements<TAppContext = unknown>(
	input: CanReadFileInput<TAppContext>,
) {
	if (canReadFileByDefault(input.file, input.context)) {
		return true;
	}

	return (await input.adapter?.canReadFile(input)) ?? false;
}

export async function canReadCourseLessonWithEntitlements<TAppContext = unknown>(
	input: CanReadCourseLessonInput<TAppContext>,
) {
	if (input.preview) {
		return true;
	}

	return (
		(await input.adapter?.canReadCourseLesson?.({
			context: input.context,
			courseId: input.courseId,
			lessonId: input.lessonId,
			preview: input.preview,
		})) ?? false
	);
}

export function canReadFileByDefault<TAppContext>(
	file: FileRecord,
	context: FilesRequestContext<TAppContext>,
) {
	if (file.deletedAt !== null) {
		return false;
	}

	if (file.visibility === "public" && file.status === "ready") {
		return true;
	}

	if (context.auth.role === "admin") {
		return true;
	}

	return context.auth.userId !== null && file.userId === context.auth.userId;
}
