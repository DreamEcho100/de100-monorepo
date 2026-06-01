import { useI18n } from "@de100/i18n-domains-solidjs/client";
import {
	Alert,
	AlertDescription,
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	P,
} from "@de100/ui-domains-solidjs";
import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { createQuery } from "@tanstack/solid-query";
import type { JSX } from "solid-js";
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

function HomeApiStatusAlert(props: {
	children: JSX.Element;
	role: "alert" | "status";
	variant?: "default" | "destructive";
}) {
	return (
		<Alert role={props.role} variant={props.variant ?? "default"}>
			<AlertDescription>{props.children}</AlertDescription>
		</Alert>
	);
}

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
							<P
								class="font-semibold text-primary text-xs uppercase tracking-[0.24em]"
								tone="accent"
							>
								{t("home.eyebrow")}
							</P>
							<CardTitle class="text-balance text-4xl tracking-tight">{t("home.title")}</CardTitle>
							<CardDescription class="max-w-[72ch] text-base leading-7">
								{t("home.description")}
							</CardDescription>
						</div>
						<Badge variant="secondary">{t("home.stackBadge")}</Badge>
					</div>
					<P class="max-w-[70ch] text-muted-foreground text-sm leading-6">{t("home.lede")}</P>
					<div class="flex flex-wrap gap-3">
						<Button as={A} href={createLocalizedPath(locale(), "/login")} variant="secondary">
							{t("home.ctas.auth")}
						</Button>
						<Button as={A} href={createLocalizedPath(locale(), "/dashboard")} variant="secondary">
							{t("home.ctas.dashboard")}
						</Button>
						<Button as={A} href={createLocalizedPath(locale(), "/todos")} variant="secondary">
							{t("home.ctas.todos")}
						</Button>
						<Button as={A} href={createLocalizedPath(locale(), "/media")} variant="secondary">
							{t("home.ctas.media")}
						</Button>
						<Button
							as={A}
							href={createLocalizedPath(locale(), openApiDocsPath)}
							variant="secondary"
						>
							{t("home.ctas.apiReference")}
						</Button>
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
								<HomeApiStatusAlert role="status">{t("home.api.pending")}</HomeApiStatusAlert>
							</Match>
							<Match when={healthCheck.isError}>
								<HomeApiStatusAlert role="alert" variant="destructive">
									{t("home.api.error")}
								</HomeApiStatusAlert>
							</Match>
							<Match when={healthCheck.data}>
								{(healthStatus) => (
									<HomeApiStatusAlert role="status">
										{t("home.api.successPrefix")} {healthStatus()}
									</HomeApiStatusAlert>
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
									<P class="font-medium text-foreground text-sm" tone="info" variant="caption-sm">
										{account.email}
									</P>
									<P class="mt-2 text-muted-foreground text-sm leading-6">
										{t(account.descriptionKey)}
									</P>
									<P class="mt-3 font-mono text-muted-foreground text-xs" variant="caption-sm">
										{t("home.accounts.passwordLabel")}: SeedDemo123!
									</P>
								</section>
							)}
						</For>
					</div>
				</CardContent>
			</Card>
		</main>
	);
}
