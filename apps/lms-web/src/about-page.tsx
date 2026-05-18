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

import { openApiDocsPath } from "~/libs/apis/openapi-routes";

import { createLocalizedPath } from "../i18n/routing";

const starterSlices = [
	"Email/password auth with Better Auth and seeded demo accounts",
	"Typed oRPC queries and mutations for dashboard, todos, and media metadata",
	"Drizzle migrations and repeatable local reset, migrate, and seed commands",
	"Cloudflare-ready media flows with draft confirmation and owner-managed cleanup",
];

export default function AboutPage() {
	const { locale } = useI18n();

	return (
		<main
			class="mx-auto grid w-full max-w-6xl items-start gap-6 px-[clamp(1rem,2vw+0.5rem,2rem)] pt-8 pb-16"
			id="main-content"
		>
			<Title>About</Title>
			<Card class="border-primary/10 bg-card/95 shadow-black/5 shadow-sm">
				<CardHeader class="space-y-4">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="space-y-2">
							<p class="font-semibold text-primary text-xs uppercase tracking-[0.24em]">
								Starter surface
							</p>
							<CardTitle>About this LMS starter</CardTitle>
							<CardDescription>
								This route now describes the actual monorepo starter instead of shipping the stock
								Solid scaffold page.
							</CardDescription>
						</div>
						<Badge variant="secondary">SolidStart + Better Auth + oRPC</Badge>
					</div>
					<p class="max-w-[60ch] text-base text-muted-foreground leading-7">
						The current app is meant to validate the platform slices before the full LMS product
						build starts: authentication, seeded local data, user-owned todos, and Cloudflare-aware
						media management.
					</p>
				</CardHeader>
			</Card>

			<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
				<CardHeader>
					<CardTitle>Included today</CardTitle>
					<CardDescription>
						These are the starter slices that are already wired through the active app package.
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<ul class="space-y-3">
						{starterSlices.map((item) => (
							<li class="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-4 py-3">
								<span>{item}</span>
							</li>
						))}
					</ul>
					<div class="flex flex-wrap gap-3">
						<A class="button secondary" href={createLocalizedPath(locale(), "/dashboard")}>
							Open dashboard
						</A>
						<A class="button secondary" href={createLocalizedPath(locale(), "/todos")}>
							Open todos
						</A>
						<A class="button secondary" href={createLocalizedPath(locale(), openApiDocsPath)}>
							View API reference
						</A>
					</div>
				</CardContent>
			</Card>
		</main>
	);
}
