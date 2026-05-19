/**
 * Define a translation with its parameter options
 * This function provides type safety for translation definitions
 */

import type {
	I18nLocalCodeToDef,
	I18nLocaleDef,
	I18nMessage,
	I18nTranslations,
	I18nTranslationsShape,
	ParamOptions,
} from "../types";
import type {
	DotPathsFor,
	ExtractParamOptions,
	Params,
	PathsWithNoParams,
	PathsWithParams,
} from "./types";

export function defineTranslation<
	TranslationKey extends string,
	TranslationOptions extends ExtractParamOptions<TranslationKey>,
>(string: TranslationKey, options: TranslationOptions): [TranslationKey, TranslationOptions] {
	return [string, options];
}

/**
 * Error class for i18n-related errors with enhanced debugging information
 */
class I18nError extends Error {
	constructor(
		message: string,
		public readonly locale: string,
		public readonly key?: string,
		public readonly argKey?: string,
	) {
		super(
			`[i18n] ${message} (locale: ${locale}${key ? `, key: ${key}` : ""}${argKey ? `, arg: ${argKey}` : ""})`,
		);
		this.name = "I18nError";
	}
}

/**
 * Cache for storing formatted instances to avoid recreation
 * Key format: "locale-type-optionsHash"
 */
const formatterCache = new Map<
	string,
	Intl.NumberFormat | Intl.DateTimeFormat | Intl.ListFormat | Intl.RelativeTimeFormat
>();

/**
 * Create a cache key for formatter instances
 */
function createCacheKey(locale: string, type: string, options?: object): string {
	const optionsHash = options ? JSON.stringify(options) : "";
	return `${locale}-${type}-${optionsHash}`;
}

/**
 * Get or create a cached NumberFormat instance
 */
function getNumberFormatter(locale: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
	const key = createCacheKey(locale, "number", options);
	if (!formatterCache.has(key)) {
		formatterCache.set(key, new Intl.NumberFormat(locale, options));
	}
	return formatterCache.get(key) as Intl.NumberFormat;
}

/**
 * Get or create a cached DateTimeFormat instance
 */
function getDateTimeFormatter(
	locale: string,
	options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
	const key = createCacheKey(locale, "date", options);
	if (!formatterCache.has(key)) {
		formatterCache.set(key, new Intl.DateTimeFormat(locale, options));
	}
	return formatterCache.get(key) as Intl.DateTimeFormat;
}

/**
 * Get or create a cached ListFormat instance
 */
function getListFormatter(locale: string, options?: Intl.ListFormatOptions): Intl.ListFormat {
	const key = createCacheKey(locale, "list", options);
	if (!formatterCache.has(key)) {
		formatterCache.set(key, new Intl.ListFormat(locale, options));
	}
	return formatterCache.get(key) as Intl.ListFormat;
}

/**
 * Get or create a cached RelativeTimeFormat instance
 */
function getRelativeTimeFormatter(
	locale: string,
	options?: Intl.RelativeTimeFormatOptions,
): Intl.RelativeTimeFormat {
	const key = createCacheKey(locale, "relativeTime", options);
	if (!formatterCache.has(key)) {
		formatterCache.set(key, new Intl.RelativeTimeFormat(locale, options));
	}
	return formatterCache.get(key) as Intl.RelativeTimeFormat;
}

/**
 * Get or create a cached PluralRules instance
 */
const pluralRulesCache = new Map<string, Intl.PluralRules>();
function getPluralRules(locale: string, type?: Intl.PluralRuleType): Intl.PluralRules {
	const key = `${locale}-${type ?? "cardinal"}`;
	if (!pluralRulesCache.has(key)) {
		pluralRulesCache.set(key, new Intl.PluralRules(locale, { type }));
	}
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return pluralRulesCache.get(key)!;
}

/**
 * Pre-compiled regex patterns for better performance
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _PARAM_REGEX = /\{([^:}]+)(?::([^}]*))?\}/g;

/**
 * Initialize the i18n system with locale configuration and translations
 */
