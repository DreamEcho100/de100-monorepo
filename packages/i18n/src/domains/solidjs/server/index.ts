import { createRequestAppI18nSnapshot } from "../../../core/server/index";
import type {
	AppI18nLocaleCode,
	AppI18nLocaleDef,
	AppI18nLocaleDefShape,
} from "../../../core/shared/index";

export function createServerI18nState(options: {
	defaultLocale: AppI18nLocaleCode;
	locales: readonly (AppI18nLocaleDef extends AppI18nLocaleDefShape
		? AppI18nLocaleDef
		: AppI18nLocaleDefShape)[];
	request?: Request;
}) {
	const initialSnapshot = createRequestAppI18nSnapshot({
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
