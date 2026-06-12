import { ORPCError } from "@orpc/server";
import { describe, expect, it } from "vitest";

import type { Context } from "./context";
import { requireAuthenticatedSession } from "./index";

describe("requireAuthenticatedSession", () => {
	it("returns the session when a user is present", () => {
		const session = {
			user: {
				id: "user_123",
			},
		} as NonNullable<Context["session"]>;

		expect(requireAuthenticatedSession(session)).toBe(session);
	});

	it("throws an unauthorized error when the session is missing", () => {
		try {
			requireAuthenticatedSession(null);
		} catch (error) {
			expect(error).toBeInstanceOf(ORPCError);
			if (error instanceof ORPCError) {
				expect(error.code).toBe("UNAUTHORIZED");
				return;
			}

			throw error;
		}

		throw new Error("Expected requireAuthenticatedSession to throw.");
	});
});