export function generateI18nConfig({
	locale,
	// defaultLocale,
	fallbackLocale,
	translations,
	onError,
	i18nLocales,
}: {
	locale: string;
	// defaultLocale: string;
	fallbackLocale?: string | string[] | readonly string[];
	translations: Record<string, I18nTranslations>; // I18nTranslations;
	onError?: (error: I18nError) => void;
	i18nLocales: readonly I18nLocaleDef[];
}) {
	// Convert fallback locale to array for uniform processing
	const fallbackLocales =
		typeof fallbackLocale === "string" ? [fallbackLocale] : (fallbackLocale ?? []);

	// Create ordered list of locales to try (current locale + parents + fallbacks)
	const orderedLocales = new Set([
		...getOrderedLocaleAndParentLocales(locale),
		...fallbackLocales.flatMap(getOrderedLocaleAndParentLocales),
	]);

	/**
	 * Translation function overloads:
	 * - For keys without parameters: t(key) => string
	 * - For keys with parameters: t(key, args) => string
	 */
	function t<S extends PathsWithNoParams>(key: S): string;
	function t<S extends PathsWithParams, A extends Params<S>>(key: S, args: A): string;
	function t<S extends DotPathsFor, A extends Params<S>>(key: S, args?: A) {
		// Try each locale in order until we find a translation
		for (const locale of orderedLocales) {
			const translationFile = translations[locale];
			if (translationFile == null) continue;

			try {
				const translation = getTranslation(locale, translationFile, key, args);
				if (translation) return translation;
			} catch (error) {
				// Log error but continue trying other locales
				if (onError && error instanceof I18nError) {
					onError(error);
				}
			}
		}

		// Return the key as fallback if no translation found
		return key;
	}

	return {
		t,
		// Expose current locale for external use
		locale,
		// Method to clear formatter cache if needed
		clearCache: () => {
			formatterCache.clear();
			pluralRulesCache.clear();
		},

		i18nLocalCodeToDef: i18nLocales.reduce((acc, locale) => {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>We need to use 'any' here to assign to the accumulator object with dynamic keys.</explanation>
			(acc as Record<string, any>)[locale.code] = locale;
			return acc;
		}, {} as I18nLocalCodeToDef),
	};
}

/**
 * Generate ordered list of locale and its parent locales
 * Example: "en-US-CA" => ["en-US-CA", "en-US", "en"]
 */
function getOrderedLocaleAndParentLocales(locale: string) {
	const locales = [];
	let parentLocale = locale;
	while (parentLocale !== "") {
		locales.push(parentLocale);
		// Remove the last segment after hyphen to get parent locale
		parentLocale = parentLocale.replace(/-?[^-]+$/, "");
	}
	return locales;
}

/**
 * Get and process a translation for a specific key and arguments
 */
function getTranslation<S extends DotPathsFor, A extends Params<S>>(
	locale: string,
	translations: I18nTranslationsShape | I18nMessage,
	key: S,
	args?: A,
) {
	// Find the translation value by key path
	const translation = getTranslationByKey(translations, key);
	const argObj = args ?? {};

	// Process simple string translations
	if (typeof translation === "string") {
		return performSubstitution(locale, translation, argObj, {}, key);
	}

	// Process defined translations with parameter options
	if (Array.isArray(translation)) {
		const [str, translationParams] = translation;
		return performSubstitution(locale, str, argObj, translationParams, key);
	}

	return undefined;
}

/**
 * Navigate through nested translation object using dot-notation key
 * Example: getTranslationByKey(obj, "user.profile.name")
 */
function getTranslationByKey(obj: I18nTranslationsShape | I18nMessage, key: string) {
	const keys = key.split(".");
	let currentObj = obj;

	// Navigate through each key segment
	for (let i = 0; i <= keys.length - 1; i++) {
		const k = keys[i];
		if (typeof currentObj !== "object" && i < keys.length - 1) {
			return undefined; // Can't navigate further if current is not an object
		}

		const newObj = (currentObj as Record<string, unknown>)[k as keyof typeof currentObj];

		// Return undefined if key doesn't exist
		if (newObj == null) return undefined;

		// If we found a translation message and we're at the end of the path
		if (typeof newObj === "string" || Array.isArray(newObj)) {
			if (i < keys.length - 1) return undefined; // Path continues but we hit a leaf
			return newObj;
		}

		// Continue navigation for nested objects
		currentObj = newObj as I18nTranslationsShape;
	}

	return undefined;
}

/**
 * Perform parameter substitution in translation strings
 * Handles all parameter types: plural, enum, number, list, date, relativeTime
 */
