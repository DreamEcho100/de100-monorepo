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
	I18nSnapshot,
	MessageDictionary,
	ResolvedTheme,
	ThemePreference,
} from "../../../core/shared/index";
import { getMessage, LOCALE_COOKIE_NAME, THEME_COOKIE_NAME } from "../../../core/shared/index";
import type { I18nContextValue, I18nProviderProps } from "../shared/index";

const I18nContext = createContext<I18nContextValue<string, MessageDictionary>>();

export function I18nProvider<TLocale extends string, TMessages extends MessageDictionary>(
	props: ParentProps<I18nProviderProps<TLocale, TMessages>>,
) {
	if (props.locales.length === 0) {
		throw new Error("I18nProvider requires at least one locale definition.");
	}

	const defaultLocale = props.locales[0]!;
	const fallbackLocale =
		props.locales.find((candidate) => candidate.code === props.initialSnapshot.locale) ??
		defaultLocale;
	const localeMap = new Map(props.locales.map((locale) => [locale.code, locale] as const));
	const [localeCode, setLocaleCode] = createSignal<string>(fallbackLocale.code);
	const [themePreference, setThemePreferenceSignal] = createSignal<ThemePreference>(
		props.initialSnapshot.themePreference,
	);
	const [systemTheme, setSystemTheme] = createSignal<ResolvedTheme>(
		props.initialSnapshot.resolvedTheme,
	);
	const locale = createMemo(() => localeCode() as TLocale);
	const currentLocale = createMemo(() => localeMap.get(localeCode() as TLocale) ?? fallbackLocale);
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

		const nextSnapshot: I18nSnapshot<TLocale> = {
			dir: dir(),
			locale: locale(),
			resolvedTheme: resolvedTheme(),
			themePreference: themePreference(),
		};

		applyDocumentSnapshot(nextSnapshot);
		persistCookie(LOCALE_COOKIE_NAME, nextSnapshot.locale);
		persistCookie(THEME_COOKIE_NAME, nextSnapshot.themePreference);
	});

	const setLocale = (nextLocale: string) => {
		if (localeMap.has(nextLocale as TLocale)) {
			setLocaleCode(nextLocale);
		}
	};

	const setThemePreference = (nextThemePreference: ThemePreference) => {
		setThemePreferenceSignal(nextThemePreference);
	};

	const t = (key: string, fallback?: string) =>
		getMessage(messages(), key, getMessage(fallbackLocale.messages, key, fallback ?? key));
	const contextValue: I18nContextValue<string, MessageDictionary> = {
		dir,
		locale: locale as () => string,
		locales: props.locales as unknown as I18nContextValue<string, MessageDictionary>["locales"],
		messages: messages as () => MessageDictionary,
		resolvedTheme,
		setLocale,
		setThemePreference,
		t,
		themePreference,
	};

	return <I18nContext.Provider value={contextValue}>{props.children}</I18nContext.Provider>;
}

export function useI18n<
	TLocale extends string = string,
	TMessages extends MessageDictionary = MessageDictionary,
>() {
	const context = useContext(I18nContext);

	if (!context) {
		throw new Error("useI18n must be used within an I18nProvider.");
	}

	return context as unknown as I18nContextValue<TLocale, TMessages>;
}
