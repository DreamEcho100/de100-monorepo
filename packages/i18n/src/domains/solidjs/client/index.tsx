import type { ParentProps } from "solid-js";
import {
	createContext,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
	useContext,
} from "solid-js";

import {
	applyDocumentSnapshot,
	getSystemTheme,
	persistCookie,
	resolveThemePreference,
} from "../../../core/client/index";
import type {
	AppI18nLocaleCode,
	AppI18nSnapshot,
	AppI18nTranslations,
	ResolvedTheme,
	ThemePreference,
} from "../../../core/shared/index";
import { getMessage, LOCALE_COOKIE_NAME, THEME_COOKIE_NAME } from "../../../core/shared/index";
import type { I18nContextValue, I18nProviderProps } from "../shared/index";

const I18nContext = createContext<I18nContextValue<AppI18nLocaleCode, AppI18nTranslations>>();

export function I18nProvider(
	props: ParentProps<I18nProviderProps<AppI18nLocaleCode, AppI18nTranslations>>,
) {
	if (props.locales.length === 0) {
		throw new Error("I18nProvider requires at least one locale definition.");
	}

	const defaultLocale = props.locales[0]!;
	const fallbackLocale =
		props.locales.find((candidate) => candidate.code === props.initialSnapshot.locale) ??
		defaultLocale;
	const localeMap = new Map(props.locales.map((locale) => [locale.code, locale] as const));
	const [localeCode, setLocaleCode] = createSignal<AppI18nLocaleCode>(
		fallbackLocale.code as AppI18nLocaleCode,
	);
	const [themePreference, setThemePreferenceSignal] = createSignal<ThemePreference>(
		props.initialSnapshot.themePreference,
	);
	const [systemTheme, setSystemTheme] = createSignal<ResolvedTheme>(
		props.initialSnapshot.resolvedTheme,
	);
	const locale = createMemo(() => localeCode());
	const currentLocale = createMemo(
		() => localeMap.get(localeCode() as AppI18nLocaleCode) ?? fallbackLocale,
	);
	const dir = createMemo(() => currentLocale().dir);
	const messages = createMemo(() => currentLocale().messages);
	const resolvedTheme = createMemo(() => resolveThemePreference(themePreference(), systemTheme()));

	onMount(() => {
		if (typeof window.matchMedia !== "function") {
			setSystemTheme(getSystemTheme());
			return;
		}

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const syncSystemTheme = () => {
			setSystemTheme(mediaQuery.matches ? "dark" : "light");
		};

		syncSystemTheme();
		mediaQuery.addEventListener("change", syncSystemTheme);
		onCleanup(() => mediaQuery.removeEventListener("change", syncSystemTheme));
	});

	createEffect(() => {
		if (typeof document === "undefined") {
			return;
		}

		const nextSnapshot: AppI18nSnapshot = {
			dir: dir(),
			locale: locale(),
			resolvedTheme: resolvedTheme(),
			themePreference: themePreference(),
		};

		applyDocumentSnapshot(nextSnapshot);
		persistCookie(LOCALE_COOKIE_NAME, nextSnapshot.locale);
		persistCookie(THEME_COOKIE_NAME, nextSnapshot.themePreference);
	});

	const setLocale = (nextLocale: AppI18nLocaleCode | (string & {})) => {
		if (localeMap.has(nextLocale as AppI18nLocaleCode)) {
			setLocaleCode(nextLocale as AppI18nLocaleCode);
		}
	};

	const setThemePreference = (nextThemePreference: ThemePreference) => {
		setThemePreferenceSignal(nextThemePreference);
	};

	const t = (key: AppI18nLocaleCode | (string & {}), fallback?: string) =>
		getMessage(messages(), key, getMessage(fallbackLocale.messages, key, fallback ?? key));
	const contextValue: I18nContextValue<AppI18nLocaleCode, AppI18nTranslations> = {
		dir,
		locale: locale as () => AppI18nLocaleCode,
		locales: props.locales as unknown as I18nContextValue<
			AppI18nLocaleCode,
			AppI18nTranslations
		>["locales"],
		messages: messages as () => AppI18nTranslations,
		resolvedTheme,
		setLocale,
		setThemePreference,
		t,
		themePreference,
	};

	return <I18nContext.Provider value={contextValue}>{props.children}</I18nContext.Provider>;
}

export function useI18n<
	TLocaleCode extends AppI18nLocaleCode = AppI18nLocaleCode,
	TMessages extends AppI18nTranslations = AppI18nTranslations,
>() {
	const context = useContext(I18nContext);

	if (!context) {
		throw new Error("useI18n must be used within an I18nProvider.");
	}

	return context as unknown as I18nContextValue<TLocaleCode, TMessages>;
}
