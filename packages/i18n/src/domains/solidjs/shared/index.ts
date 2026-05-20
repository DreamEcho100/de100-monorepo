import type { Accessor } from "solid-js";

import type {
	generateI18nConfig,
	I18nLocaleCode,
	I18nLocaleDefShape,
	I18nSnapshot,
	I18nTranslations,
	ResolvedTheme,
	TextDirection,
	ThemePreference,
} from "../../../core/shared/index";

type BaseTranslationState = ReturnType<typeof generateI18nConfig>;

export type I18nContextValue<
	TLocaleCode extends I18nLocaleCode = I18nLocaleCode,
	TMessages extends I18nTranslations = I18nTranslations,
> = {
	dir: Accessor<TextDirection>;
	locale: Accessor<TLocaleCode>;
	locales: readonly I18nLocaleDefShape<TLocaleCode, TMessages>[];
	messages: Accessor<TMessages>;
	resolvedTheme: Accessor<ResolvedTheme>;
	setLocale: (locale: TLocaleCode) => void;
	setThemePreference: (themePreference: ThemePreference) => void;
	t: BaseTranslationState["t"];
	themePreference: Accessor<ThemePreference>;
};

export type I18nProviderProps<
	TLocaleCode extends I18nLocaleCode = I18nLocaleCode,
	TMessages extends I18nTranslations = I18nTranslations,
> = {
	initialSnapshot: I18nSnapshot;
	locales: readonly I18nLocaleDefShape<TLocaleCode, TMessages>[];
};