function performSubstitution(
	locale: string,
	str: string,
	args: Record<string, unknown>,
	translationParams: ParamOptions,
	key: string,
): string {
	return Object.entries(args).reduce((result, [argKey, argValue]) => {
		try {
			// Use pre-compiled regex to find parameter pattern
			const match = new RegExp(`\\{${argKey}:?([^}]*)?\\}`).exec(result);
			// const match = result.match(new RegExp(`\\{${argKey}:?([^}]*)?\\}`));
			const [replaceKey, argType] = match ?? [`{${argKey}}`, undefined];

			switch (argType) {
				case "plural": {
					if (typeof argValue !== "number") {
						throw new I18nError(
							`Expected number for plural parameter '${argKey}', got ${typeof argValue}`,
							locale,
							key,
							argKey,
						);
					}

					const pluralMap = translationParams.plural?.[argKey];
					if (!pluralMap) {
						throw new I18nError(
							`Missing plural configuration for parameter '${argKey}'`,
							locale,
							key,
							argKey,
						);
					}

					const pluralRules = getPluralRules(locale, pluralMap.type);
					const replacement = pluralMap[pluralRules.select(argValue)] ?? pluralMap.other;

					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (replacement == null) {
						throw new I18nError(
							`Missing plural replacement for parameter '${argKey}'`,
							locale,
							key,
							argKey,
						);
					}

					const numberFormatter = getNumberFormatter(locale, pluralMap.formatter);
					return result.replace(
						replaceKey,
						replacement.replace("{?}", numberFormatter.format(argValue)),
					);
				}

				case "enum": {
					if (typeof argValue !== "string") {
						throw new I18nError(
							`Expected string for enum parameter '${argKey}', got ${typeof argValue}`,
							locale,
							key,
							argKey,
						);
					}

					const enumMap = translationParams.enum?.[argKey];
					if (!enumMap) {
						throw new I18nError(
							`Missing enum configuration for parameter '${argKey}'`,
							locale,
							key,
							argKey,
						);
					}

					const replacement = enumMap[argValue];
					if (replacement == null) {
						throw new I18nError(
							`Missing enum value '${argValue}' for parameter '${argKey}'`,
							locale,
							key,
							argKey,
						);
					}

					return result.replace(replaceKey, replacement);
				}

				case "number": {
					if (typeof argValue !== "number") {
						throw new I18nError(
							`Expected number for number parameter '${argKey}', got ${typeof argValue}`,
							locale,
							key,
							argKey,
						);
					}

					const numberFormatter = getNumberFormatter(locale, translationParams.number?.[argKey]);
					return result.replace(replaceKey, numberFormatter.format(argValue));
				}

				case "list": {
					if (!Array.isArray(argValue)) {
						throw new I18nError(
							`Expected array for list parameter '${argKey}', got ${typeof argValue}`,
							locale,
							key,
							argKey,
						);
					}

					const listFormatter = getListFormatter(locale, translationParams.list?.[argKey]);
					return result.replace(replaceKey, listFormatter.format(argValue));
				}

				case "date": {
					if (!(argValue instanceof Date)) {
						throw new I18nError(
							`Expected Date for date parameter '${argKey}', got ${typeof argValue}`,
							locale,
							key,
							argKey,
						);
					}

					const dateFormatter = getDateTimeFormatter(locale, translationParams.date?.[argKey]);
					return result.replace(replaceKey, dateFormatter.format(argValue));
				}

				case "relativeTime": {
					if (
						typeof argValue !== "object" ||
						argValue === null ||
						!("value" in argValue) ||
						!("unit" in argValue)
					) {
						throw new I18nError(
							`Expected {value: number, unit: string} for relativeTime parameter '${argKey}'`,
							locale,
							key,
							argKey,
						);
					}

					const { value, unit } = argValue as {
						value: number;
						unit: Intl.RelativeTimeFormatUnit;
					};
					if (typeof value !== "number" || typeof unit !== "string") {
						throw new I18nError(
							`Invalid relativeTime format for parameter '${argKey}'`,
							locale,
							key,
							argKey,
						);
					}

					const relativeTimeFormatter = getRelativeTimeFormatter(
						locale,
						translationParams.relativeTime?.[argKey],
					);
					return result.replace(replaceKey, relativeTimeFormatter.format(value, unit));
				}

				default:
					// Default to string conversion for untyped parameters
					return result.replace(replaceKey, String(argValue));
			}
		} catch (error) {
			// Re-throw I18nError, wrap other errors
			if (error instanceof I18nError) {
				throw error;
			}
			throw new I18nError(
				`Failed to process parameter '${argKey}': ${error instanceof Error ? error.message : JSON.stringify(error)}`,
				locale,
				key,
				argKey,
			);
		}
	}, str);
}
