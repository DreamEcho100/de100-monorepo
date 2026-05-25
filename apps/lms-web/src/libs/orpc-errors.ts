import type { AppErrorCode, AppErrorTranslationKey } from "@de100/apps-lms-validators/shared";
import { appErrorTranslationKeys } from "@de100/apps-lms-validators/shared";
import { ORPCError } from "@orpc/client";

import { localizeValidationError } from "./validation-errors";

const knownAppErrorCodes = new Set<string>(Object.keys(appErrorTranslationKeys));

function isAppErrorCode(value: unknown): value is AppErrorCode {
	return typeof value === "string" && knownAppErrorCodes.has(value);
}

function getAppErrorCode(error: unknown) {
	if (!(error instanceof ORPCError)) {
		return undefined;
	}

	const data = error.data;
	if (
		typeof data === "object" &&
		data !== null &&
		"code" in data &&
		isAppErrorCode((data as { code?: unknown }).code)
	) {
		return (data as { code: AppErrorCode }).code;
	}

	if (isAppErrorCode(error.message)) {
		return error.message;
	}

	return undefined;
}

export function getOrpcErrorTranslationKey(error: unknown): AppErrorTranslationKey | undefined {
	const code = getAppErrorCode(error);

	return code ? appErrorTranslationKeys[code] : undefined;
}

export function localizeOrpcError(error: unknown, t: (key: string) => string) {
	const translationKey = getOrpcErrorTranslationKey(error);

	if (translationKey) {
		return t(translationKey);
	}

	if (error instanceof Error && error.message) {
		return localizeValidationError(error.message, t) ?? error.message;
	}

	return undefined;
}
