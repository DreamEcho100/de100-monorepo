import { useI18n } from "@de100/apps-lms-i18n";
import {
	Badge,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@de100/ui-solidjs";
import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { createQuery } from "@tanstack/solid-query";
import { createSignal, For, Match, onMount, Switch } from "solid-js";

import { openApiDocsPath } from "~/libs/apis/openapi-routes";
import { orpc } from "~/libs/apis/orpc";

import { createLocalizedPath } from "../i18n/routing";

const demoAccounts = [
	{ descriptionKey: "home.accounts.owner", email: "owner@lms.test" },
	{ descriptionKey: "home.accounts.viewer", email: "viewer@lms.test" },
	{ descriptionKey: "home.accounts.empty", email: "empty@lms.test" },
] as const;

const featureKeys = [
	"home.features.restoredAuth",
	"home.features.tasks",
	"home.features.storage",
	"home.features.reference",
] as const;

export default function HomePage() {
	const { locale, t } = useI18n();
	const [isHydrated, setIsHydrated] = createSignal(false);
	const healthCheck = createQuery(() => ({
		...orpc.healthCheck.queryOptions(),
		enabled: isHydrated(),
	}));

	onMount(() => {
		setIsHydrated(true);
	});

	return (
		<main
			class="mx-auto grid min-h-screen w-full max-w-6xl gap-6 px-[clamp(1rem,2vw+0.5rem,2rem)] py-10"
			id="main-content"
		>
			<Title>{t("meta.appTitle")}</Title>
			<Card class="border-primary/10 bg-card/95 shadow-black/5 shadow-sm">
				<CardHeader class="space-y-4">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="space-y-2">
							<p class="font-semibold text-primary text-xs uppercase tracking-[0.24em]">
								{t("home.eyebrow")}
							</p>
							<CardTitle class="text-balance text-4xl tracking-tight">{t("home.title")}</CardTitle>
							<CardDescription class="max-w-[72ch] text-base leading-7">
								{t("home.description")}
							</CardDescription>
						</div>
						<Badge variant="secondary">SolidStart + Better Auth + oRPC</Badge>
					</div>
					<p class="max-w-[70ch] text-muted-foreground text-sm leading-6">{t("home.lede")}</p>
					<div class="flex flex-wrap gap-3">
						<A class="button secondary" href={createLocalizedPath(locale(), "/login")}>
							{t("home.ctas.auth")}
						</A>
						<A class="button secondary" href={createLocalizedPath(locale(), "/dashboard")}>
							{t("home.ctas.dashboard")}
						</A>
						<A class="button secondary" href={createLocalizedPath(locale(), "/todos")}>
							{t("home.ctas.todos")}
						</A>
						<A class="button secondary" href={createLocalizedPath(locale(), "/media")}>
							{t("home.ctas.media")}
						</A>
						<A class="button secondary" href={createLocalizedPath(locale(), openApiDocsPath)}>
							{t("home.ctas.apiReference")}
						</A>
					</div>
				</CardHeader>
			</Card>

			<div class="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.9fr)]">
				<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
					<CardHeader>
						<CardTitle>{t("home.features.title")}</CardTitle>
						<CardDescription>{t("home.features.description")}</CardDescription>
					</CardHeader>
					<CardContent>
						<ul class="grid gap-3">
							<For each={featureKeys}>
								{(featureKey) => (
									<li class="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm leading-6">
										{t(featureKey)}
									</li>
								)}
							</For>
						</ul>
					</CardContent>
				</Card>

				<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
					<CardHeader>
						<CardTitle>{t("home.api.title")}</CardTitle>
						<CardDescription>{t("home.api.description")}</CardDescription>
					</CardHeader>
					<CardContent>
						<Switch>
							<Match when={!isHydrated() || healthCheck.isPending}>
								<p
									class="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sky-700 text-sm leading-6 dark:text-sky-300"
									role="status"
								>
									{t("home.api.pending")}
								</p>
							</Match>
							<Match when={healthCheck.isError}>
								<p
									class="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive text-sm leading-6"
									role="alert"
								>
									{t("home.api.error")}
								</p>
							</Match>
							<Match when={healthCheck.data}>
								{(healthStatus) => (
									<p
										class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-700 text-sm leading-6 dark:text-emerald-300"
										role="status"
									>
										{t("home.api.successPrefix")} {healthStatus()}
									</p>
								)}
							</Match>
						</Switch>
					</CardContent>
				</Card>
			</div>

			<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
				<CardHeader>
					<CardTitle>{t("home.accounts.title")}</CardTitle>
					<CardDescription>{t("home.accounts.description")}</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="grid gap-3 md:grid-cols-3">
						<For each={demoAccounts}>
							{(account) => (
								<section class="rounded-xl border border-border/70 bg-muted/20 px-4 py-4">
									<p class="font-medium text-foreground text-sm">{account.email}</p>
									<p class="mt-2 text-muted-foreground text-sm leading-6">
										{t(account.descriptionKey)}
									</p>
									<p class="mt-3 font-mono text-muted-foreground text-xs">
										{t("home.accounts.passwordLabel")}: SeedDemo123!
									</p>
								</section>
							)}
						</For>
					</div>
				</CardContent>
			</Card>
		</main>
	);
}
