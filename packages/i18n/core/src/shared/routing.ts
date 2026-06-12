export type I18nRoutingLocale<TLocaleCode extends string = string> = {
	code: TLocaleCode;
};

export type I18nRoutingOptions<TLocaleCode extends string = string> = {
	defaultLocale: TLocaleCode;
	locales: readonly I18nRoutingLocale<TLocaleCode>[];
	shouldLocalizePathname?: (pathnameWithoutLocale: string, segments: readonly string[]) => boolean;
};

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

export function createI18nRouting<TLocaleCode extends string>(
	options: I18nRoutingOptions<TLocaleCode>,
) {
	const localeLookup = new Set<string>(options.locales.map((locale) => locale.code));

	function isI18nLocale(value: string | undefined): value is TLocaleCode {
		return typeof value === "string" && localeLookup.has(value);
	}

	function splitLocaleFromPathname(pathname: string) {
		const normalizedPathname = normalizePathname(pathname);
		const pathnameSegments = normalizedPathname.split("/").filter(Boolean);
		const [firstSegment, ...remainingSegments] = pathnameSegments;

		if (!isI18nLocale(firstSegment)) {
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

	function createLocalizedPath(locale: string, pathname: string) {
		const resolvedLocale = isI18nLocale(locale) ? locale : options.defaultLocale;
		const normalizedPathname = normalizePathname(pathname);
		const { pathnameWithoutLocale, pathnameWithoutLocaleSegments } =
			splitLocaleFromPathname(normalizedPathname);

		if (pathnameWithoutLocale === "/") {
			return `/${resolvedLocale}`;
		}

		return `/${resolvedLocale}/${pathnameWithoutLocaleSegments.join("/")}`;
	}

	function resolvePreferredLocale(preferences?: {
		cookieLocale?: string | null | undefined;
		headerLocale?: string | null | undefined;
	}) {
		const cookieLocale = preferences?.cookieLocale ?? undefined;
		if (isI18nLocale(cookieLocale)) {
			return cookieLocale;
		}

		const headerLocale = preferences?.headerLocale?.trim().toLowerCase();
		if (headerLocale) {
			for (const languagePart of headerLocale.split(",")) {
				const baseTag = languagePart.split(";")[0]?.trim().split("-")[0];
				if (isI18nLocale(baseTag)) {
					return baseTag;
				}
			}
		}

		return options.defaultLocale;
	}

	function isLocaleManagedPathname(pathname: string) {
		const normalizedPathname = normalizePathname(pathname);
		const { pathnameWithoutLocale } = splitLocaleFromPathname(normalizedPathname);
		const pathnameSegments = pathnameWithoutLocale.split("/").filter(Boolean);

		return options.shouldLocalizePathname?.(pathnameWithoutLocale, pathnameSegments) ?? true;
	}

	return {
		createLocalizedPath,
		isI18nLocale,
		isLocaleManagedPathname,
		resolvePreferredLocale,
		splitLocaleFromPathname,
	};
}
