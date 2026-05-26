import { describe, expect, it } from "vitest";

import { authValidationErrorKeys } from "../shared/auth";
import { resetPasswordInputSchema, signInInputSchema, signUpInputSchema } from "./auth";

describe("auth validator schemas", () => {
	it("accepts valid sign in and sign up inputs", () => {
		expect(
			signInInputSchema.safeParse({
				email: "person@example.com",
				password: "verysecure",
			}).success,
		).toBe(true);

		expect(
			signUpInputSchema.safeParse({
				email: "person@example.com",
				name: "Person",
				password: "verysecure",
			}).success,
		).toBe(true);
	});

	it("returns configured validation keys for invalid payloads", () => {
		const invalid = signInInputSchema.safeParse({
			email: "bad-email",
			password: "short",
		});

		expect(invalid.success).toBe(false);
		if (invalid.success) {
			return;
		}

		const issues = invalid.error.issues.map((issue) => issue.message);
		expect(issues).toContain(authValidationErrorKeys.invalidEmail);
		expect(issues).toContain(authValidationErrorKeys.passwordMinLength);
	});

	it("enforces matching reset password fields", () => {
		const invalid = resetPasswordInputSchema.safeParse({
			confirmPassword: "mismatch",
			password: "verysecure",
		});

		expect(invalid.success).toBe(false);
		if (invalid.success) {
			return;
		}

		expect(invalid.error.issues[0]?.message).toBe(authValidationErrorKeys.passwordsDoNotMatch);
	});
});
