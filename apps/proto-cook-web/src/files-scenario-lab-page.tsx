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
	expected: string;
	name: string;
	steps: string[];
};

type ScenarioConfig = {
	badge: string;
	description: string;
	scenarios: Scenario[];
	title: string;
};

const scenarioConfigs = {
	entitlements: {
		badge: "Entitlements",
		description:
			"Exercise preview, enrolled, owner, admin, expired-token, and denied private playback states.",
		scenarios: [
			{
				expected: "Preview lessons issue playback access without enrollment.",
				name: "Preview lesson",
				steps: [
					"Open seeded preview lesson.",
					"Request playback session.",
					"Confirm manifest loads.",
				],
			},
			{
				expected: "Private lessons deny anonymous users and allow enrolled/admin users.",
				name: "Private lesson matrix",
				steps: ["Sign out and request access.", "Sign in as enrolled user.", "Sign in as admin."],
			},
			{
				expected: "Expired or revoked session tokens fail on manifest and segment routes.",
				name: "Expired session",
				steps: ["Create playback session.", "Expire/revoke token in DB.", "Reload manifest route."],
			},
		],
		title: "Entitlement matrix lab",
	},
	"hls-playback": {
		badge: "HLS",
		description:
			"Verify signed HLS playback sessions, manifest reads, segment reads, and range-friendly delivery behavior.",
		scenarios: [
			{
				expected: "Ready artifact groups produce playable HLS manifest URLs.",
				name: "Signed manifest",
				steps: ["Attach ready artifact group.", "Request playback session.", "Open manifest URL."],
			},
			{
				expected: "Segment reads are scoped to the same playback token.",
				name: "Segment access",
				steps: ["Open manifest.", "Copy segment path.", "Request segment with and without token."],
			},
			{
				expected: "The product player uses native video with lazy hls.js when needed.",
				name: "Player path",
				steps: [
					"Open course lesson.",
					"Start playback.",
					"Inspect network manifest/segment requests.",
				],
			},
		],
		title: "HLS playback lab",
	},
	"processing-variants": {
		badge: "Processing",
		description:
			"Validate variant and artifact outputs for images, audio, documents, and course video processing jobs.",
		scenarios: [
			{
				expected: "Image optimized variant is readable through the variant route.",
				name: "Image variant",
				steps: ["Upload image.", "Run processing.", "Open optimized variant route."],
			},
			{
				expected:
					"Audio waveform and document preview paths fail explicitly when adapters are disabled.",
				name: "Disabled adapters",
				steps: ["Select audio/document fixture.", "Disable adapter.", "Run processing."],
			},
			{
				expected:
					"Video HLS processing writes artifact group records and staged objects are cleaned.",
				name: "Video artifact group",
				steps: ["Upload video fixture.", "Queue HLS job.", "Inspect artifacts and storage keys."],
			},
		],
		title: "Processing and variants lab",
	},
	"provider-smoke": {
		badge: "Provider",
		description:
			"Check local filesystem, MinIO S3-compatible, and R2-shaped configuration paths before product flows depend on them.",
		scenarios: [
			{
				expected: "`pnpm files:minio:smoke` passes with public/private buckets.",
				name: "MinIO smoke",
				steps: ["Start MinIO.", "Run smoke command.", "Confirm JSON status is pass."],
			},
			{
				expected: "Disabled or incomplete S3 config fails before upload execution.",
				name: "Missing provider config",
				steps: ["Unset S3 secret or bucket.", "Run preflight.", "Confirm explicit env error."],
			},
			{
				expected: "Local filesystem mode writes under `.local/files` for offline development.",
				name: "Local filesystem",
				steps: [
					"Switch storage driver to local.",
					"Seed or upload fixture.",
					"Inspect local files root.",
				],
			},
		],
		title: "Provider smoke lab",
	},
} satisfies Record<FilesScenarioLabKind, ScenarioConfig>;

export default function FilesScenarioLabPage(props: { kind: FilesScenarioLabKind }) {
	const { locale } = useI18n();
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
			<Title>{config().title}</Title>
			<Show
				fallback={
					<Alert role="status">
						<AlertDescription>Loading files scenario lab session...</AlertDescription>
					</Alert>
				}
				when={canUseLab()}
			>
				<Card class="border-primary/10 bg-card/95 shadow-black/5 shadow-sm">
					<CardHeader class="space-y-3">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<CardTitle>{config().title}</CardTitle>
								<CardDescription>{config().description}</CardDescription>
							</div>
							<Badge variant="secondary">{config().badge}</Badge>
						</div>
					</CardHeader>
					<CardContent class="grid gap-4 md:grid-cols-3">
						<For each={config().scenarios}>
							{(scenario) => (
								<section class="grid gap-3 rounded-md border border-border/70 bg-background/80 p-4">
									<div class="grid gap-1">
										<h2 class="font-medium text-base leading-tight">{scenario.name}</h2>
										<p class="text-muted-foreground text-sm">{scenario.expected}</p>
									</div>
									<div class="grid gap-3">
										<ol class="grid list-decimal gap-2 pl-5 text-muted-foreground text-sm">
											<For each={scenario.steps}>{(step) => <li>{step}</li>}</For>
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
							Hybrid lab
						</Button>
						<Button
							as="a"
							href={createLocalizedPath(locale(), "/files-lab/http")}
							variant="outline"
						>
							HTTP-native lab
						</Button>
						<Button
							as="a"
							href={createLocalizedPath(locale(), "/files-lab/course-video")}
							variant="outline"
						>
							Course video lab
						</Button>
					</CardContent>
				</Card>
			</Show>
		</main>
	);
}
