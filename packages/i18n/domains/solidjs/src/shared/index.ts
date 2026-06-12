import type {
	generateI18nConfig,
	I18nLocaleCode,
	I18nLocaleDefShape,
	I18nLocaleMessages,
	I18nSnapshot,
	I18nTranslations,
	ResolvedTheme,
	TextDirection,
	ThemePreference,
} from "@de100/i18n-core/shared";
import type { Accessor } from "solid-js";

type BaseTranslationState = ReturnType<typeof generateI18nConfig>;

export type I18nContextValue<
	TLocaleCode extends I18nLocaleCode = I18nLocaleCode,
	TMessages extends I18nTranslations = I18nTranslations,
> = {
	dir: Accessor<TextDirection>;
	createLocalizedPath?: (locale: TLocaleCode, pathname: string) => string;
	isLoadingTranslations: Accessor<boolean>;
	locale: Accessor<TLocaleCode>;
	locales: readonly I18nLocaleDefShape<TLocaleCode, TMessages>[];
	messages: Accessor<TMessages>;
	resolvedTheme: Accessor<ResolvedTheme>;
	setLocale: (locale: TLocaleCode) => Promise<void>;
	setThemePreference: (themePreference: ThemePreference) => void;
	themePreference: Accessor<ThemePreference>;
} & Omit<BaseTranslationState, "locale">;

export type I18nProviderProps<
	TLocaleCode extends I18nLocaleCode = I18nLocaleCode,
	TMessages extends I18nTranslations = I18nTranslations,
> = {
	createLocalizedPath?: (locale: TLocaleCode, pathname: string) => string;
	fallbackLocale?: TLocaleCode | readonly TLocaleCode[];
	initialSnapshot: I18nSnapshot;
	loadTranslations?: (
		locale: TLocaleCode,
	) =>
		| I18nLocaleMessages<TMessages>
		| Promise<I18nLocaleMessages<TMessages> | undefined>
		| undefined;
	locales: readonly I18nLocaleDefShape<TLocaleCode, TMessages>[];
	onError?: Parameters<typeof generateI18nConfig>[0]["onError"];
};
