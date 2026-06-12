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
import { A } from "@solidjs/router";

import { openApiDocsPath } from "~/libs/apis/openapi-routes";

import { createLocalizedPath } from "../i18n/routing";

const starterSlices = [
	"about.starterSlices.auth",
	"about.starterSlices.transport",
	"about.starterSlices.storage",
	"about.starterSlices.files",
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
							<P
								class="font-semibold text-primary text-xs uppercase tracking-[0.24em]"
								tone="accent"
							>
								{t("about.eyebrow")}
							</P>
							<CardTitle>{t("about.title")}</CardTitle>
							<CardDescription>{t("about.description")}</CardDescription>
						</div>
						<Badge variant="secondary">{t("about.badge")}</Badge>
					</div>
					<P class="max-w-[60ch] text-base text-muted-foreground leading-7">{t("about.lede")}</P>
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
						<Button as={A} href={createLocalizedPath(locale(), "/dashboard")} variant="secondary">
							{t("about.ctas.dashboard")}
						</Button>
						<Button as={A} href={createLocalizedPath(locale(), "/todos")} variant="secondary">
							{t("about.ctas.todos")}
						</Button>
						<Button
							as={A}
							href={createLocalizedPath(locale(), openApiDocsPath)}
							variant="secondary"
						>
							{t("about.ctas.apiReference")}
						</Button>
					</div>
				</CardContent>
			</Card>
		</main>
	);
}
