import type { FilesClient, FilesUploaderItem } from "@de100/files-client";
import { createFilesClient, createFilesUploaderRuntime } from "@de100/files-client";
import type { FilesStorageBackend, FilesUploadProtocol, FileVisibility } from "@de100/files-shared";
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
	Field,
	FieldContent,
	FieldLabel,
	NativeSelect,
	NativeSelectOption,
	P,
} from "@de100/ui-domains-solidjs";
import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";

import { authClient } from "~/libs/apis/auth-client";
import { client as orpcClient } from "~/libs/apis/orpc";
import { createOrpcFilesClient } from "~/libs/files-client";
import type { FilesLabApproach, FilesLabTrack } from "~/libs/files-lab-policy";
import {
	createFilesLabForcedProtocolDecision,
	createFilesLabGeneratedFiles,
	createFilesLabOrpcDirectDecision,
	createFilesLabTargetDecision,
	filesLabProtocolOptions,
	filesLabStorageBackends,
	filesLabTracks,
	resolveHttpFilesLabProtocol,
} from "~/libs/files-lab-policy";

import { createLocalizedPath } from "../i18n/routing";

type LabLog = {
	id: string;
	message: string;
	status: "error" | "info" | "success";
};

type FilesApproachLabPageProps = {
	approach: FilesLabApproach;
};

export function FilesApproachLabShellPage() {
	const { locale } = useI18n();
	const navigate = useNavigate();
	const session = authClient.useSession();
	const [isHydrated, setIsHydrated] = createSignal(false);

	onMount(() => {
		setIsHydrated(true);
	});

	const canUseLab = () => isHydrated() && !session().isPending && !!session().data;

	createEffect(() => {
		if (isHydrated() && !session().isPending && !session().data) {
			navigate(createLocalizedPath(locale(), "/login"), { replace: true });
		}
	});

	return (
		<main
			class="mx-auto grid w-full max-w-7xl gap-6 px-[clamp(1rem,2vw+0.5rem,2rem)] pt-8 pb-16"
			id="main-content"
		>
			<Title>Files Lab</Title>
			<Show
				fallback={
					<Alert role="status">
						<AlertDescription>Loading files lab session...</AlertDescription>
					</Alert>
				}
				when={canUseLab()}
			>
				<Card class="border-primary/10 bg-card/95 shadow-black/5 shadow-sm">
					<CardHeader class="space-y-3">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<CardTitle>Files lab</CardTitle>
								<CardDescription>
									Compare the two maintained files API approaches before choosing the long-term
									default for each product surface.
								</CardDescription>
							</div>
							<Badge variant="secondary">Phase 9C</Badge>
						</div>
					</CardHeader>
					<CardContent class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<Button as="a" href={createLocalizedPath(locale(), "/files-lab/hybrid")}>
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
						<Button
							as="a"
							href={createLocalizedPath(locale(), "/files-lab/provider-smoke")}
							variant="outline"
						>
							Provider smoke
						</Button>
						<Button
							as="a"
							href={createLocalizedPath(locale(), "/files-lab/hls-playback")}
							variant="outline"
						>
							HLS playback
						</Button>
						<Button
							as="a"
							href={createLocalizedPath(locale(), "/files-lab/processing-variants")}
							variant="outline"
						>
							Processing
						</Button>
						<Button
							as="a"
							href={createLocalizedPath(locale(), "/files-lab/entitlements")}
							variant="outline"
						>
							Entitlements
						</Button>
					</CardContent>
				</Card>
			</Show>
		</main>
	);
}

