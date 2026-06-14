import type { FileRecord } from "@de100/files-shared";

import type {
	FilesEntitlementAdapter,
	FilesEntitlementSubject,
	FilesRequestContext,
} from "./operations";

export type CanReadFileInput<TAppContext = unknown> = {
	adapter?: FilesEntitlementAdapter<TAppContext>;
	context: FilesRequestContext<TAppContext>;
	file: FileRecord;
};

export type CanReadFilesSubjectInput<TAppContext = unknown> = {
	adapter?: FilesEntitlementAdapter<TAppContext>;
	context: FilesRequestContext<TAppContext>;
	subject: FilesEntitlementSubject;
};

export async function canReadFileWithEntitlements<TAppContext = unknown>(
	input: CanReadFileInput<TAppContext>,
) {
	if (canReadFileByDefault(input.file, input.context)) {
		return true;
	}

	return (await input.adapter?.canReadFile(input)) ?? false;
}

export async function canReadFilesSubjectWithEntitlements<TAppContext = unknown>(
	input: CanReadFilesSubjectInput<TAppContext>,
) {
	if (input.subject.preview) {
		return true;
	}

	return (
		(await input.adapter?.canReadSubject?.({
			context: input.context,
			subject: input.subject,
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
