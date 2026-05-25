import type { AuthValidationErrorKey } from "@de100/apps-lms-validators/shared";
import { authValidationErrorKeys } from "@de100/apps-lms-validators/shared";

const knownValidationErrorKeys = new Set<string>(Object.values(authValidationErrorKeys));

export function localizeValidationError(error: unknown, t: (key: string) => string) {
	if (typeof error !== "string") {
		return undefined;
	}

	if (knownValidationErrorKeys.has(error)) {
		return t(error as AuthValidationErrorKey);
	}

	return error;
}

export function localizeValidationErrors(
	errors: readonly unknown[] | undefined,
	t: (key: string) => string,
) {
	return (errors ?? [])
		.map((error) => localizeValidationError(error, t))
		.filter((error): error is string => typeof error === "string")
		.map((message) => ({ message }));
}
