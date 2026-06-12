import { describe, expect, it } from "vitest";

import { normalizeAppLinkPreloadMode } from "./app-link";

describe("normalizeAppLinkPreloadMode", () => {
	it("defaults to intent when preload is undefined", () => {
		expect(normalizeAppLinkPreloadMode(undefined)).toBe("intent");
	});

	it('maps boolean false to preload="false"', () => {
		expect(normalizeAppLinkPreloadMode(false)).toBe("false");
	});

	it("preserves explicit preload mode values", () => {
		expect(normalizeAppLinkPreloadMode("intent")).toBe("intent");
		expect(normalizeAppLinkPreloadMode("false")).toBe("false");
	});
});
