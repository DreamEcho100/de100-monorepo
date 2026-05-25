import { appErrorCodes, mediaValidationErrorKeys } from "@de100/apps-lms-validators/shared";
import { ORPCError } from "@orpc/client";
import { describe, expect, it } from "vitest";

import { getOrpcErrorTranslationKey, localizeOrpcError } from "./orpc-errors";

describe("oRPC error localization", () => {
	it("maps known app error codes from error data to translation keys", () => {
		const error = new ORPCError("NOT_FOUND", {
			data: { code: appErrorCodes.todo.notFound },
			defined: true,
			message: appErrorCodes.todo.notFound,
		});
		const t = (key: string) => `translated:${key}`;

		expect(getOrpcErrorTranslationKey(error)).toBe("errors.todo.notFound");
		expect(localizeOrpcError(error, t)).toBe("translated:errors.todo.notFound");
	});

	it("falls back to the raw message for unknown errors", () => {
		const t = (key: string) => `translated:${key}`;

		expect(localizeOrpcError(new Error("Server said no"), t)).toBe("Server said no");
	});

	it("maps media app error codes from error data to translation keys", () => {
		const error = new ORPCError("NOT_FOUND", {
			data: { code: appErrorCodes.media.notFound },
			defined: true,
			message: appErrorCodes.media.notFound,
		});
		const t = (key: string) => `translated:${key}`;

		expect(getOrpcErrorTranslationKey(error)).toBe("media.status.notFound");
		expect(localizeOrpcError(error, t)).toBe("translated:media.status.notFound");
	});

	it("falls back to localized validation messages", () => {
		const error = new ORPCError("BAD_REQUEST", {
			message: mediaValidationErrorKeys.expectedFileUpload,
		});
		const t = (key: string) => `translated:${key}`;

		expect(localizeOrpcError(error, t)).toBe("translated:validation.expectedFileUpload");
	});
});
