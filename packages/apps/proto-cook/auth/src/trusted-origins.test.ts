import { describe, expect, it } from "vitest";

import type { TrustedOriginsEnvironment } from "./trusted-origins";
import { getTrustedOrigins, isLocalDevelopmentOrigin } from "./trusted-origins";

const baseEnv: TrustedOriginsEnvironment = {
	APP_PROTO_COOK_BETTER_AUTH_URL: "https://auth.budget-tracker.test/login",
	APP_PROTO_COOK_CORS_ORIGIN: "https://app.budget-tracker.test",
	NODE_ENV: "production",
};

describe("isLocalDevelopmentOrigin", () => {
	it("accepts local http origins", () => {
		expect(isLocalDevelopmentOrigin("http://localhost:3000")).toBe(true);
		expect(isLocalDevelopmentOrigin("http://127.0.0.1:5173")).toBe(true);
	});

	it("rejects malformed, remote, and https origins", () => {
		expect(isLocalDevelopmentOrigin("not-a-url")).toBe(false);
		expect(isLocalDevelopmentOrigin("http://example.com")).toBe(false);
		expect(isLocalDevelopmentOrigin("https://localhost:3000")).toBe(false);
	});
});

describe("getTrustedOrigins", () => {
	it("returns configured origins in production", () => {
		expect(getTrustedOrigins(baseEnv)).toEqual([
			"https://app.budget-tracker.test",
			"https://auth.budget-tracker.test",
		]);
	});

	it("adds the local request origin during development", () => {
		const request = {
			headers: new Headers({ origin: "http://localhost:3000" }),
		};

		expect(getTrustedOrigins({ ...baseEnv, NODE_ENV: "development" }, request)).toEqual([
			"https://app.budget-tracker.test",
			"https://auth.budget-tracker.test",
			"http://localhost:3000",
		]);
	});

	it("ignores non-local request origins during development", () => {
		const request = {
			headers: new Headers({ origin: "https://example.com" }),
		};

		expect(getTrustedOrigins({ ...baseEnv, NODE_ENV: "development" }, request)).toEqual([
			"https://app.budget-tracker.test",
			"https://auth.budget-tracker.test",
		]);
	});
});
