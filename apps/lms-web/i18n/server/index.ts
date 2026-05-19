import type { ThemePreference } from "@de100/apps-lms-i18n";
import { createServerI18nState } from "@de100/apps-lms-i18n";

import { splitLocaleFromPathname } from "../routing";
import { appI18nDefaultLocale, appI18nLocales } from "../shared";

export function getServerAppI18nState(request?: Request) {
	const state = createServerI18nState({
		defaultLocale: appI18nDefaultLocale,
		locales: appI18nLocales,
		request,
	});
	const pathnameLocale = request
		? splitLocaleFromPathname(new URL(request.url).pathname).localeInPathname
		: undefined;

	if (!pathnameLocale) {
		return state;
	}

	const activeLocale = appI18nLocales.find((candidate) => candidate.code === pathnameLocale);
	if (!activeLocale) {
		return state;
	}

	return {
		...state,
		activeLocale,
		initialSnapshot: {
			...state.initialSnapshot,
			dir: activeLocale.dir,
			locale: activeLocale.code,
		},
	};
}

export function createThemeBootstrapScript(themePreference: ThemePreference) {
	return `(() => {
		const root = document.documentElement;
		const themePreference = ${JSON.stringify(themePreference)};
		const systemTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
		const resolvedTheme = themePreference === "system" ? systemTheme : themePreference;
		root.dataset.themePreference = themePreference;
		root.dataset.resolvedTheme = resolvedTheme;
		root.classList.toggle("dark", resolvedTheme === "dark");
		root.style.colorScheme = resolvedTheme;
	})();`;
}
