import { describe, expect, it } from "vitest";

import { createRequestI18nSnapshot } from "./index";

const locales = [
	{
		code: "en",
		dir: "ltr",
		label: "English",
		messages: { common: { hello: "Hello" } },
	},
	{
		code: "ar",
		dir: "rtl",
		label: "Arabic",
		messages: { common: { hello: "Marhaban" } },
	},
] as const;

describe("createRequestI18nSnapshot", () => {
	it("supports caller-owned cookie names and theme defaults", () => {
		const request = new Request("https://example.dev", {
			headers: {
				cookie: "app_locale=ar; app_theme=system",
			},
		});

		const snapshot = createRequestI18nSnapshot({
			defaultLocale: "en",
			defaultResolvedTheme: "dark",
			defaultThemePreference: "light",
			localeCookieName: "app_locale",
			locales,
			request,
			themeCookieName: "app_theme",
		});

		expect(snapshot).toEqual({
			dir: "rtl",
			locale: "ar",
			resolvedTheme: "dark",
			themePreference: "system",
		});
	});

	it("falls back to caller-owned defaults when cookies are absent", () => {
		const snapshot = createRequestI18nSnapshot({
			defaultLocale: "en",
			defaultResolvedTheme: "dark",
			defaultThemePreference: "light",
			locales,
		});

		expect(snapshot).toEqual({
			dir: "ltr",
			locale: "en",
			resolvedTheme: "dark",
			themePreference: "light",
		});
	});
});
