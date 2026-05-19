export type * as DEF from "./def.d.ts";

import type { I18nLocalCodeToDef, I18nLocaleCode, I18nLocaleDef } from "@de100/i18n-core/shared";

import { arMessages } from "./messages/ar.ts";
import { enMessages } from "./messages/en.ts";

export { arMessages, enMessages, type I18nLocalCodeToDef, type I18nLocaleCode, type I18nLocaleDef };

export const i18nLocales: readonly I18nLocaleDef[] = [
	{
		code: "en",
		dir: "ltr",
		label: "English",
		messages: enMessages,
	},
	{
		code: "ar",
		dir: "rtl",
		label: "العربية",
		messages: arMessages,
	},
];

export const i18nLocalCodeToDef: I18nLocalCodeToDef = i18nLocales.reduce((acc, locale) => {
	acc[locale.code] = locale;
	return acc;
}, {} as I18nLocalCodeToDef);

export const i18nDefaultLocale: I18nLocaleCode = "en";

export function getI18nLocaleDefShape(locale: I18nLocaleCode | string) {
	const fallbackLocale = i18nLocales[0];

	if (!fallbackLocale) {
		throw new Error("At least one app locale must be configured.");
	}

	return i18nLocales.find((candidate) => candidate.code === locale) ?? fallbackLocale;
}
