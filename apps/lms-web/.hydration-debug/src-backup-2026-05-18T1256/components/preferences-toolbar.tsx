import type { ThemePreference } from "@de100/apps-lms-i18n";
import { useI18n } from "@de100/apps-lms-i18n";
import { createMemo } from "solid-js";

const themeOrder: readonly ThemePreference[] = ["system", "light", "dark"];

function getNextThemePreference(currentThemePreference: ThemePreference) {
	const currentThemePreferenceIndex = themeOrder.indexOf(currentThemePreference);
	return themeOrder[(currentThemePreferenceIndex + 1) % themeOrder.length] ?? "system";
}

export default function PreferencesToolbar() {
	const { locale, locales, setLocale, setThemePreference, t, themePreference } = useI18n();
	const nextLocale = createMemo(() => {
		const fallbackLocale = locales[0];
		if (!fallbackLocale) {
			throw new Error("The LMS app requires at least one configured locale.");
		}

		const currentLocaleIndex = locales.findIndex(
			(candidateLocale) => candidateLocale.code === locale(),
		);

		return locales[(currentLocaleIndex + 1) % locales.length] ?? fallbackLocale;
	});

	return (
		<div class="flex flex-wrap gap-2">
			<button
				class="inline-flex items-center rounded-full border border-border/70 bg-card px-3 py-2 font-medium text-foreground text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
				onClick={() => setThemePreference(getNextThemePreference(themePreference()))}
				type="button"
			>
				{t("header.theme")}: {t(`header.themes.${themePreference()}`)}
			</button>
			<button
				class="inline-flex items-center rounded-full border border-border/70 bg-card px-3 py-2 font-medium text-foreground text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
				onClick={() => setLocale(nextLocale().code)}
				type="button"
			>
				{t("header.language")}: {nextLocale().label}
			</button>
		</div>
	);
}