export default function FilesApproachLabPage(props: FilesApproachLabPageProps) {
	const { locale } = useI18n();
	const navigate = useNavigate();
	const session = authClient.useSession();
	const [state, setState] = createStore<{
		forcedProtocol: "auto" | FilesUploadProtocol;
		isHydrated: boolean;
		isUploading: boolean;
		items: FilesUploaderItem[];
		logs: LabLog[];
		selectedFiles: File[];
		storageBackend: FilesStorageBackend;
		track: FilesLabTrack;
		visibility: FileVisibility;
	}>({
		forcedProtocol: "auto",
		isHydrated: false,
		isUploading: false,
		items: [],
		logs: [],
		selectedFiles: [],
		storageBackend: "local-fs",
		track: "practical",
		visibility: "private",
	});

	onMount(() => {
		setState("isHydrated", true);
	});

	const canUseLab = () => state.isHydrated && !session().isPending && !!session().data;

	createEffect(() => {
		if (state.isHydrated && !session().isPending && !session().data) {
			navigate(createLocalizedPath(locale(), "/login"), { replace: true });
		}
	});

	async function uploadFiles(files: File[]) {
		if (files.length === 0) {
			appendLog("Choose or generate at least one file.", "error");
			return;
		}

		setState("isUploading", true);
		setState("items", []);
		try {
			const client = createLabClient({
				approach: props.approach,
				forcedProtocol: state.forcedProtocol,
				storageBackend: state.storageBackend,
				track: state.track,
			});
			const runtime = createFilesUploaderRuntime({
				client,
				onChange: (nextItems) => setState("items", nextItems),
			});
			runtime.addFiles(files, {
				metadata: {
					approach: props.approach,
					forcedProtocol: state.forcedProtocol,
					storageBackend: state.storageBackend,
					track: state.track,
				},
				routeSlug: `files-lab-${props.approach}-${state.track}`,
				visibility: state.visibility,
			});
			await runtime.uploadAll();
			appendLog(
				`Uploaded ${files.length} file(s) through ${props.approach} / ${state.track} / ${state.storageBackend}.`,
				"success",
			);
		} catch (error) {
			appendLog(error instanceof Error ? error.message : "Files lab upload failed.", "error");
		} finally {
			setState("isUploading", false);
		}
	}

	return (
		<main
			class="mx-auto grid w-full max-w-7xl gap-6 px-[clamp(1rem,2vw+0.5rem,2rem)] pt-8 pb-16"
			id="main-content"
		>
			<Title>Files Approach Lab</Title>
			<Card class="border-primary/10 bg-card/95 shadow-black/5 shadow-sm">
				<CardHeader class="space-y-3">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div>
							<CardTitle>
								{props.approach === "hybrid" ? "Hybrid files lab" : "HTTP-native files lab"}
							</CardTitle>
							<CardDescription>
								Test image, video, audio, document, generic file, visibility, signed-read, range,
								variant, processing, disabled integration, and user-selected file workflows.
							</CardDescription>
						</div>
						<Badge variant="secondary">Phase 9C</Badge>
					</div>
					<div class="flex flex-wrap gap-2">
						<Button
							as="a"
							href={createLocalizedPath(locale(), "/files-lab/hybrid")}
							variant={props.approach === "hybrid" ? "secondary" : "outline"}
						>
							Hybrid
						</Button>
						<Button
							as="a"
							href={createLocalizedPath(locale(), "/files-lab/http")}
							variant={props.approach === "http-native" ? "secondary" : "outline"}
						>
							HTTP-native
						</Button>
					</div>
				</CardHeader>
			</Card>

			<Show
				fallback={
					<Alert role="status">
						<AlertDescription>Loading files lab session...</AlertDescription>
					</Alert>
				}
				when={canUseLab()}
			>
				<div class="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
					<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
						<CardHeader>
							<CardTitle>Matrix controls</CardTitle>
							<CardDescription>
								Each upload run records the selected API approach, storage profile, and upload
								protocol.
							</CardDescription>
						</CardHeader>
						<CardContent class="grid gap-4">
							<Field class="grid gap-2">
								<FieldLabel for="files-lab-track">Track</FieldLabel>
								<FieldContent>
									<NativeSelect
										id="files-lab-track"
										onChange={(event) =>
											setState("track", event.currentTarget.value as FilesLabTrack)
										}
										value={state.track}
									>
										<For each={filesLabTracks}>
											{(value) => <NativeSelectOption value={value}>{value}</NativeSelectOption>}
										</For>
									</NativeSelect>
								</FieldContent>
							</Field>
							<Field class="grid gap-2">
								<FieldLabel for="files-lab-storage">Storage profile</FieldLabel>
								<FieldContent>
									<NativeSelect
										id="files-lab-storage"
										onChange={(event) =>
											setState("storageBackend", event.currentTarget.value as FilesStorageBackend)
										}
										value={state.storageBackend}
									>
										<For each={filesLabStorageBackends}>
											{(value) => <NativeSelectOption value={value}>{value}</NativeSelectOption>}
										</For>
									</NativeSelect>
								</FieldContent>
							</Field>
							<Field class="grid gap-2">
								<FieldLabel for="files-lab-protocol">Upload protocol</FieldLabel>
								<FieldContent>
									<NativeSelect
										id="files-lab-protocol"
										onChange={(event) =>
											setState(
												"forcedProtocol",
												event.currentTarget.value as "auto" | FilesUploadProtocol,
											)
										}
										value={state.forcedProtocol}
									>
										<For each={filesLabProtocolOptions}>
											{(value) => <NativeSelectOption value={value}>{value}</NativeSelectOption>}
										</For>
									</NativeSelect>
								</FieldContent>
							</Field>
							<Field class="grid gap-2">
								<FieldLabel for="files-lab-visibility">Visibility</FieldLabel>
								<FieldContent>
									<NativeSelect
										id="files-lab-visibility"
										onChange={(event) =>
											setState(
												"visibility",
												event.currentTarget.value === "public" ? "public" : "private",
											)
										}
										value={state.visibility}
									>
										<NativeSelectOption value="private">private</NativeSelectOption>
										<NativeSelectOption value="public">public</NativeSelectOption>
									</NativeSelect>
								</FieldContent>
							</Field>
						</CardContent>
					</Card>

					<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
						<CardHeader>
							<CardTitle>Fixture forms</CardTitle>
							<CardDescription>
								Use generated fixtures for deterministic checks or choose local files manually.
							</CardDescription>
						</CardHeader>
						<CardContent class="grid gap-4">
							<div class="flex flex-wrap gap-2">
								<Button
									onClick={() => setState("selectedFiles", createFilesLabGeneratedFiles())}
									type="button"
									variant="secondary"
								>
									Generate fixtures
								</Button>
								<Button
									disabled={state.isUploading}
									onClick={() => void uploadFiles(state.selectedFiles)}
									type="button"
								>
									Upload selected
								</Button>
							</div>
							<input
								multiple
								onChange={(event) =>
									setState("selectedFiles", Array.from(event.currentTarget.files ?? []))
								}
								type="file"
							/>
							<P class="text-muted-foreground text-sm" role="status">
								{state.selectedFiles.length} file(s) selected.
							</P>
							<ul class="grid gap-2">
								<For each={state.selectedFiles}>
									{(file) => (
										<li class="rounded-lg border border-border/70 px-3 py-2 text-sm">
											{file.name} - {file.type || "application/octet-stream"} - {file.size} bytes
										</li>
									)}
								</For>
							</ul>
						</CardContent>
					</Card>
				</div>

				<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
					<CardHeader>
						<CardTitle>Runtime status</CardTitle>
						<CardDescription>
							Progress, target selection, and records from the latest run.
						</CardDescription>
					</CardHeader>
					<CardContent class="grid gap-4">
						<ul class="grid gap-2">
							<For each={state.items}>
								{(item) => (
									<li class="rounded-lg border border-border/70 px-3 py-3 text-sm">
										<div class="flex flex-wrap justify-between gap-2">
											<span>{item.file.name}</span>
											<Badge variant={item.status === "completed" ? "secondary" : "outline"}>
												{item.status}
											</Badge>
										</div>
										<progress class="mt-2 w-full" max={100} value={item.progress} />
										<Show when={item.target}>
											{(target) => (
												<P class="mt-2 text-muted-foreground text-xs">
													target: {target().protocol} {target().method}
												</P>
											)}
										</Show>
										<Show when={item.record}>
											{(record) => (
												<P class="mt-2 text-muted-foreground text-xs">record: {record().id}</P>
											)}
										</Show>
										<Show when={item.error}>
											{(error) => (
												<P class="mt-2 text-destructive text-xs" role="alert">
													{error()}
												</P>
											)}
										</Show>
									</li>
								)}
							</For>
						</ul>
						<ul class="grid gap-2">
							<For each={state.logs}>
								{(entry) => (
									<li
										class="rounded-lg border border-border/70 px-3 py-2 text-sm"
										data-status={entry.status}
										role={entry.status === "error" ? "alert" : "status"}
									>
										{entry.message}
									</li>
								)}
							</For>
						</ul>
					</CardContent>
				</Card>
			</Show>
		</main>
	);

	function appendLog(message: string, status: LabLog["status"]) {
		setState("logs", (current) => [
			{
				id: crypto.randomUUID(),
				message,
				status,
			},
			...current,
		]);
	}
}

