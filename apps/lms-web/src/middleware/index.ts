import { LOCALE_COOKIE_NAME, PREFERENCE_COOKIE_MAX_AGE } from "@de100/i18n-core/shared";
import { createMiddleware } from "@solidjs/start/middleware";
import type { ResponseStub } from "@solidjs/start/server";

import {
	createLocalizedPath,
	isLocaleManagedPathname,
	resolvePreferredLocale,
	splitLocaleFromPathname,
} from "../../i18n/routing";

function readCookie(request: Request, cookieName: string) {
	const cookieHeader = request.headers.get("cookie");
	if (!cookieHeader) {
		return undefined;
	}

	for (const part of cookieHeader.split(";")) {
		const trimmed = part.trim();
		if (!trimmed) {
			continue;
		}

		const separatorIndex = trimmed.indexOf("=");
		if (separatorIndex < 0) {
			continue;
		}

		const key = trimmed.slice(0, separatorIndex);
		if (key !== cookieName) {
			continue;
		}

		const rawValue = trimmed.slice(separatorIndex + 1);
		try {
			return decodeURIComponent(rawValue);
		} catch {
			return rawValue;
		}
	}

	return undefined;
}

function appendLocaleCookie(response: ResponseStub, locale: string) {
	const encodedLocale = encodeURIComponent(locale);
	response.headers.append(
		"set-cookie",
		`${LOCALE_COOKIE_NAME}=${encodedLocale}; Max-Age=${PREFERENCE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`,
	);
}

export default createMiddleware({
	onRequest: (event) => {
		const persistLocaleCookie = (locale: string) => {
			const currentCookieLocale = readCookie(event.request, LOCALE_COOKIE_NAME);
			if (currentCookieLocale === locale) {
				return;
			}

			appendLocaleCookie(event.response, locale);
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
			cookieLocale: readCookie(event.request, LOCALE_COOKIE_NAME),
			headerLocale: event.request.headers.get("accept-language"),
		});

		persistLocaleCookie(preferredLocale);
		requestUrl.pathname = createLocalizedPath(preferredLocale, pathnameWithoutLocale);

		return Response.redirect(requestUrl.toString(), 307);
	},
});
