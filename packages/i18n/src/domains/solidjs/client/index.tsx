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
	I18nLocaleCode,
	I18nSnapshot,
	I18nTranslations,
	ResolvedTheme,
	ThemePreference,
} from "../../../core/shared/index";
import { generateI18nConfig, getMessage, LOCALE_COOKIE_NAME, THEME_COOKIE_NAME } from "../../../core/shared/index";
import type { I18nContextValue, I18nProviderProps } from "../shared/index";

const I18nContext = createContext<I18nContextValue<I18nLocaleCode, I18nTranslations>>();

export function I18nProvider(
	props: ParentProps<I18nProviderProps<I18nLocaleCode, I18nTranslations>>,
) {
	if (props.locales.length === 0) {
		throw new Error("I18nProvider requires at least one locale definition.");
	}

	const defaultLocale = props.locales[0]!;
	const fallbackLocale =
		props.locales.find((candidate) => candidate.code === props.initialSnapshot.locale) ??
		defaultLocale;
	const localeMap = new Map(props.locales.map((locale) => [locale.code, locale] as const));
	const [localeCode, setLocaleCode] = createSignal<I18nLocaleCode>(
		fallbackLocale.code as I18nLocaleCode,
	);
	const [themePreference, setThemePreferenceSignal] = createSignal<ThemePreference>(
		props.initialSnapshot.themePreference,
	);
	const [systemTheme, setSystemTheme] = createSignal<ResolvedTheme>(
		props.initialSnapshot.resolvedTheme,
	);
	const locale = createMemo(() => localeCode());
	const currentLocale = createMemo(
		() => localeMap.get(localeCode() as I18nLocaleCode) ?? fallbackLocale,
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

		const nextSnapshot: I18nSnapshot = {
			dir: dir(),
			locale: locale(),
			resolvedTheme: resolvedTheme(),
			themePreference: themePreference(),
		};

		applyDocumentSnapshot(nextSnapshot);
		persistCookie(LOCALE_COOKIE_NAME, nextSnapshot.locale);
		persistCookie(THEME_COOKIE_NAME, nextSnapshot.themePreference);
	});

	const setLocale = (nextLocale: I18nLocaleCode | (string & {})) => {
		if (localeMap.has(nextLocale as I18nLocaleCode)) {
			setLocaleCode(nextLocale as I18nLocaleCode);
		}
	};

	const setThemePreference = (nextThemePreference: ThemePreference) => {
		setThemePreferenceSignal(nextThemePreference);
	};


	const i18nConfig = createMemo(() => {
		generateI18nConfig({
		locale: locale(),
		// fallbackLocale: currentLocale(),
		translations: messages(),
	})

	});

	const t = (key: I18nLocaleCode | (string & {}), fallback?: string) =>
		getMessage(messages(), key, getMessage(fallbackLocale.messages, key, fallback ?? key));
	const contextValue: I18nContextValue<I18nLocaleCode, I18nTranslations> = {
		dir,
		locale: locale as () => I18nLocaleCode,
		locales: props.locales as unknown as I18nContextValue<
			I18nLocaleCode,
			I18nTranslations
		>["locales"],
		messages: messages as () => I18nTranslations,
		resolvedTheme,
		setLocale,
		setThemePreference,
		t,
		themePreference,
	};

	return <I18nContext.Provider value={contextValue}>{props.children}</I18nContext.Provider>;
}

export function useI18n<
	TLocaleCode extends I18nLocaleCode = I18nLocaleCode,
	TMessages extends I18nTranslations = I18nTranslations,
>() {
	const context = useContext(I18nContext);

	if (!context) {
		throw new Error("useI18n must be used within an I18nProvider.");
	}

	return context as unknown as I18nContextValue<TLocaleCode, TMessages>;
}
