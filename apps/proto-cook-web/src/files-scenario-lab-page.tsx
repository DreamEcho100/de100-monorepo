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
} from "@de100/ui-domains-solidjs";
import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { createEffect, For, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";

import { authClient } from "~/libs/apis/auth-client";

import { createLocalizedPath } from "../i18n/routing";

type FilesScenarioLabKind =
	| "entitlements"
	| "hls-playback"
	| "processing-variants"
	| "provider-smoke";

type Scenario = {
	expectedKey: ScenarioTranslationKey;
	nameKey: ScenarioTranslationKey;
	stepKeys: ScenarioTranslationKey[];
};

type ScenarioConfig = {
	badgeKey: ScenarioTranslationKey;
	descriptionKey: ScenarioTranslationKey;
	scenarios: Scenario[];
	titleKey: ScenarioTranslationKey;
};

const scenarioConfigs = {
	entitlements: {
		badgeKey: "filesLab.scenario.entitlements.badge",
		descriptionKey: "filesLab.scenario.entitlements.description",
		scenarios: [
			{
				expectedKey: "filesLab.scenario.entitlements.scenarios.previewLesson.expected",
				nameKey: "filesLab.scenario.entitlements.scenarios.previewLesson.name",
				stepKeys: [
					"filesLab.scenario.entitlements.scenarios.previewLesson.step1",
					"filesLab.scenario.entitlements.scenarios.previewLesson.step2",
					"filesLab.scenario.entitlements.scenarios.previewLesson.step3",
				],
			},
			{
				expectedKey: "filesLab.scenario.entitlements.scenarios.privateMatrix.expected",
				nameKey: "filesLab.scenario.entitlements.scenarios.privateMatrix.name",
				stepKeys: [
					"filesLab.scenario.entitlements.scenarios.privateMatrix.step1",
					"filesLab.scenario.entitlements.scenarios.privateMatrix.step2",
					"filesLab.scenario.entitlements.scenarios.privateMatrix.step3",
				],
			},
			{
				expectedKey: "filesLab.scenario.entitlements.scenarios.expiredSession.expected",
				nameKey: "filesLab.scenario.entitlements.scenarios.expiredSession.name",
				stepKeys: [
					"filesLab.scenario.entitlements.scenarios.expiredSession.step1",
					"filesLab.scenario.entitlements.scenarios.expiredSession.step2",
					"filesLab.scenario.entitlements.scenarios.expiredSession.step3",
				],
			},
		],
		titleKey: "filesLab.scenario.entitlements.title",
	},
	"hls-playback": {
		badgeKey: "filesLab.scenario.hlsPlayback.badge",
		descriptionKey: "filesLab.scenario.hlsPlayback.description",
		scenarios: [
			{
				expectedKey: "filesLab.scenario.hlsPlayback.scenarios.signedManifest.expected",
				nameKey: "filesLab.scenario.hlsPlayback.scenarios.signedManifest.name",
				stepKeys: [
					"filesLab.scenario.hlsPlayback.scenarios.signedManifest.step1",
					"filesLab.scenario.hlsPlayback.scenarios.signedManifest.step2",
					"filesLab.scenario.hlsPlayback.scenarios.signedManifest.step3",
				],
			},
			{
				expectedKey: "filesLab.scenario.hlsPlayback.scenarios.segmentAccess.expected",
				nameKey: "filesLab.scenario.hlsPlayback.scenarios.segmentAccess.name",
				stepKeys: [
					"filesLab.scenario.hlsPlayback.scenarios.segmentAccess.step1",
					"filesLab.scenario.hlsPlayback.scenarios.segmentAccess.step2",
					"filesLab.scenario.hlsPlayback.scenarios.segmentAccess.step3",
				],
			},
			{
				expectedKey: "filesLab.scenario.hlsPlayback.scenarios.playerPath.expected",
				nameKey: "filesLab.scenario.hlsPlayback.scenarios.playerPath.name",
				stepKeys: [
					"filesLab.scenario.hlsPlayback.scenarios.playerPath.step1",
					"filesLab.scenario.hlsPlayback.scenarios.playerPath.step2",
					"filesLab.scenario.hlsPlayback.scenarios.playerPath.step3",
				],
			},
		],
		titleKey: "filesLab.scenario.hlsPlayback.title",
	},
	"processing-variants": {
		badgeKey: "filesLab.scenario.processingVariants.badge",
		descriptionKey: "filesLab.scenario.processingVariants.description",
		scenarios: [
			{
				expectedKey: "filesLab.scenario.processingVariants.scenarios.imageVariant.expected",
				nameKey: "filesLab.scenario.processingVariants.scenarios.imageVariant.name",
				stepKeys: [
					"filesLab.scenario.processingVariants.scenarios.imageVariant.step1",
					"filesLab.scenario.processingVariants.scenarios.imageVariant.step2",
					"filesLab.scenario.processingVariants.scenarios.imageVariant.step3",
				],
			},
			{
				expectedKey: "filesLab.scenario.processingVariants.scenarios.disabledAdapters.expected",
				nameKey: "filesLab.scenario.processingVariants.scenarios.disabledAdapters.name",
				stepKeys: [
					"filesLab.scenario.processingVariants.scenarios.disabledAdapters.step1",
					"filesLab.scenario.processingVariants.scenarios.disabledAdapters.step2",
					"filesLab.scenario.processingVariants.scenarios.disabledAdapters.step3",
				],
			},
			{
				expectedKey: "filesLab.scenario.processingVariants.scenarios.videoArtifactGroup.expected",
				nameKey: "filesLab.scenario.processingVariants.scenarios.videoArtifactGroup.name",
				stepKeys: [
					"filesLab.scenario.processingVariants.scenarios.videoArtifactGroup.step1",
					"filesLab.scenario.processingVariants.scenarios.videoArtifactGroup.step2",
					"filesLab.scenario.processingVariants.scenarios.videoArtifactGroup.step3",
				],
			},
		],
		titleKey: "filesLab.scenario.processingVariants.title",
	},
	"provider-smoke": {
		badgeKey: "filesLab.scenario.providerSmoke.badge",
		descriptionKey: "filesLab.scenario.providerSmoke.description",
		scenarios: [
			{
				expectedKey: "filesLab.scenario.providerSmoke.scenarios.minioSmoke.expected",
				nameKey: "filesLab.scenario.providerSmoke.scenarios.minioSmoke.name",
				stepKeys: [
					"filesLab.scenario.providerSmoke.scenarios.minioSmoke.step1",
					"filesLab.scenario.providerSmoke.scenarios.minioSmoke.step2",
					"filesLab.scenario.providerSmoke.scenarios.minioSmoke.step3",
				],
			},
			{
				expectedKey: "filesLab.scenario.providerSmoke.scenarios.missingProviderConfig.expected",
				nameKey: "filesLab.scenario.providerSmoke.scenarios.missingProviderConfig.name",
				stepKeys: [
					"filesLab.scenario.providerSmoke.scenarios.missingProviderConfig.step1",
					"filesLab.scenario.providerSmoke.scenarios.missingProviderConfig.step2",
					"filesLab.scenario.providerSmoke.scenarios.missingProviderConfig.step3",
				],
			},
			{
				expectedKey: "filesLab.scenario.providerSmoke.scenarios.localFilesystem.expected",
				nameKey: "filesLab.scenario.providerSmoke.scenarios.localFilesystem.name",
				stepKeys: [
					"filesLab.scenario.providerSmoke.scenarios.localFilesystem.step1",
					"filesLab.scenario.providerSmoke.scenarios.localFilesystem.step2",
					"filesLab.scenario.providerSmoke.scenarios.localFilesystem.step3",
				],
			},
		],
		titleKey: "filesLab.scenario.providerSmoke.title",
	},
} satisfies Record<FilesScenarioLabKind, ScenarioConfig>;

type ScenarioTranslationKey =
	| "filesLab.scenario.entitlements.badge"
	| "filesLab.scenario.entitlements.description"
	| "filesLab.scenario.entitlements.scenarios.expiredSession.expected"
	| "filesLab.scenario.entitlements.scenarios.expiredSession.name"
	| "filesLab.scenario.entitlements.scenarios.expiredSession.step1"
	| "filesLab.scenario.entitlements.scenarios.expiredSession.step2"
	| "filesLab.scenario.entitlements.scenarios.expiredSession.step3"
	| "filesLab.scenario.entitlements.scenarios.privateMatrix.expected"
	| "filesLab.scenario.entitlements.scenarios.privateMatrix.name"
	| "filesLab.scenario.entitlements.scenarios.privateMatrix.step1"
	| "filesLab.scenario.entitlements.scenarios.privateMatrix.step2"
	| "filesLab.scenario.entitlements.scenarios.privateMatrix.step3"
	| "filesLab.scenario.entitlements.scenarios.previewLesson.expected"
	| "filesLab.scenario.entitlements.scenarios.previewLesson.name"
	| "filesLab.scenario.entitlements.scenarios.previewLesson.step1"
	| "filesLab.scenario.entitlements.scenarios.previewLesson.step2"
	| "filesLab.scenario.entitlements.scenarios.previewLesson.step3"
	| "filesLab.scenario.entitlements.title"
	| "filesLab.scenario.hlsPlayback.badge"
	| "filesLab.scenario.hlsPlayback.description"
	| "filesLab.scenario.hlsPlayback.scenarios.playerPath.expected"
	| "filesLab.scenario.hlsPlayback.scenarios.playerPath.name"
	| "filesLab.scenario.hlsPlayback.scenarios.playerPath.step1"
	| "filesLab.scenario.hlsPlayback.scenarios.playerPath.step2"
	| "filesLab.scenario.hlsPlayback.scenarios.playerPath.step3"
	| "filesLab.scenario.hlsPlayback.scenarios.segmentAccess.expected"
	| "filesLab.scenario.hlsPlayback.scenarios.segmentAccess.name"
	| "filesLab.scenario.hlsPlayback.scenarios.segmentAccess.step1"
	| "filesLab.scenario.hlsPlayback.scenarios.segmentAccess.step2"
	| "filesLab.scenario.hlsPlayback.scenarios.segmentAccess.step3"
	| "filesLab.scenario.hlsPlayback.scenarios.signedManifest.expected"
	| "filesLab.scenario.hlsPlayback.scenarios.signedManifest.name"
	| "filesLab.scenario.hlsPlayback.scenarios.signedManifest.step1"
	| "filesLab.scenario.hlsPlayback.scenarios.signedManifest.step2"
	| "filesLab.scenario.hlsPlayback.scenarios.signedManifest.step3"
	| "filesLab.scenario.hlsPlayback.title"
	| "filesLab.scenario.processingVariants.badge"
	| "filesLab.scenario.processingVariants.description"
	| "filesLab.scenario.processingVariants.scenarios.disabledAdapters.expected"
	| "filesLab.scenario.processingVariants.scenarios.disabledAdapters.name"
	| "filesLab.scenario.processingVariants.scenarios.disabledAdapters.step1"
	| "filesLab.scenario.processingVariants.scenarios.disabledAdapters.step2"
	| "filesLab.scenario.processingVariants.scenarios.disabledAdapters.step3"
	| "filesLab.scenario.processingVariants.scenarios.imageVariant.expected"
	| "filesLab.scenario.processingVariants.scenarios.imageVariant.name"
	| "filesLab.scenario.processingVariants.scenarios.imageVariant.step1"
	| "filesLab.scenario.processingVariants.scenarios.imageVariant.step2"
	| "filesLab.scenario.processingVariants.scenarios.imageVariant.step3"
	| "filesLab.scenario.processingVariants.scenarios.videoArtifactGroup.expected"
	| "filesLab.scenario.processingVariants.scenarios.videoArtifactGroup.name"
	| "filesLab.scenario.processingVariants.scenarios.videoArtifactGroup.step1"
	| "filesLab.scenario.processingVariants.scenarios.videoArtifactGroup.step2"
	| "filesLab.scenario.processingVariants.scenarios.videoArtifactGroup.step3"
	| "filesLab.scenario.processingVariants.title"
	| "filesLab.scenario.providerSmoke.badge"
	| "filesLab.scenario.providerSmoke.description"
	| "filesLab.scenario.providerSmoke.scenarios.localFilesystem.expected"
	| "filesLab.scenario.providerSmoke.scenarios.localFilesystem.name"
	| "filesLab.scenario.providerSmoke.scenarios.localFilesystem.step1"
	| "filesLab.scenario.providerSmoke.scenarios.localFilesystem.step2"
	| "filesLab.scenario.providerSmoke.scenarios.localFilesystem.step3"
	| "filesLab.scenario.providerSmoke.scenarios.minioSmoke.expected"
	| "filesLab.scenario.providerSmoke.scenarios.minioSmoke.name"
	| "filesLab.scenario.providerSmoke.scenarios.minioSmoke.step1"
	| "filesLab.scenario.providerSmoke.scenarios.minioSmoke.step2"
	| "filesLab.scenario.providerSmoke.scenarios.minioSmoke.step3"
	| "filesLab.scenario.providerSmoke.scenarios.missingProviderConfig.expected"
	| "filesLab.scenario.providerSmoke.scenarios.missingProviderConfig.name"
	| "filesLab.scenario.providerSmoke.scenarios.missingProviderConfig.step1"
	| "filesLab.scenario.providerSmoke.scenarios.missingProviderConfig.step2"
	| "filesLab.scenario.providerSmoke.scenarios.missingProviderConfig.step3"
	| "filesLab.scenario.providerSmoke.title";

export default function FilesScenarioLabPage(props: { kind: FilesScenarioLabKind }) {
	const { locale, t } = useI18n();
	const navigate = useNavigate();
	const session = authClient.useSession();
	const [state, setState] = createStore({
		isHydrated: false,
	});
	const config = () => scenarioConfigs[props.kind];
	const canUseLab = () => state.isHydrated && !session().isPending && !!session().data;

	onMount(() => {
		setState("isHydrated", true);
	});

	createEffect(() => {
		if (state.isHydrated && !session().isPending && !session().data) {
			navigate(createLocalizedPath(locale(), "/login"), { replace: true });
		}
	});

	return (
		<main
			class="mx-auto grid w-full max-w-7xl gap-6 px-[clamp(1rem,2vw+0.5rem,2rem)] pt-8 pb-16"
			id="main-content"
		>
			<Title>{t(config().titleKey)}</Title>
			<Show
				fallback={
					<Alert role="status">
						<AlertDescription>{t("filesLab.scenario.loading")}</AlertDescription>
					</Alert>
				}
				when={canUseLab()}
			>
				<Card class="border-primary/10 bg-card/95 shadow-black/5 shadow-sm">
					<CardHeader class="space-y-3">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<CardTitle>{t(config().titleKey)}</CardTitle>
								<CardDescription>{t(config().descriptionKey)}</CardDescription>
							</div>
							<Badge variant="secondary">{t(config().badgeKey)}</Badge>
						</div>
					</CardHeader>
					<CardContent class="grid gap-4 md:grid-cols-3">
						<For each={config().scenarios}>
							{(scenario) => (
								<section class="grid gap-3 rounded-md border border-border/70 bg-background/80 p-4">
									<div class="grid gap-1">
										<h2 class="font-medium text-base leading-tight">{t(scenario.nameKey)}</h2>
										<p class="text-muted-foreground text-sm">{t(scenario.expectedKey)}</p>
									</div>
									<div class="grid gap-3">
										<ol class="grid list-decimal gap-2 pl-5 text-muted-foreground text-sm">
											<For each={scenario.stepKeys}>{(stepKey) => <li>{t(stepKey)}</li>}</For>
										</ol>
									</div>
								</section>
							)}
						</For>
					</CardContent>
				</Card>

				<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
					<CardContent class="flex flex-wrap gap-2 pt-6">
						<Button
							as="a"
							href={createLocalizedPath(locale(), "/files-lab/hybrid")}
							variant="outline"
						>
							{t("filesLab.scenario.actions.hybridLab")}
						</Button>
						<Button
							as="a"
							href={createLocalizedPath(locale(), "/files-lab/http")}
							variant="outline"
						>
							{t("filesLab.scenario.actions.httpNativeLab")}
						</Button>
						<Button
							as="a"
							href={createLocalizedPath(locale(), "/files-lab/course-video")}
							variant="outline"
						>
							{t("filesLab.scenario.actions.courseVideoLab")}
						</Button>
					</CardContent>
				</Card>
			</Show>
		</main>
	);
}