function createLabClient(options: {
	approach: FilesLabApproach;
	forcedProtocol: "auto" | FilesUploadProtocol;
	storageBackend: FilesStorageBackend;
	track: FilesLabTrack;
}): FilesClient {
	if (options.approach === "http-native") {
		return createHttpOnlyFilesClient(options);
	}

	return createHybridFilesClient(options);
}

function createHttpOnlyFilesClient(options: {
	approach: FilesLabApproach;
	forcedProtocol: "auto" | FilesUploadProtocol;
	storageBackend: FilesStorageBackend;
	track: FilesLabTrack;
}): FilesClient {
	const client = createFilesClient();

	return {
		...client,
		downloadDirect: async () => {
			throw new Error("HTTP-only mode forbids direct oRPC download.");
		},
		resolveUploadMode: async (input) => {
			if (options.forcedProtocol !== "auto" && options.forcedProtocol !== "orpc-direct") {
				return createFilesLabForcedProtocolDecision({
					approach: options.approach,
					protocol: options.forcedProtocol,
					storageBackend: options.storageBackend,
				});
			}

			return createFilesLabTargetDecision(
				resolveHttpFilesLabProtocol({
					requiresResumable: input.requiresResumable,
					storageBackend: options.storageBackend,
					track: options.track,
				}),
				options.approach,
				options.storageBackend,
			);
		},
		uploadDirect: async () => {
			throw new Error("HTTP-only mode forbids direct oRPC upload.");
		},
		watchProcessing: async function* () {},
		watchUpload: async function* () {},
	};
}

