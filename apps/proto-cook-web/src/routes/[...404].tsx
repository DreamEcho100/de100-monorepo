import { useI18n } from "@de100/i18n-domains-solidjs/client";
import { Title } from "@solidjs/meta";
import { HttpStatusCode } from "@solidjs/start";

export default function NotFound() {
	const { t } = useI18n();

	return (
		<main
			class="mx-auto grid w-full max-w-6xl items-start gap-6 px-[clamp(1rem,2vw+0.5rem,2rem)] pt-8 pb-16"
			id="main-content"
		>
			<Title>{t("notFound.metaTitle")}</Title>
			<HttpStatusCode code={404} />
			<section class="grid gap-6 rounded-xl border border-border/70 bg-card/95 p-6 shadow-black/5 shadow-sm">
				<p class="font-semibold text-primary text-xs uppercase tracking-[0.24em]">
					{t("notFound.eyebrow")}
				</p>
				<h1 class="text-balance font-semibold text-3xl text-foreground tracking-tight">
					{t("notFound.title")}
				</h1>
				<p class="max-w-[60ch] text-base text-muted-foreground leading-7">
					{t("notFound.description")}
				</p>
				<p class="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-muted-foreground text-sm leading-6">
					{t("notFound.helpPrefix")}{" "}
					<a href="https://start.solidjs.com" rel="noopener" target="_blank">
						{t("notFound.helpLinkLabel")}
					</a>{" "}
					{t("notFound.helpSuffix")}
				</p>
			</section>
		</main>
	);
}
