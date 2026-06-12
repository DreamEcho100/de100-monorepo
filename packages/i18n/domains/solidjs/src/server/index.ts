import { createRequestI18nSnapshot } from "@de100/i18n-core/server";
import type { I18nLocaleCode, I18nLocaleDef, I18nLocaleDefShape } from "@de100/i18n-core/shared";
import { createI18nRouting } from "@de100/i18n-core/shared";

type ServerI18nLocaleDef = I18nLocaleDef extends I18nLocaleDefShape
	? I18nLocaleDef
	: I18nLocaleDefShape;

export function createServerI18nState(options: {
	defaultLocale: I18nLocaleCode;
	locales: readonly ServerI18nLocaleDef[];
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

export function createSolidStartI18nHelpers(options: {
	defaultLocale: I18nLocaleCode;
	locales: readonly ServerI18nLocaleDef[];
	shouldLocalizePathname?: (pathnameWithoutLocale: string, segments: readonly string[]) => boolean;
}) {
	const routing = createI18nRouting({
		defaultLocale: options.defaultLocale,
		locales: options.locales,
		shouldLocalizePathname: options.shouldLocalizePathname,
	});

	return {
		...routing,
		createLocalizedRedirect(locale: string, pathname: string, init?: ResponseInit) {
			return new Response(null, {
				status: init?.status ?? 302,
				...init,
				headers: {
					...Object.fromEntries(new Headers(init?.headers)),
					location: routing.createLocalizedPath(locale, pathname),
				},
			});
		},
		createServerI18nState(request?: Request) {
			return createServerI18nState({
				defaultLocale: options.defaultLocale,
				locales: options.locales,
				request,
			});
		},
	};
}
