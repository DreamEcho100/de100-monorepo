import { LOCALE_COOKIE_NAME, PREFERENCE_COOKIE_MAX_AGE } from "@de100/i18n-core/shared";
import { getCookie, getRequestHeader, setCookie } from "@solidjs/start/http";
import { createMiddleware } from "@solidjs/start/middleware";

import {
	createLocalizedPath,
	isLocaleManagedPathname,
	resolvePreferredLocale,
	splitLocaleFromPathname,
} from "../../i18n/routing";

export default createMiddleware({
	onRequest: (event) => {
		const persistLocaleCookie = (locale: string) => {
			const currentCookieLocale = getCookie(event.nativeEvent, LOCALE_COOKIE_NAME);
			if (currentCookieLocale === locale) {
				return;
			}

			setCookie(event.nativeEvent, LOCALE_COOKIE_NAME, locale, {
				maxAge: PREFERENCE_COOKIE_MAX_AGE,
				path: "/",
				sameSite: "lax",
			});
		};

		if (event.request.method !== "GET" && event.request.method !== "HEAD") {
			return;
		}

		const requestUrl = new URL(event.request.url);
		if (!isLocaleManagedPathname(requestUrl.pathname)) {
			return;
		}

		const { localeInPathname, pathnameWithoutLocale } = splitLocaleFromPathname(
			requestUrl.pathname,
		);
		if (localeInPathname) {
			persistLocaleCookie(localeInPathname);
			return;
		}

		const preferredLocale = resolvePreferredLocale({
			cookieLocale: getCookie(event.nativeEvent, LOCALE_COOKIE_NAME),
			headerLocale: getRequestHeader(event.nativeEvent, "accept-language"),
		});

		persistLocaleCookie(preferredLocale);
		requestUrl.pathname = createLocalizedPath(preferredLocale, pathnameWithoutLocale);

		return Response.redirect(requestUrl.toString(), 307);
	},
});
