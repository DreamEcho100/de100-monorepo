export * as DEF from "./def";

import type {
	AppI18nLocalCodeToDef,
	AppI18nLocaleCode,
	AppI18nLocaleDef,
} from "@de100/apps-lms-i18n";

import { arMessages } from "./messages/ar.ts";
import { enMessages } from "./messages/en.ts";

export {
	type AppI18nLocalCodeToDef,
	type AppI18nLocaleCode,
	type AppI18nLocaleDef,
	arMessages,
	enMessages,
};

export const appI18nLocales: readonly AppI18nLocaleDef[] = [
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

export const appI18nLocalCodeToDef: AppI18nLocalCodeToDef = appI18nLocales.reduce((acc, locale) => {
	acc[locale.code] = locale;
	return acc;
}, {} as AppI18nLocalCodeToDef);

export const appI18nDefaultLocale: AppI18nLocaleCode = "en";

export function getAppI18nAppI18nLocaleDefShape(locale: AppI18nLocaleCode | string) {
	const fallbackLocale = appI18nLocales[0];

	if (!fallbackLocale) {
		throw new Error("At least one app locale must be configured.");
	}

	return appI18nLocales.find((candidate) => candidate.code === locale) ?? fallbackLocale;
}
