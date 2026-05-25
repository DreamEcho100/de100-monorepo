import { useI18n } from "@de100/i18n-domains-solidjs/client";
import { createMemo, For } from "solid-js";

import PreferencesToolbar from "~/components/preferences-toolbar";
import UserMenu from "~/components/user-menu";

import { createLocalizedPath } from "../../i18n/routing";

export default function Header() {
	const { locale, t } = useI18n();
	const links = createMemo(() => [
		{ href: createLocalizedPath(locale(), "/"), label: t("header.nav.home") },
		{ href: createLocalizedPath(locale(), "/login"), label: t("header.nav.login") },
		{ href: createLocalizedPath(locale(), "/dashboard"), label: t("header.nav.dashboard") },
		{ href: createLocalizedPath(locale(), "/media"), label: t("header.nav.media") },
		{ href: createLocalizedPath(locale(), "/todos"), label: t("header.nav.todos") },
	]);

	return (
		<header class="sticky top-0 z-40 border-border/70 border-b bg-background/95 supports-backdrop-filter:backdrop-blur">
			<a
				class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:font-medium focus:text-primary-foreground focus:text-sm focus:shadow-lg"
				href="#main-content"
			>
				{t("header.skipToMainContent")}
			</a>
			<div class="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-[clamp(1rem,2vw+0.5rem,2rem)] py-4">
				<nav aria-label={t("header.primaryNavigation")} class="flex flex-wrap gap-2">
					<For each={links()}>
						{(link) => (
							<a
								class="inline-flex items-center rounded-full border border-transparent px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:border-border/70 hover:bg-accent hover:text-accent-foreground"
								href={link.href}
							>
								{link.label}
							</a>
						)}
					</For>
				</nav>
				<div class="flex flex-wrap items-center justify-end gap-3">
					<PreferencesToolbar />
					<UserMenu />
				</div>
			</div>
		</header>
	);
}
