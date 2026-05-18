import type {
	I18nSnapshot,
	LocaleDefinition,
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

export function applyDocumentSnapshot<TLocale extends string>(
	snapshot: I18nSnapshot<TLocale>,
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

	document.cookie = [
		`${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
		"Path=/",
		`Max-Age=${PREFERENCE_COOKIE_MAX_AGE}`,
		"SameSite=Lax",
	].join("; ");
}

export function readDocumentSnapshot<TLocale extends string>(options: {
	defaultLocale: TLocale;
	locales: readonly LocaleDefinition<TLocale>[];
	root?: HTMLElement;
}): I18nSnapshot<TLocale> {
	const root = options.root ?? document.documentElement;
	const locale =
		options.locales.find((candidate) => candidate.code === root.dataset.locale)?.code ??
		options.locales.find((candidate) => candidate.code === root.lang)?.code ??
		options.locales.find((candidate) => candidate.code === readCookieValue(LOCALE_COOKIE_NAME))
			?.code ??
		options.defaultLocale;
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
