import type {
	I18nLocalCodeToDef,
	I18nLocaleCode,
	I18nLocaleDefShape,
	I18nSnapshot,
	ResolvedTheme,
	ThemePreference,
} from "../shared/index";
import {
	DEFAULT_RESOLVED_THEME,
	DEFAULT_THEME_PREFERENCE,
	isResolvedTheme,
	isThemePreference,
	LOCALE_COOKIE_NAME,
	PREFERENCE_COOKIE_MAX_AGE,
	THEME_COOKIE_NAME,
} from "../shared/index";

function readCookieValue(name: string) {
	if (typeof document === "undefined") {
		return undefined;
	}

	for (const chunk of document.cookie.split(";")) {
		const trimmedChunk = chunk.trim();
		if (!trimmedChunk) {
			continue;
		}

		const separatorIndex = trimmedChunk.indexOf("=");
		if (separatorIndex === -1) {
			continue;
		}

		const rawName = trimmedChunk.slice(0, separatorIndex).trim();
		if (decodeURIComponent(rawName) !== name) {
			continue;
		}

		return decodeURIComponent(trimmedChunk.slice(separatorIndex + 1).trim());
	}

	return undefined;
}

export function getSystemTheme(): ResolvedTheme {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
		return DEFAULT_RESOLVED_THEME;
	}

	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveThemePreference(
	themePreference: ThemePreference,
	systemTheme: ResolvedTheme = getSystemTheme(),
): ResolvedTheme {
	return themePreference === "system" ? systemTheme : themePreference;
}

export function applyDocumentSnapshot<TLocaleCode extends I18nLocaleCode>(
	snapshot: I18nSnapshot<TLocaleCode>,
	root: HTMLElement = document.documentElement,
) {
	root.lang = snapshot.locale;
	root.dir = snapshot.dir;
	root.dataset.locale = snapshot.locale;
	root.dataset.themePreference = snapshot.themePreference;
	root.dataset.resolvedTheme = snapshot.resolvedTheme;
	root.classList.toggle("dark", snapshot.resolvedTheme === "dark");
	root.style.colorScheme = snapshot.resolvedTheme;
}

export function persistCookie(name: string, value: string) {
	if (typeof document === "undefined") {
		return;
	}

	// biome-ignore lint/suspicious/noDocumentCookie: <explanation>We want to use the global document object to set cookies.</explanation>
	document.cookie = [
		`${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
		"Path=/",
		`Max-Age=${PREFERENCE_COOKIE_MAX_AGE}`,
		"SameSite=Lax",
	].join("; ");
}

export function readDocumentSnapshot<TLocaleCode extends I18nLocaleCode>(options: {
	defaultLocale: TLocaleCode;
	locales: readonly I18nLocaleDefShape<TLocaleCode>[];
	codeToI18nLocales: I18nLocalCodeToDef;
	root?: HTMLElement;
}): I18nSnapshot<TLocaleCode> {
	const root = options.root ?? document.documentElement;
	let locale: TLocaleCode = options.defaultLocale;

	const localeSourcePriorities = [
		root.dataset.locale,
		root.lang,
		readCookieValue(LOCALE_COOKIE_NAME),
	].filter((value): value is string => value !== undefined);

	let foundLocaleSourceIndex = Number.MAX_VALUE;

	for (const [priority, candidate] of options.locales.entries()) {
		for (const localeSource of localeSourcePriorities) {
			if (candidate.code === localeSource && priority < foundLocaleSourceIndex) {
				locale = candidate.code;
				foundLocaleSourceIndex = priority;
				break;
			}
		}
	}

	const localeDefinition =
		options.locales.find((candidate) => candidate.code === locale) ?? options.locales[0];
	const themePreferenceCookie = readCookieValue(THEME_COOKIE_NAME);
	const themePreference = isThemePreference(root.dataset.themePreference)
		? root.dataset.themePreference
		: isThemePreference(themePreferenceCookie)
			? themePreferenceCookie
			: DEFAULT_THEME_PREFERENCE;
	const resolvedTheme = isResolvedTheme(root.dataset.resolvedTheme)
		? root.dataset.resolvedTheme
		: resolveThemePreference(themePreference);

	return {
		dir: root.dir === "rtl" ? "rtl" : (localeDefinition?.dir ?? "ltr"),
		locale,
		resolvedTheme,
		themePreference,
	};
}
