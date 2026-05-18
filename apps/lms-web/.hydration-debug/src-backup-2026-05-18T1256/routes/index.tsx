import { useI18n } from "@de100/apps-lms-i18n";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@de100/ui-solidjs";
import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { createQuery } from "@tanstack/solid-query";
import { createSignal, Match, onMount, Switch } from "solid-js";

import { orpc } from "~/libs/apis/orpc";

export default function Home() {
	const navigate = useNavigate();
	const { t } = useI18n();
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
			class="mx-auto grid w-full max-w-6xl items-start gap-6 px-[clamp(1rem,2vw+0.5rem,2rem)] pt-8 pb-16"
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
							<CardTitle>{t("home.title")}</CardTitle>
							<CardDescription>{t("home.description")}</CardDescription>
						</div>
						<Badge variant="secondary">SolidStart + oRPC + Drizzle</Badge>
					</div>
					<p class="max-w-[60ch] text-base text-muted-foreground leading-7">{t("home.lede")}</p>
					<div class="flex flex-wrap gap-3">
						<Button onClick={() => navigate("/login")} type="button">
							{t("home.ctas.auth")}
						</Button>
						<Button onClick={() => navigate("/dashboard")} type="button" variant="secondary">
							{t("home.ctas.dashboard")}
						</Button>
						<Button onClick={() => navigate("/todos")} type="button" variant="outline">
							{t("home.ctas.todos")}
						</Button>
					</div>
				</CardHeader>
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
								{healthCheck.error instanceof Error
									? healthCheck.error.message
									: t("home.api.error")}
							</p>
						</Match>
						<Match when={healthCheck.data}>
							<p
								class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-700 text-sm leading-6 dark:text-emerald-300"
								role="status"
							>
								{t("home.api.successPrefix")} <strong>{healthCheck.data}</strong>
							</p>
						</Match>
					</Switch>
				</CardContent>
			</Card>
		</main>
	);
}
