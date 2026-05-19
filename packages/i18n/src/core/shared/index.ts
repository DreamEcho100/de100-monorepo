export const LOCALE_COOKIE_NAME = "locale";
export const THEME_COOKIE_NAME = "theme";

export type TextDirection = "ltr" | "rtl";
export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

// biome-ignore lint/suspicious/noEmptyInterface: <explanation>We want to allow apps to augment the AppI18nRegister interface to define their own translations and locales.</explanation>
export interface AppI18nRegister {}

export type AppI18nTranslations = AppI18nRegister extends { translations: infer TTranslations }
	? TTranslations
	: never;
export type AppI18nLocaleCode = AppI18nRegister extends { locales: infer TLocales }
	? TLocales extends readonly (infer TLocale)[]
		? TLocale
		: never
	: never;

export type AppI18nLocaleDefShape<
	TLocaleCode extends AppI18nLocaleCode = AppI18nLocaleCode,
	TMessages extends AppI18nTranslations = AppI18nTranslations,
> = {
	code: TLocaleCode;
	dir: TextDirection;
	label: string;
	messages: TMessages;
};

export type AppI18nLocaleDef = AppI18nLocaleCode extends string
	? AppI18nLocaleDefShape<AppI18nLocaleCode, AppI18nTranslations>
	: never;

export type AppI18nLocalCodeToDef = {
	[code in AppI18nLocaleCode]: AppI18nLocaleDef;
};

export type AppI18nSnapshot<TLocaleCode extends AppI18nLocaleCode = AppI18nLocaleCode> = {
	dir: TextDirection;
	locale: TLocaleCode;
	resolvedTheme: ResolvedTheme;
	themePreference: ThemePreference;
};

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";
export const DEFAULT_RESOLVED_THEME: ResolvedTheme = "light";
export const PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isThemePreference(value: string | null | undefined): value is ThemePreference {
	return value === "system" || value === "light" || value === "dark";
}

export function isResolvedTheme(value: string | null | undefined): value is ResolvedTheme {
	return value === "light" || value === "dark";
}

// TODO: Make the return type more granular
export function getMessage(messages: AppI18nTranslations, key: string, fallback = key): string {
	const segments = key.split(".");
	let current: unknown = messages;

	for (const segment of segments) {
		if (current == null || typeof current !== "object") {
			return fallback;
		}
		current = (current as Record<string, unknown>)[segment];
	}

	return typeof current === "string" ? current : fallback;
}
