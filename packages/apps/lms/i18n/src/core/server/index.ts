import type { I18nSnapshot, LocaleDefinition } from "../shared/index";
import {
	DEFAULT_RESOLVED_THEME,
	DEFAULT_THEME_PREFERENCE,
	isThemePreference,
	LOCALE_COOKIE_NAME,
	THEME_COOKIE_NAME,
} from "../shared/index";

type RequestSnapshotOptions<TLocale extends string> = {
	defaultLocale: TLocale;
	locales: readonly LocaleDefinition<TLocale>[];
	request?: Request;
};

function parseCookieHeader(cookieHeader: string | null | undefined) {
	const cookies = new Map<string, string>();

	if (!cookieHeader) {
		return cookies;
	}

	for (const chunk of cookieHeader.split(";")) {
		const trimmedChunk = chunk.trim();
		if (!trimmedChunk) {
			continue;
		}

		const separatorIndex = trimmedChunk.indexOf("=");
		if (separatorIndex === -1) {
			continue;
		}

		const rawName = trimmedChunk.slice(0, separatorIndex).trim();
		const rawValue = trimmedChunk.slice(separatorIndex + 1).trim();

		cookies.set(decodeURIComponent(rawName), decodeURIComponent(rawValue));
	}

	return cookies;
}

function resolveLocaleFromAcceptLanguage<TLocale extends string>(
	acceptLanguageHeader: string | null,
	allowedLocaleCodes: readonly TLocale[],
	defaultLocale: TLocale,
) {
	if (!acceptLanguageHeader) {
		return defaultLocale;
	}

	const requestedTags = acceptLanguageHeader
		.split(",")
		.map((part) => {
			const [rawTag, ...rawParameters] = part.trim().split(";");
			const normalizedTag = rawTag?.toLowerCase() ?? "";
			const qualityParameter = rawParameters.find((parameter) => parameter.trim().startsWith("q="));
			const quality = qualityParameter ? Number(qualityParameter.trim().slice(2)) : 1;

			return {
				baseTag: normalizedTag.split("-")[0] ?? "",
				quality: Number.isFinite(quality) ? quality : 0,
				tag: normalizedTag,
			};
		})
		.filter((candidate) => candidate.tag.length > 0)
		.sort((left, right) => right.quality - left.quality);

	for (const requestedTag of requestedTags) {
		const exactMatch = allowedLocaleCodes.find(
			(localeCode) => localeCode.toLowerCase() === requestedTag.tag,
		);
		if (exactMatch) {
			return exactMatch;
		}

		const baseMatch = allowedLocaleCodes.find(
			(localeCode) => localeCode.toLowerCase() === requestedTag.baseTag,
		);
		if (baseMatch) {
			return baseMatch;
		}
	}

	return defaultLocale;
}

export function createRequestI18nSnapshot<TLocale extends string>(
	options: RequestSnapshotOptions<TLocale>,
): I18nSnapshot<TLocale> {
	const allowedLocaleCodes = options.locales.map((locale) => locale.code);
	const cookies = parseCookieHeader(options.request?.headers.get("cookie"));
	const localeCookie = cookies.get(LOCALE_COOKIE_NAME);
	const cookieLocale = allowedLocaleCodes.find((localeCode) => localeCode === localeCookie);
	const locale =
		cookieLocale ??
		resolveLocaleFromAcceptLanguage(
			options.request?.headers.get("accept-language") ?? null,
			allowedLocaleCodes,
			options.defaultLocale,
		);
	const localeDefinition =
		options.locales.find((candidate) => candidate.code === locale) ?? options.locales[0];
	const themeCookie = cookies.get(THEME_COOKIE_NAME);
	const themePreference = isThemePreference(themeCookie) ? themeCookie : DEFAULT_THEME_PREFERENCE;

	return {
		dir: localeDefinition?.dir ?? "ltr",
		locale,
		resolvedTheme: themePreference === "dark" ? "dark" : DEFAULT_RESOLVED_THEME,
		themePreference,
	};
}
