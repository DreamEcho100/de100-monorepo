import { describe, expect, it } from "vitest";

import { createI18nRouting } from "./routing";

const routing = createI18nRouting({
	defaultLocale: "en",
	locales: [{ code: "en" }, { code: "ar" }],
});

describe("createI18nRouting", () => {
	it("splits and creates localized paths", () => {
		expect(routing.splitLocaleFromPathname("/ar/login")).toEqual({
			localeInPathname: "ar",
			pathnameWithoutLocale: "/login",
			pathnameWithoutLocaleSegments: ["login"],
		});
		expect(routing.createLocalizedPath("ar", "/en/dashboard")).toBe("/ar/dashboard");
		expect(routing.createLocalizedPath("fr", "/")).toBe("/en");
	});

	it("resolves preferred locales", () => {
		expect(routing.resolvePreferredLocale({ cookieLocale: "ar" })).toBe("ar");
		expect(routing.resolvePreferredLocale({ headerLocale: "ar-SA,ar;q=0.9,en;q=0.8" })).toBe("ar");
		expect(routing.resolvePreferredLocale({ headerLocale: "fr-FR,fr;q=0.9" })).toBe("en");
	});

	it("detects locale-managed paths", () => {
		const appRouting = createI18nRouting({
			defaultLocale: "en",
			locales: [{ code: "en" }, { code: "ar" }],
			shouldLocalizePathname(pathnameWithoutLocale, segments) {
				if (pathnameWithoutLocale === "/api/reference") return true;
				if (pathnameWithoutLocale === "/api" || pathnameWithoutLocale.startsWith("/api/")) {
					return false;
				}

				const firstSegment = segments[0];
				if (!firstSegment) return true;
				if (["api", "_build", "assets", "health"].includes(firstSegment)) return false;

				return !/\.[a-z0-9]+$/i.test(firstSegment);
			},
		});

		expect(routing.isLocaleManagedPathname("/")).toBe(true);
		expect(routing.isLocaleManagedPathname("/api/rpc")).toBe(true);
		expect(appRouting.isLocaleManagedPathname("/api/reference")).toBe(true);
		expect(appRouting.isLocaleManagedPathname("/api/reference/spec.json")).toBe(false);
		expect(appRouting.isLocaleManagedPathname("/api/rpc")).toBe(false);
		expect(appRouting.isLocaleManagedPathname("/favicon.ico")).toBe(false);
		expect(appRouting.isLocaleManagedPathname("/en/login")).toBe(true);
	});
});
