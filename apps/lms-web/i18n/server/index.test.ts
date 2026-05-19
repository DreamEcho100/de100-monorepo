import { describe, expect, it } from "vitest";

import { getServerI18nState } from ".";

describe("getServerI18nState", () => {
	it("prefers the locale segment in the URL over the locale cookie", () => {
		const request = new Request("https://example.com/ar/login", {
			headers: {
				cookie: "locale=en",
			},
		});

		const state = getServerI18nState(request);

		expect(state.activeLocale?.code).toBe("ar");
		expect(state.initialSnapshot.dir).toBe("rtl");
		expect(state.initialSnapshot.locale).toBe("ar");
	});

	it("falls back to the existing cookie/header resolution when the path is not localized", () => {
		const request = new Request("https://example.com/login", {
			headers: {
				"accept-language": "ar-SA,ar;q=0.9,en;q=0.8",
			},
		});

		const state = getServerI18nState(request);

		expect(state.activeLocale?.code).toBe("ar");
		expect(state.initialSnapshot.locale).toBe("ar");
	});
});
