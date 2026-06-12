import { describe, expect, it } from "vitest";

import { getAuthErrorTranslationKey, localizeAuthError } from "./auth-errors";

describe("Better Auth error localization", () => {
	it("maps known Better Auth codes from Better Fetch error contexts", () => {
		const error = {
			error: {
				code: "INVALID_EMAIL_OR_PASSWORD",
				message: "Invalid email or password",
				status: 401,
				statusText: "Unauthorized",
			},
		};
		const t = (key: string) => `translated:${key}`;

		expect(getAuthErrorTranslationKey(error)).toBe("errors.auth.invalidEmailOrPassword");
		expect(localizeAuthError(error, t)).toBe("translated:errors.auth.invalidEmailOrPassword");
	});

	it("maps raw Better Auth error codes directly", () => {
		const t = (key: string) => `translated:${key}`;

		expect(localizeAuthError("EMAIL_NOT_VERIFIED", t)).toBe(
			"translated:errors.auth.emailNotVerified",
		);
	});

	it("falls back to localized validation keys", () => {
		const t = (key: string) => `translated:${key}`;

		expect(localizeAuthError("validation.invalidEmail", t)).toBe(
			"translated:validation.invalidEmail",
		);
	});

	it("falls back to raw messages for unknown errors", () => {
		const t = (key: string) => `translated:${key}`;

		expect(localizeAuthError(new Error("Something unexpected happened"), t)).toBe(
			"Something unexpected happened",
		);
	});
});
