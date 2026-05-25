import type {
	AuthValidationErrorKey,
	MediaValidationErrorKey,
} from "@de100/apps-lms-validators/shared";
import {
	authValidationErrorKeys,
	mediaValidationErrorKeys,
} from "@de100/apps-lms-validators/shared";

type KnownValidationErrorKey = AuthValidationErrorKey | MediaValidationErrorKey;

const knownValidationErrorKeys = new Set<string>([
	...Object.values(authValidationErrorKeys),
	...Object.values(mediaValidationErrorKeys),
]);

export function localizeValidationError(error: unknown, t: (key: string) => string) {
	if (typeof error !== "string") {
		return undefined;
	}

	if (knownValidationErrorKeys.has(error)) {
		return t(error as KnownValidationErrorKey);
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