function createHybridFilesClient(options: {
	approach: FilesLabApproach;
	forcedProtocol: "auto" | FilesUploadProtocol;
	storageBackend: FilesStorageBackend;
	track: FilesLabTrack;
}): FilesClient {
	const rpcClient = createOrpcFilesClient();

	return {
		...rpcClient,
		resolveUploadMode: async (input) => {
			if (options.forcedProtocol === "orpc-direct") {
				return createFilesLabOrpcDirectDecision(options.storageBackend);
			}

			if (options.forcedProtocol !== "auto") {
				return createFilesLabForcedProtocolDecision({
					approach: options.approach,
					protocol: options.forcedProtocol,
					storageBackend: options.storageBackend,
				});
			}

			if (options.storageBackend === "minio-s3" || options.storageBackend === "r2-s3") {
				return createFilesLabTargetDecision(
					resolveHttpFilesLabProtocol({
						requiresResumable: input.requiresResumable,
						storageBackend: options.storageBackend,
						track: options.track,
					}),
					options.approach,
					options.storageBackend,
				);
			}

			const decision = await orpcClient.files.resolveUploadMode({
				...input,
				requiresResumable: options.track === "stress" || input.requiresResumable,
				routeSlug: String(input.routeSlug),
			});
			return decision;
		},
	};
}
