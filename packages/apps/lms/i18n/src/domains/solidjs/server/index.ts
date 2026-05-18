import { createRequestI18nSnapshot } from "../../../core/server/index";
import type { LocaleDefinition, MessageDictionary } from "../../../core/shared/index";

export function createServerI18nState<
	TLocale extends string,
	TMessages extends MessageDictionary,
>(options: {
	defaultLocale: TLocale;
	locales: readonly LocaleDefinition<TLocale, TMessages>[];
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
