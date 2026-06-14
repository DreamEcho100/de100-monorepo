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

export type I18nCookiePersistenceOptions = {
	maxAge?: number;
	path?: string;
	sameSite?: "Lax" | "Strict" | "None";
	secure?: boolean;
};

export type I18nDocumentSnapshotOptions<TLocaleCode extends I18nLocaleCode> = {
	codeToI18nLocales: I18nLocalCodeToDef;
	defaultLocale: TLocaleCode;
	defaultResolvedTheme?: ResolvedTheme;
	defaultThemePreference?: ThemePreference;
	localeCookieName?: string;
	locales: readonly I18nLocaleDefShape<TLocaleCode>[];
	root?: HTMLElement;
	themeCookieName?: string;
};

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

export function getSystemTheme(defaultResolvedTheme: ResolvedTheme = DEFAULT_RESOLVED_THEME) {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
		return defaultResolvedTheme;
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

export function persistCookie(
	name: string,
	value: string,
	options: I18nCookiePersistenceOptions = {},
) {
	if (typeof document === "undefined") {
		return;
	}

	const cookieParts = [
		`${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
		`Path=${options.path ?? "/"}`,
		`Max-Age=${options.maxAge ?? PREFERENCE_COOKIE_MAX_AGE}`,
		`SameSite=${options.sameSite ?? "Lax"}`,
	];

	if (options.secure) {
		cookieParts.push("Secure");
	}

	// biome-ignore lint/suspicious/noDocumentCookie: browser preference persistence writes a first-party cookie.
	document.cookie = cookieParts.join("; ");
}

export function readDocumentSnapshot<TLocaleCode extends I18nLocaleCode>(
	options: I18nDocumentSnapshotOptions<TLocaleCode>,
): I18nSnapshot<TLocaleCode> {
	const root = options.root ?? document.documentElement;
	const localeCookieName = options.localeCookieName ?? LOCALE_COOKIE_NAME;
	const themeCookieName = options.themeCookieName ?? THEME_COOKIE_NAME;
	let locale: TLocaleCode = options.defaultLocale;

	const localeSourcePriorities = [
		root.dataset.locale,
		root.lang,
		readCookieValue(localeCookieName),
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
	const themePreferenceCookie = readCookieValue(themeCookieName);
	const themePreference = isThemePreference(root.dataset.themePreference)
		? root.dataset.themePreference
		: isThemePreference(themePreferenceCookie)
			? themePreferenceCookie
			: (options.defaultThemePreference ?? DEFAULT_THEME_PREFERENCE);
	const resolvedTheme = isResolvedTheme(root.dataset.resolvedTheme)
		? root.dataset.resolvedTheme
		: resolveThemePreference(
				themePreference,
				getSystemTheme(options.defaultResolvedTheme ?? DEFAULT_RESOLVED_THEME),
			);

	return {
		dir: root.dir === "rtl" ? "rtl" : (localeDefinition?.dir ?? "ltr"),
		locale,
		resolvedTheme,
		themePreference,
	};
}
