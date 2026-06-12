import {
	applyDocumentSnapshot,
	getSystemTheme,
	persistCookie,
	resolveThemePreference,
} from "@de100/i18n-core/client";
import type {
	I18nLocaleCode,
	I18nLocaleMessages,
	I18nSnapshot,
	I18nTranslations,
	ResolvedTheme,
	ThemePreference,
} from "@de100/i18n-core/shared";
import {
	generateI18nConfig,
	I18nError,
	// getMessage,
	LOCALE_COOKIE_NAME,
	THEME_COOKIE_NAME,
} from "@de100/i18n-core/shared";
import type { JSX, ParentProps } from "solid-js";
import {
	createContext,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
	splitProps,
	useContext,
} from "solid-js";

import type { I18nContextValue, I18nProviderProps } from "../shared/index";

const I18nContext = createContext<I18nContextValue<I18nLocaleCode, I18nTranslations>>();

export function I18nProvider(
	props: ParentProps<I18nProviderProps<I18nLocaleCode, I18nTranslations>>,
) {
	if (props.locales.length === 0) {
		throw new Error("I18nProvider requires at least one locale definition.");
	}

	const defaultLocale = props.locales[0];
	if (!defaultLocale) {
		throw new Error("I18nProvider requires at least one locale definition.");
	}

	const fallbackLocale =
		props.locales.find((candidate) => candidate.code === props.initialSnapshot.locale) ??
		defaultLocale;
	const localeMap = new Map(props.locales.map((locale) => [locale.code, locale] as const));
	const initialTranslations = Object.fromEntries(
		props.locales.map((locale) => [locale.code, locale.messages]),
	) as Record<string, I18nLocaleMessages<I18nTranslations>>;
	const [localeCode, setLocaleCode] = createSignal<I18nLocaleCode>(
		fallbackLocale.code as I18nLocaleCode,
	);
	const [translations, setTranslations] =
		createSignal<Record<string, I18nLocaleMessages<I18nTranslations>>>(initialTranslations);
	const [loadingCount, setLoadingCount] = createSignal(0);
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
	const messages = createMemo(
		() => (translations()[locale()] ?? currentLocale().messages) as I18nTranslations,
	);
	const resolvedTheme = createMemo(() => resolveThemePreference(themePreference(), systemTheme()));
	const isLoadingTranslations = createMemo(() => loadingCount() > 0);

	const i18nConfig = createMemo(() =>
		generateI18nConfig({
			locale: locale(),
			fallbackLocale: props.fallbackLocale ?? defaultLocale.code,
			translations: translations(),
			i18nLocales: props.locales,
			onError: props.onError,
		}),
	);

	async function loadLocaleTranslations(nextLocale: I18nLocaleCode) {
		if (translations()[nextLocale] || !props.loadTranslations) {
			return;
		}

		setLoadingCount((count) => count + 1);
		try {
			const loadedMessages = await props.loadTranslations(nextLocale);
			if (!loadedMessages) {
				return;
			}
			setTranslations((currentTranslations) => ({
				...currentTranslations,
				[nextLocale]: loadedMessages as I18nLocaleMessages<I18nTranslations>,
			}));
		} catch (error) {
			props.onError?.(
				new I18nError(
					`Failed to load translations: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
					String(nextLocale),
				),
			);
		} finally {
			setLoadingCount((count) => Math.max(0, count - 1));
		}
	}

	let activeLocaleRequestId = 0;
	const setLocale = async (nextLocale: I18nLocaleCode | (string & {})) => {
		if (localeMap.has(nextLocale as I18nLocaleCode)) {
			const requestId = ++activeLocaleRequestId;
			await loadLocaleTranslations(nextLocale as I18nLocaleCode);
			if (requestId !== activeLocaleRequestId) {
				return;
			}
			setLocaleCode(nextLocale as I18nLocaleCode);
		}
	};

	const setThemePreference = (nextThemePreference: ThemePreference) => {
		setThemePreferenceSignal(nextThemePreference);
	};

	const contextValue: I18nContextValue<I18nLocaleCode, I18nTranslations> = {
		dir,
		createLocalizedPath: props.createLocalizedPath as
			| I18nContextValue<I18nLocaleCode, I18nTranslations>["createLocalizedPath"]
			| undefined,
		isLoadingTranslations,
		locales: props.locales as unknown as I18nContextValue<
			I18nLocaleCode,
			I18nTranslations
		>["locales"],
		messages: messages as () => I18nTranslations,
		resolvedTheme,
		setLocale,
		setThemePreference,
		clearCache: () => i18nConfig().clearCache(),
		i18nLocalCodeToDef: i18nConfig().i18nLocalCodeToDef,
		t: ((key: string, args?: Record<string, unknown>) => {
			const translate = i18nConfig().t as (key: string, args?: Record<string, unknown>) => string;
			return translate(key, args);
		}) as I18nContextValue<I18nLocaleCode, I18nTranslations>["t"],
		locale: locale as () => I18nLocaleCode,
		themePreference,
	};

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

	onCleanup(() => {
		contextValue.clearCache();
	});

	return <I18nContext.Provider value={contextValue}>{props.children}</I18nContext.Provider>;
}

export type I18nAProps = Omit<JSX.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
	href: string;
	locale?: I18nLocaleCode | (string & {});
	localize?: boolean;
};

function shouldLocalizeHref(href: string) {
	return href.startsWith("/") && !href.startsWith("//");
}

export function I18nA(props: I18nAProps) {
	const i18n = useI18n();
	const [local, anchorProps] = splitProps(props, ["href", "locale", "localize"]);
	const href = createMemo(() => {
		if (local.localize === false || !shouldLocalizeHref(local.href)) {
			return local.href;
		}

		return (
			i18n.createLocalizedPath?.((local.locale ?? i18n.locale()) as I18nLocaleCode, local.href) ??
			local.href
		);
	});

	return <a {...anchorProps} href={href()} />;
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
