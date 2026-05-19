import type { Accessor } from "solid-js";

import type {
	AppI18nLocaleCode,
	AppI18nLocaleDefShape,
	AppI18nSnapshot,
	AppI18nTranslations,
	ResolvedTheme,
	TextDirection,
	ThemePreference,
} from "../../../core/shared/index";

export type I18nContextValue<
	TLocaleCode extends AppI18nLocaleCode = AppI18nLocaleCode,
	TMessages extends AppI18nTranslations = AppI18nTranslations,
> = {
	dir: Accessor<TextDirection>;
	locale: Accessor<TLocaleCode>;
	locales: readonly AppI18nLocaleDefShape<TLocaleCode, TMessages>[];
	messages: Accessor<TMessages>;
	resolvedTheme: Accessor<ResolvedTheme>;
	setLocale: (locale: TLocaleCode) => void;
	setThemePreference: (themePreference: ThemePreference) => void;
	t: (key: string, fallback?: string) => string;
	themePreference: Accessor<ThemePreference>;
};

export type I18nProviderProps<
	TLocaleCode extends AppI18nLocaleCode = AppI18nLocaleCode,
	TMessages extends AppI18nTranslations = AppI18nTranslations,
> = {
	initialSnapshot: AppI18nSnapshot;
	locales: readonly AppI18nLocaleDefShape<TLocaleCode, TMessages>[];
};
