import type { ResolvedTheme, ThemePreference } from "./types";

export const LOCALE_COOKIE_NAME = "locale";
export const THEME_COOKIE_NAME = "theme";
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";
export const DEFAULT_RESOLVED_THEME: ResolvedTheme = "light";
export const PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
