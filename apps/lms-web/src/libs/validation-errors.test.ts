import {
	authValidationErrorKeys,
	mediaValidationErrorKeys,
} from "@de100/apps-lms-validators/shared";
import { describe, expect, it } from "vitest";

import { localizeValidationError, localizeValidationErrors } from "./validation-errors";

describe("validation error localization", () => {
	it("maps known validator error keys through the translator", () => {
		const t = (key: string) => `translated:${key}`;

		expect(localizeValidationError(authValidationErrorKeys.invalidEmail, t)).toBe(
			"translated:validation.invalidEmail",
		);
	});

	it("passes through unknown errors unchanged", () => {
		const t = (key: string) => `translated:${key}`;

		expect(localizeValidationError("Server said no", t)).toBe("Server said no");
	});

	it("maps media validator error keys through the translator", () => {
		const t = (key: string) => `translated:${key}`;

		expect(localizeValidationError(mediaValidationErrorKeys.expectedFileUpload, t)).toBe(
			"translated:validation.expectedFileUpload",
		);
	});

	it("maps arrays of field errors and drops non-string entries", () => {
		const t = (key: string) => `translated:${key}`;

		expect(
			localizeValidationErrors(
				[authValidationErrorKeys.passwordMinLength, "Server said no", null],
				t,
			),
		).toEqual([
			{ message: "translated:validation.passwordMinLength" },
			{ message: "Server said no" },
		]);
	});
});
