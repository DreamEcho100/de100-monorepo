import { createI18nRouting } from "@de100/i18n-core/shared";

import type { I18nLocaleCode } from "./shared";
import { i18nDefaultLocale, i18nLocales } from "./shared";

const excludedTopLevelSegments = new Set(["api", "_build", "assets", "health"]);
const staticAssetPattern = /\.[a-z0-9]+$/i;

const appI18nRouting = createI18nRouting<I18nLocaleCode>({
	defaultLocale: i18nDefaultLocale,
	locales: i18nLocales,
	shouldLocalizePathname(pathnameWithoutLocale, pathnameSegments) {
		const firstSegment = pathnameSegments[0];

		if (pathnameWithoutLocale === "/api/reference") {
			return true;
		}

		if (pathnameWithoutLocale === "/api" || pathnameWithoutLocale.startsWith("/api/")) {
			return false;
		}

		if (!firstSegment) {
			return true;
		}

		if (excludedTopLevelSegments.has(firstSegment)) {
			return false;
		}

		return !staticAssetPattern.test(firstSegment);
	},
});

export const {
	createLocalizedPath,
	isI18nLocale,
	isLocaleManagedPathname,
	resolvePreferredLocale,
	splitLocaleFromPathname,
} = appI18nRouting;
