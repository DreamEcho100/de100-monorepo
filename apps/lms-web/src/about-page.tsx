import { useI18n } from "@de100/i18n-domains-solidjs/client";
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

import { openApiDocsPath } from "~/libs/apis/openapi-routes";

import { createLocalizedPath } from "../i18n/routing";

const starterSlices = [
	"about.starterSlices.auth",
	"about.starterSlices.transport",
	"about.starterSlices.storage",
	"about.starterSlices.media",
] as const;

export default function AboutPage() {
	const { locale, t } = useI18n();

	return (
		<main
			class="mx-auto grid w-full max-w-6xl items-start gap-6 px-[clamp(1rem,2vw+0.5rem,2rem)] pt-8 pb-16"
			id="main-content"
		>
			<Title>{t("about.metaTitle")}</Title>
			<Card class="border-primary/10 bg-card/95 shadow-black/5 shadow-sm">
				<CardHeader class="space-y-4">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="space-y-2">
							<p class="font-semibold text-primary text-xs uppercase tracking-[0.24em]">
								{t("about.eyebrow")}
							</p>
							<CardTitle>{t("about.title")}</CardTitle>
							<CardDescription>{t("about.description")}</CardDescription>
						</div>
						<Badge variant="secondary">{t("about.badge")}</Badge>
					</div>
					<p class="max-w-[60ch] text-base text-muted-foreground leading-7">{t("about.lede")}</p>
				</CardHeader>
			</Card>

			<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
				<CardHeader>
					<CardTitle>{t("about.includedTitle")}</CardTitle>
					<CardDescription>{t("about.includedDescription")}</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<ul class="space-y-3">
						{starterSlices.map((item) => (
							<li class="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-4 py-3">
								<span>{t(item)}</span>
							</li>
						))}
					</ul>
					<div class="flex flex-wrap gap-3">
						<A class="button secondary" href={createLocalizedPath(locale(), "/dashboard")}>
							{t("about.ctas.dashboard")}
						</A>
						<A class="button secondary" href={createLocalizedPath(locale(), "/todos")}>
							{t("about.ctas.todos")}
						</A>
						<A class="button secondary" href={createLocalizedPath(locale(), openApiDocsPath)}>
							{t("about.ctas.apiReference")}
						</A>
					</div>
				</CardContent>
			</Card>
		</main>
	);
}
