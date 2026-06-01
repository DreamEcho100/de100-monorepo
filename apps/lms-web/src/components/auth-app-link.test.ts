import { describe, expect, it } from "vitest";

import { resolveAuthAppLinkPreloadMode } from "./auth-app-link";

describe("resolveAuthAppLinkPreloadMode", () => {
	it("disables preload when auth conditions are not met", () => {
		expect(resolveAuthAppLinkPreloadMode({ canPrefetch: false })).toBe("false");
		expect(
			resolveAuthAppLinkPreloadMode({
				canPrefetch: false,
				unauthorizedPreload: "false",
			}),
		).toBe("false");
	});

	it("uses authorized preload mode when auth conditions are met", () => {
		expect(resolveAuthAppLinkPreloadMode({ canPrefetch: true })).toBe("intent");
		expect(
			resolveAuthAppLinkPreloadMode({
				authorizedPreload: "intent",
				canPrefetch: true,
			}),
		).toBe("intent");
	});
});
