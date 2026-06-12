import { describe, expect, it } from "vitest";

import { getDefaultCookieAttributes } from "./cookie-attributes";

describe("getDefaultCookieAttributes", () => {
	it("uses local http-safe cookies during development for loopback origins", () => {
		expect(
			getDefaultCookieAttributes({
				APP_PROTO_COOK_BETTER_AUTH_URL: "http://127.0.0.1:3000/api/auth",
				APP_PROTO_COOK_CORS_ORIGIN: "http://127.0.0.1:3000",
				NODE_ENV: "development",
			}),
		).toEqual({
			httpOnly: true,
			sameSite: "lax",
			secure: false,
		});
	});

	it("keeps secure cross-site cookies for non-local or production environments", () => {
		expect(
			getDefaultCookieAttributes({
				APP_PROTO_COOK_BETTER_AUTH_URL: "https://app.example.com/api/auth",
				APP_PROTO_COOK_CORS_ORIGIN: "https://app.example.com",
				NODE_ENV: "production",
			}),
		).toEqual({
			httpOnly: true,
			sameSite: "none",
			secure: true,
		});
	});
});
