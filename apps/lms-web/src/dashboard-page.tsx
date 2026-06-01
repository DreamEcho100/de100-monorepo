import { useI18n } from "@de100/i18n-domains-solidjs/client";
import {
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
import { useNavigate } from "@solidjs/router";
import { createQuery } from "@tanstack/solid-query";
import { createEffect, createMemo, createSignal, For, onMount, Show } from "solid-js";

import { authClient } from "~/libs/apis/auth-client";
import { orpc } from "~/libs/apis/orpc";

import { createLocalizedPath } from "../i18n/routing";

export default function DashboardPage() {
	const navigate = useNavigate();
	const { locale, t } = useI18n();
	const session = authClient.useSession();
	const [isHydrated, setIsHydrated] = createSignal(false);
	const canLoadPrivateData = () => isHydrated() && !session().isPending && !!session().data;
	const privateData = createQuery(() => ({
		...orpc.privateData.queryOptions(),
		enabled: canLoadPrivateData(),
	}));
	const todos = createQuery(() => ({
		...orpc.todo.getAll.queryOptions(),
		enabled: canLoadPrivateData(),
	}));
	const todoStats = createMemo(() => {
		const items = todos.data ?? [];
		const completed = items.filter((item) => item.completed).length;

		return {
			completed,
			open: items.length - completed,
			recent: items.slice(0, 3),
			total: items.length,
		};
	});

	onMount(() => {
		setIsHydrated(true);
	});

	createEffect(() => {
		const currentSession = session();
		if (currentSession.isPending || currentSession.data) {
			return;
		}

		navigate(createLocalizedPath(locale(), "/login"), { replace: true });
	});

	return (
		<main
			class="mx-auto grid w-full max-w-7xl items-start gap-6 px-[clamp(1rem,2vw+0.5rem,2rem)] pt-8 pb-16 lg:grid-cols-2"
			id="main-content"
		>
			<Title>{t("dashboard.metaTitle")}</Title>
			<Card class="border-primary/10 bg-card/95 shadow-black/5 shadow-sm lg:col-span-2">
				<CardHeader class="space-y-4">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="space-y-2">
							<P
								class="font-semibold text-primary text-xs uppercase tracking-[0.24em]"
								tone="accent"
							>
								{t("dashboard.page.eyebrow")}
							</P>
							<CardTitle>{t("dashboard.page.title")}</CardTitle>
							<CardDescription>{t("dashboard.page.description")}</CardDescription>
						</div>
						<Badge variant="secondary">
							{todoStats().total} {t("dashboard.stats.tasksSuffix")}
						</Badge>
					</div>
					<Show when={isHydrated() && !session().isPending && session().data}>
						{(currentSession) => (
							<P class="max-w-[60ch] text-base text-muted-foreground leading-7">
								{t("dashboard.page.welcomePrefix")} {currentSession().user.name}.{" "}
								{t("dashboard.page.welcomeSuffix")}
							</P>
						)}
					</Show>
					<Show when={!isHydrated() || session().isPending}>
						<P
							class="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sky-700 text-sm leading-6 dark:text-sky-300"
							role="status"
							tone="info"
						>
							{t("dashboard.status.loadingPage")}
						</P>
					</Show>
					<Button onClick={() => navigate(createLocalizedPath(locale(), "/todos"))} type="button">
						{t("dashboard.page.openTodos")}
					</Button>
				</CardHeader>
			</Card>

			<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
				<CardHeader>
					<CardTitle>{t("dashboard.api.title")}</CardTitle>
					<CardDescription>{t("dashboard.api.description")}</CardDescription>
				</CardHeader>
				<CardContent>
					<Show when={!canLoadPrivateData() || privateData.isPending}>
						<P
							class="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sky-700 text-sm leading-6 dark:text-sky-300"
							role="status"
							tone="info"
						>
							{t("dashboard.status.loadingPrivateData")}
						</P>
					</Show>
					<Show when={privateData.data}>
						{(data) => (
							<P
								class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-700 text-sm leading-6 dark:text-emerald-300"
								role="status"
								tone="success"
							>
								{data().message}
							</P>
						)}
					</Show>
					<Show when={canLoadPrivateData() && privateData.isError}>
						<P
							class="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive text-sm leading-6"
							role="alert"
							tone="danger"
						>
							{privateData.error instanceof Error
								? privateData.error.message
								: t("dashboard.status.privateDataError")}
						</P>
					</Show>
				</CardContent>
			</Card>

			<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
				<CardHeader>
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div>
							<CardTitle>{t("dashboard.todos.title")}</CardTitle>
							<CardDescription>{t("dashboard.todos.description")}</CardDescription>
						</div>
						<div class="flex gap-2">
							<Badge variant="secondary">
								{todoStats().open} {t("dashboard.stats.open")}
							</Badge>
							<Badge variant="outline">
								{todoStats().completed} {t("dashboard.stats.done")}
							</Badge>
						</div>
					</div>
				</CardHeader>
				<CardContent class="space-y-4">
					<Show when={!canLoadPrivateData() || todos.isPending}>
						<P
							class="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sky-700 text-sm leading-6 dark:text-sky-300"
							role="status"
							tone="info"
						>
							{t("dashboard.status.loadingSummary")}
						</P>
					</Show>
					<Show when={canLoadPrivateData() && todos.isError}>
						<P
							class="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive text-sm leading-6"
							role="alert"
							tone="danger"
						>
							{todos.error instanceof Error
								? todos.error.message
								: t("dashboard.status.summaryError")}
						</P>
					</Show>
					<Show
						when={
							canLoadPrivateData() && !todos.isPending && !todos.isError && todoStats().total === 0
						}
					>
						<P
							class="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-muted-foreground text-sm leading-6"
							role="status"
						>
							{t("dashboard.status.empty")}
						</P>
					</Show>
					<Show when={todoStats().recent.length > 0}>
						<ul class="space-y-3">
							<For each={todoStats().recent}>
								{(todo) => (
									<li class="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-4 py-3">
										<span classList={{ "line-through text-muted-foreground": todo.completed }}>
											{todo.text}
										</span>
										<Badge variant={todo.completed ? "outline" : "secondary"}>
											{todo.completed
												? t("dashboard.status.recentDone")
												: t("dashboard.status.recentOpen")}
										</Badge>
									</li>
								)}
							</For>
						</ul>
					</Show>
				</CardContent>
			</Card>
		</main>
	);
}
