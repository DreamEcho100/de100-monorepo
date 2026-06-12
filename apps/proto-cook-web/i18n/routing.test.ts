import { describe, expect, it } from "vitest";

import {
	createLocalizedPath,
	isLocaleManagedPathname,
	resolvePreferredLocale,
	splitLocaleFromPathname,
} from "./routing";

describe("i18n routing helpers", () => {
	it("extracts a locale segment from localized paths", () => {
		expect(splitLocaleFromPathname("/ar/login")).toEqual({
			localeInPathname: "ar",
			pathnameWithoutLocale: "/login",
			pathnameWithoutLocaleSegments: ["login"],
		});

		expect(splitLocaleFromPathname("/en")).toEqual({
			localeInPathname: "en",
			pathnameWithoutLocale: "/",
			pathnameWithoutLocaleSegments: [],
		});
	});

	it("creates canonical locale-prefixed paths", () => {
		expect(createLocalizedPath("en", "/")).toBe("/en");
		expect(createLocalizedPath("ar", "/login")).toBe("/ar/login");
		expect(createLocalizedPath("ar", "/en/dashboard")).toBe("/ar/dashboard");
	});

	it("prefers cookie locale over accept-language and falls back to default", () => {
		expect(resolvePreferredLocale({ cookieLocale: "ar", headerLocale: "en-US,en;q=0.9" })).toBe(
			"ar",
		);
		expect(resolvePreferredLocale({ headerLocale: "ar-SA,ar;q=0.9,en;q=0.8" })).toBe("ar");
		expect(resolvePreferredLocale({ headerLocale: "fr-FR,fr;q=0.9" })).toBe("en");
	});

	it("skips locale redirects for api, health, and static assets", () => {
		expect(isLocaleManagedPathname("/")).toBe(true);
		expect(isLocaleManagedPathname("/login")).toBe(true);
		expect(isLocaleManagedPathname("/api/reference")).toBe(true);
		expect(isLocaleManagedPathname("/api/rpc")).toBe(false);
		expect(isLocaleManagedPathname("/api/reference/spec.json")).toBe(false);
		expect(isLocaleManagedPathname("/health")).toBe(false);
		expect(isLocaleManagedPathname("/favicon.ico")).toBe(false);
		expect(isLocaleManagedPathname("/en/login")).toBe(true);
		expect(isLocaleManagedPathname("/en/api/reference")).toBe(true);
	});
});
