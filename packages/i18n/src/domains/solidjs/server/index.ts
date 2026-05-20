import { createRequestI18nSnapshot } from "../../../core/server/index";
import type { I18nLocaleCode, I18nLocaleDef, I18nLocaleDefShape } from "../../../core/shared/index";

export function createServerI18nState(options: {
	defaultLocale: I18nLocaleCode;
	locales: readonly (I18nLocaleDef extends I18nLocaleDefShape
		? I18nLocaleDef
		: I18nLocaleDefShape)[];
	request?: Request;
}) {
	const initialSnapshot = createRequestI18nSnapshot({
		defaultLocale: options.defaultLocale,
		locales: options.locales,
		request: options.request,
	});
	const activeLocale =
		options.locales.find((candidate) => candidate.code === initialSnapshot.locale) ??
		options.locales[0];

	return {
		activeLocale,
		initialSnapshot,
		locales: options.locales,
	};
}
