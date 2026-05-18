import type { AppLocaleCode } from "./shared";
import { appLocales, defaultLocale } from "./shared";

const appLocaleLookup = new Set<string>(appLocales.map((locale) => locale.code));
const excludedTopLevelSegments = new Set(["api", "_build", "assets", "health"]);
const staticAssetPattern = /\.[a-z0-9]+$/i;

function normalizePathname(pathname: string) {
	if (!pathname) {
		return "/";
	}

	const collapsedPathname = pathname.replace(/\/+/g, "/");
	const withLeadingSlash = collapsedPathname.startsWith("/")
		? collapsedPathname
		: `/${collapsedPathname}`;

	if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith("/")) {
		return withLeadingSlash.slice(0, -1);
	}

	return withLeadingSlash;
}

export function isAppLocale(value: string | undefined): value is AppLocaleCode {
	return typeof value === "string" && appLocaleLookup.has(value);
}

export function splitLocaleFromPathname(pathname: string) {
	const normalizedPathname = normalizePathname(pathname);
	const pathnameSegments = normalizedPathname.split("/").filter(Boolean);
	const [firstSegment, ...remainingSegments] = pathnameSegments;

	if (!isAppLocale(firstSegment)) {
		return {
			localeInPathname: undefined,
			pathnameWithoutLocale: normalizedPathname,
			pathnameWithoutLocaleSegments: pathnameSegments,
		};
	}

	const pathnameWithoutLocale =
		remainingSegments.length > 0 ? `/${remainingSegments.join("/")}` : "/";

	return {
		localeInPathname: firstSegment,
		pathnameWithoutLocale,
		pathnameWithoutLocaleSegments: remainingSegments,
	};
}

export function createLocalizedPath(locale: string, pathname: string) {
	const resolvedLocale = isAppLocale(locale) ? locale : defaultLocale;
	const normalizedPathname = normalizePathname(pathname);
	const { pathnameWithoutLocale, pathnameWithoutLocaleSegments } =
		splitLocaleFromPathname(normalizedPathname);

	if (pathnameWithoutLocale === "/") {
		return `/${resolvedLocale}`;
	}

	return `/${resolvedLocale}/${pathnameWithoutLocaleSegments.join("/")}`;
}

export function resolvePreferredLocale(options?: {
	cookieLocale?: string | null | undefined;
	headerLocale?: string | null | undefined;
}): AppLocaleCode {
	const cookieLocale = options?.cookieLocale ?? undefined;
	if (isAppLocale(cookieLocale)) {
		return cookieLocale;
	}

	const headerLocale = options?.headerLocale?.trim().toLowerCase();
	if (headerLocale) {
		for (const languagePart of headerLocale.split(",")) {
			const baseTag = languagePart.split(";")[0]?.trim().split("-")[0];
			if (isAppLocale(baseTag)) {
				return baseTag;
			}
		}
	}

	return defaultLocale;
}

export function isLocaleManagedPathname(pathname: string) {
	const normalizedPathname = normalizePathname(pathname);
	const { pathnameWithoutLocale } = splitLocaleFromPathname(normalizedPathname);
	const pathnameSegments = pathnameWithoutLocale.split("/").filter(Boolean);
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
}
