import type { I18nMessage, I18nTranslations, I18nTranslationsShape } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TObj = Record<string, any>;

/**
 * Utility type to join two string keys with a dot
 * Used for creating nested translation key paths like "user.profile.name"
 */
type Join<Key, Part> = Key extends string
	? Part extends string
		? `${Key}.${Part}`
		: never
	: never;

/**
 * Parse parameter type definitions and return the corresponding TypeScript interface
 * Each parameter type has specific requirements for the options object
 */
type ParseOptionType<
	ParamType extends string,
	ParamName extends string,
> = ParamType extends "number"
	? { number?: Partial<Record<ParamName, Intl.NumberFormatOptions>> }
	: ParamType extends "plural"
		? {
				plural: Record<
					ParamName,
					Partial<Record<Exclude<Intl.LDMLPluralRule, "other">, string>> & {
						other: string;
						formatter?: Intl.NumberFormatOptions;
						type?: Intl.PluralRuleType;
					}
				>;
			}
		: ParamType extends "date"
			? { date?: Partial<Record<ParamName, Intl.DateTimeFormatOptions>> }
			: ParamType extends "list"
				? { list?: Partial<Record<ParamName, Intl.ListFormatOptions>> }
				: ParamType extends "enum"
					? { enum: Record<ParamName, Record<string, string>> }
					: ParamType extends "relativeTime"
						? {
								relativeTime?: Partial<Record<ParamName, Intl.RelativeTimeFormatOptions>>;
							}
						: never;

/**
 * Extract parameter options from a translation string by parsing {param:type} patterns
 * Recursively processes the string to find all parameters and their types
 */
export type ExtractParamOptions<S extends string> =
	S extends `${string}{${infer Param}}${infer Rest}`
		? Param extends `${infer Name}:${infer Type}` // If the parameter has a type specification
			? ParseOptionType<Type, Name> & ExtractParamOptions<Rest> // Parse the type and continue with the rest
			: ExtractParamOptions<Rest> // Skip parameters without types and continue
		: unknown; // Base case: no more parameters found

/**
 * Generate all possible dot-notation paths for accessing nested translation objects
 * Recursively traverses the translation structure to create paths like "user.profile.name"
 */
export type DotPathsFor<TranslationRegistry extends TObj = I18nTranslations> = {
	[Key in keyof TranslationRegistry]: TranslationRegistry[Key] extends I18nMessage
		? Key // If it's a translation message, use the key as-is
		: TranslationRegistry[Key] extends TObj
			? Join<Key, DotPathsFor<TranslationRegistry[Key]>> // If it's nested, join with child paths
			: "never";
}[keyof TranslationRegistry];

/**
 * Map for enum parameter types - used for type-safe enum value validation
 */
type EnumMap = Record<string, Record<string, string>>;

/**
 * Parse the expected argument type for a parameter based on its type specification
 * Returns the TypeScript type that should be passed for each parameter type
 */
type ParseArgType<
	ParamType extends string,
	ParamName extends string,
	Enums extends EnumMap,
> = ParamType extends "number" | "plural"
	? number
	: ParamType extends "date"
		? Date
		: ParamType extends "list"
			? string[]
			: ParamType extends "relativeTime"
				? { value: number; unit: Intl.RelativeTimeFormatUnit }
				: ParamType extends "enum"
					? ParamName extends keyof Enums
						? keyof Enums[ParamName]
						: never
					: never;

/**
 * Extract all parameter arguments required for a translation string
 * Creates a record type with parameter names as keys and their expected types as values
 */
type ExtractParamArgs<
	S extends string,
	Enums extends EnumMap,
> = S extends `${string}{${infer Param}}${infer Rest}`
	? Param extends `${infer Name}:${infer Type}` // Parameter with type specification
		? Record<Name, ParseArgType<Type, Name, Enums>> & ExtractParamArgs<Rest, Enums>
		: Record<Param, string> & ExtractParamArgs<Rest, Enums> // Parameter without type (defaults to string)
	: unknown; // No more parameters

/**
 * Navigate through nested translation objects using dot-notation paths
 * Returns the translation value at the specified path
 */
type TranslationAtKeyWithParams<
	Translations,
	Key extends string,
> = Key extends `${infer First}.${infer Rest}`
	? First extends keyof Translations
		? TranslationAtKeyWithParams<Translations[First], Rest> // Continue navigation
		: never
	: Key extends keyof Translations
		? Translations[Key] // Found the final key
		: never;

type DefineTranslationReturn<
	TranslationKey extends string,
	TranslationOptions extends ExtractParamOptions<TranslationKey>,
> = [TranslationKey, TranslationOptions];

/**
 * Normalize translation values to a consistent tuple format
 * Converts simple strings to [string, {}] format for uniform processing
 */
type NormalizedTranslationAtKey<T> =
	T extends DefineTranslationReturn<infer TranslationKey, infer TranslationOptions>
		? [TranslationKey, TranslationOptions]
		: [
				T extends string ? T : never,
				// ReturnType<typeof defineTranslation>[1]
				DefineTranslationReturn<string, ExtractParamOptions<string>>[1],
			];

/**
 * Get normalized translation at a specific key path
 */
type NormalizedTranslationAtKeyWithParams<Key extends string> = NormalizedTranslationAtKey<
	TranslationAtKeyWithParams<I18nTranslations, Key>
>;

/**
 * Extract parameter types for a specific translation path
 * Used to enforce type safety when calling translation functions
 */
export type Params<S extends DotPathsFor> = ExtractParamArgs<
	NormalizedTranslationAtKeyWithParams<S>[0],
	NormalizedTranslationAtKeyWithParams<S>[1] extends {
		enum: infer E;
	}
		? keyof E extends never
			? EnumMap
			: E
		: EnumMap
>;

/**
 * Translation paths that don't require any parameters
 */
export type PathsWithNoParams = {
	[K in DotPathsFor]: keyof Params<K> extends never ? K : never;
}[DotPathsFor];

/**
 * Translation paths that require parameters
 */
export type PathsWithParams = {
	[K in DotPathsFor]: keyof Params<K> extends never ? never : K;
}[DotPathsFor];
