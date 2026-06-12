import type { I18nTranslations, ResolvedTheme, ThemePreference } from "./types";

export * from "./constants";
export * from "./routing";
export * from "./types";
export * from "./utils/index";

export function isThemePreference(value: string | null | undefined): value is ThemePreference {
	return value === "system" || value === "light" || value === "dark";
}

export function isResolvedTheme(value: string | null | undefined): value is ResolvedTheme {
	return value === "light" || value === "dark";
}

// TODO: Make the return type more granular
export function getMessage(messages: I18nTranslations, key: string, fallback = key): string {
	const segments = key.split(".");
	let current: unknown = messages;

	for (const segment of segments) {
		if (current == null || typeof current !== "object") {
			return fallback;
		}
		current = (current as Record<string, unknown>)[segment];
	}

	if (typeof current === "string") return current;
	if (Array.isArray(current) && typeof current[0] === "string") return current[0];
	return fallback;
}
