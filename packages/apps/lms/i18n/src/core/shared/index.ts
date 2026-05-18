export const LOCALE_COOKIE_NAME = "locale";
export const THEME_COOKIE_NAME = "theme";

export type TextDirection = "ltr" | "rtl";
export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export interface MessageDictionary {
	[key: string]: string | MessageDictionary;
}

export type LocaleDefinition<
	TLocale extends string = string,
	TMessages extends MessageDictionary = MessageDictionary,
> = {
	code: TLocale;
	dir: TextDirection;
	label: string;
	messages: TMessages;
};

export type I18nSnapshot<TLocale extends string = string> = {
	dir: TextDirection;
	locale: TLocale;
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

export function getMessage(messages: MessageDictionary, key: string, fallback = key): string {
	const segments = key.split(".");
	let current: MessageDictionary | string | undefined = messages;

	for (const segment of segments) {
		if (!current || typeof current === "string") {
			return fallback;
		}

		current = current[segment];
	}

	return typeof current === "string" ? current : fallback;
}
