export * as DEF from "./def";

import type { I18nLocalCodeToDef, I18nLocaleCode, I18nLocaleDef } from "@de100/apps-lms-i18n";

import { arMessages } from "./messages/ar.ts";
import { enMessages } from "./messages/en.ts";

export { arMessages, enMessages, type I18nLocalCodeToDef, type I18nLocaleCode, type I18nLocaleDef };

export const appI18nLocales: readonly I18nLocaleDef[] = [
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

export const appI18nLocalCodeToDef: I18nLocalCodeToDef = appI18nLocales.reduce((acc, locale) => {
	acc[locale.code] = locale;
	return acc;
}, {} as I18nLocalCodeToDef);

export const appI18nDefaultLocale: I18nLocaleCode = "en";

export function getI18nI18nLocaleDefShape(locale: I18nLocaleCode | string) {
	const fallbackLocale = appI18nLocales[0];

	if (!fallbackLocale) {
		throw new Error("At least one app locale must be configured.");
	}

	return appI18nLocales.find((candidate) => candidate.code === locale) ?? fallbackLocale;
}
