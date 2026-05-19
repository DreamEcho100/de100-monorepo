export type TextDirection = "ltr" | "rtl";
export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

/**
 * Configuration options for different parameter types in translations
 * Each parameter type (date, number, plural, etc.) can have specific formatting options
 */
export interface ParamOptions {
	date?: Record<string, Intl.DateTimeFormatOptions>;
	number?: Record<string, Intl.NumberFormatOptions>;
	plural?: Record<
		string,
		Partial<Record<Exclude<Intl.LDMLPluralRule, "other">, string>> & {
			other: string;
			formatter?: Intl.NumberFormatOptions;
			type?: Intl.PluralRuleType;
		}
	>;
	enum?: Record<string, Record<string, string>>;
	list?: Record<string, Intl.ListFormatOptions>;
	relativeTime?: Record<string, Intl.RelativeTimeFormatOptions>;
}

/**
 * Helper type for defining translations with their parameters
 * Returns a tuple of [translation string, parameter options]
 */
type DefineTranslation<TranslationKey extends string, TranslationOptions extends ParamOptions> = (
	string: TranslationKey,
	options: TranslationOptions,
) => [TranslationKey, TranslationOptions];

/**
 * A translation message can be either a simple string or a defined translation with parameters
 */
export type I18nMessage = string | ReturnType<DefineTranslation<string, ParamOptions>>;

/**
 * Structure for language message files - nested object with string keys
 * Values can be translation messages or nested message objects
 */
export interface I18nTranslationsShape {
	[key: string]: I18nMessage | I18nTranslationsShape;
}

// biome-ignore lint/suspicious/noEmptyInterface: <explanation>We want to allow apps to augment the I18nRegister interface to define their own translations and locales.</explanation>
export interface I18nRegister {}

/**
 * Extract registered translations from the Register interface
 * Falls back to generic LanguageMessages if no specific translations are registered
 */
export type I18nTranslations = I18nRegister extends { translations: infer TTranslations }
	? TTranslations extends infer Translations
		? Translations
		: never
	: I18nTranslationsShape;
export type I18nLocaleCode = I18nRegister extends { locales: infer TLocales }
	? TLocales extends readonly (infer TLocale)[]
		? TLocale
		: never
	: never;

export type I18nLocaleDefShape<
	TLocaleCode extends I18nLocaleCode = I18nLocaleCode,
	TMessages extends I18nTranslations = I18nTranslations,
> = {
	code: TLocaleCode;
	dir: TextDirection;
	label: string;
	messages: TMessages;
};

export type I18nLocaleDef = I18nLocaleCode extends string
	? I18nLocaleDefShape<I18nLocaleCode, I18nTranslations>
	: never;

export type I18nLocalCodeToDef = {
	[code in I18nLocaleCode]: I18nLocaleDef;
};

export type I18nSnapshot<TLocaleCode extends I18nLocaleCode = I18nLocaleCode> = {
	dir: TextDirection;
	locale: TLocaleCode;
	resolvedTheme: ResolvedTheme;
	themePreference: ThemePreference;
};
