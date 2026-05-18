import type { Accessor } from "solid-js";

import type {
	I18nSnapshot,
	LocaleDefinition,
	MessageDictionary,
	ResolvedTheme,
	TextDirection,
	ThemePreference,
} from "../../../core/shared/index";

export type I18nContextValue<
	TLocale extends string = string,
	TMessages extends MessageDictionary = MessageDictionary,
> = {
	dir: Accessor<TextDirection>;
	locale: Accessor<TLocale>;
	locales: readonly LocaleDefinition<TLocale, TMessages>[];
	messages: Accessor<TMessages>;
	resolvedTheme: Accessor<ResolvedTheme>;
	setLocale: (locale: TLocale) => void;
	setThemePreference: (themePreference: ThemePreference) => void;
	t: (key: string, fallback?: string) => string;
	themePreference: Accessor<ThemePreference>;
};

export type I18nProviderProps<TLocale extends string, TMessages extends MessageDictionary> = {
	initialSnapshot: I18nSnapshot<TLocale>;
	locales: readonly LocaleDefinition<TLocale, TMessages>[];
};
