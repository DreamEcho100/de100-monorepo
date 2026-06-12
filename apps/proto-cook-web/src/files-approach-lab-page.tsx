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
	const { locale, t } = useI18n();
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
			<Title>{t("filesLab.shell.metaTitle")}</Title>
			<Show
				fallback={
					<Alert role="status">
						<AlertDescription>{t("filesLab.shell.loading")}</AlertDescription>
					</Alert>
				}
				when={canUseLab()}
			>
				<Card class="border-primary/10 bg-card/95 shadow-black/5 shadow-sm">
					<CardHeader class="space-y-3">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<CardTitle>{t("filesLab.shell.title")}</CardTitle>
								<CardDescription>{t("filesLab.shell.description")}</CardDescription>
							</div>
							<Badge variant="secondary">{t("filesLab.shell.phaseBadge")}</Badge>
						</div>
					</CardHeader>
					<CardContent class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<Button as="a" href={createLocalizedPath(locale(), "/files-lab/hybrid")}>
							{t("filesLab.actions.hybridLab")}
						</Button>
						<Button
							as="a"
							href={createLocalizedPath(locale(), "/files-lab/http")}
							variant="outline"
						>
							{t("filesLab.actions.httpNativeLab")}
						</Button>
						<Button
							as="a"
							href={createLocalizedPath(locale(), "/files-lab/course-video")}
							variant="outline"
						>
							{t("filesLab.actions.courseVideoLab")}
						</Button>
						<Button
							as="a"
							href={createLocalizedPath(locale(), "/files-lab/provider-smoke")}
							variant="outline"
						>
							{t("filesLab.actions.providerSmoke")}
						</Button>
						<Button
							as="a"
							href={createLocalizedPath(locale(), "/files-lab/hls-playback")}
							variant="outline"
						>
							{t("filesLab.actions.hlsPlayback")}
						</Button>
						<Button
							as="a"
							href={createLocalizedPath(locale(), "/files-lab/processing-variants")}
							variant="outline"
						>
							{t("filesLab.actions.processing")}
						</Button>
						<Button
							as="a"
							href={createLocalizedPath(locale(), "/files-lab/entitlements")}
							variant="outline"
						>
							{t("filesLab.actions.entitlements")}
						</Button>
					</CardContent>
				</Card>
			</Show>
		</main>
	);
}

export default function FilesApproachLabPage(props: FilesApproachLabPageProps) {
	const { locale, t } = useI18n();
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
			appendLog(t("filesLab.logs.missingFiles"), "error");
			return;
		}

		setState("isUploading", true);
		setState("items", []);
		try {
			const client = createLabClient({
				approach: props.approach,
				errorMessages: {
					directDownloadForbidden: t("filesLab.logs.httpDirectDownloadForbidden"),
					directUploadForbidden: t("filesLab.logs.httpDirectUploadForbidden"),
				},
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
				t("filesLab.logs.uploaded", {
					approach: props.approach,
					count: files.length,
					storageBackend: state.storageBackend,
					track: state.track,
				}),
				"success",
			);
		} catch (error) {
			appendLog(error instanceof Error ? error.message : t("filesLab.logs.uploadFailed"), "error");
		} finally {
			setState("isUploading", false);
		}
	}

	return (
		<main
			class="mx-auto grid w-full max-w-7xl gap-6 px-[clamp(1rem,2vw+0.5rem,2rem)] pt-8 pb-16"
			id="main-content"
		>
			<Title>{t("filesLab.approach.metaTitle")}</Title>
			<Card class="border-primary/10 bg-card/95 shadow-black/5 shadow-sm">
				<CardHeader class="space-y-3">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div>
							<CardTitle>
								{props.approach === "hybrid"
									? t("filesLab.approach.hybridTitle")
									: t("filesLab.approach.httpTitle")}
							</CardTitle>
							<CardDescription>{t("filesLab.approach.description")}</CardDescription>
						</div>
						<Badge variant="secondary">{t("filesLab.shell.phaseBadge")}</Badge>
					</div>
					<div class="flex flex-wrap gap-2">
						<Button
							as="a"
							href={createLocalizedPath(locale(), "/files-lab/hybrid")}
							variant={props.approach === "hybrid" ? "secondary" : "outline"}
						>
							{t("filesLab.actions.hybrid")}
						</Button>
						<Button
							as="a"
							href={createLocalizedPath(locale(), "/files-lab/http")}
							variant={props.approach === "http-native" ? "secondary" : "outline"}
						>
							{t("filesLab.actions.httpNative")}
						</Button>
					</div>
				</CardHeader>
			</Card>

			<Show
				fallback={
					<Alert role="status">
						<AlertDescription>{t("filesLab.shell.loading")}</AlertDescription>
					</Alert>
				}
				when={canUseLab()}
			>
				<div class="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
					<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
						<CardHeader>
							<CardTitle>{t("filesLab.matrix.title")}</CardTitle>
							<CardDescription>{t("filesLab.matrix.description")}</CardDescription>
						</CardHeader>
						<CardContent class="grid gap-4">
							<Field class="grid gap-2">
								<FieldLabel for="files-lab-track">{t("filesLab.fields.track")}</FieldLabel>
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
								<FieldLabel for="files-lab-storage">
									{t("filesLab.fields.storageProfile")}
								</FieldLabel>
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
								<FieldLabel for="files-lab-protocol">
									{t("filesLab.fields.uploadProtocol")}
								</FieldLabel>
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
								<FieldLabel for="files-lab-visibility">
									{t("filesLab.fields.visibility")}
								</FieldLabel>
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
										<NativeSelectOption value="private">
											{t("files.visibility.private")}
										</NativeSelectOption>
										<NativeSelectOption value="public">
											{t("files.visibility.public")}
										</NativeSelectOption>
									</NativeSelect>
								</FieldContent>
							</Field>
						</CardContent>
					</Card>

					<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
						<CardHeader>
							<CardTitle>{t("filesLab.uploads.title")}</CardTitle>
							<CardDescription>{t("filesLab.uploads.description")}</CardDescription>
						</CardHeader>
						<CardContent class="grid gap-4">
							<div class="flex flex-wrap gap-2">
								<Button
									onClick={() => setState("selectedFiles", createFilesLabGeneratedFiles())}
									type="button"
									variant="secondary"
								>
									{t("filesLab.actions.generateFixtures")}
								</Button>
								<Button
									disabled={state.isUploading}
									onClick={() => void uploadFiles(state.selectedFiles)}
									type="button"
								>
									{t("filesLab.actions.uploadSelected")}
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
								{t("filesLab.status.selectedFiles", { count: state.selectedFiles.length })}
							</P>
							<ul class="grid gap-2">
								<For each={state.selectedFiles}>
									{(file) => (
										<li class="rounded-lg border border-border/70 px-3 py-2 text-sm">
											{file.name} - {file.type || t("filesLab.uploads.octetStream")} - {file.size}{" "}
											{t("files.units.bytes")}
										</li>
									)}
								</For>
							</ul>
						</CardContent>
					</Card>
				</div>

				<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
					<CardHeader>
						<CardTitle>{t("filesLab.runtime.title")}</CardTitle>
						<CardDescription>{t("filesLab.runtime.description")}</CardDescription>
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
													{t("filesLab.runtime.targetPrefix")} {target().protocol} {target().method}
												</P>
											)}
										</Show>
										<Show when={item.record}>
											{(record) => (
												<P class="mt-2 text-muted-foreground text-xs">
													{t("filesLab.runtime.recordPrefix")} {record().id}
												</P>
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
	errorMessages: FilesLabErrorMessages;
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
	errorMessages: FilesLabErrorMessages;
	forcedProtocol: "auto" | FilesUploadProtocol;
	storageBackend: FilesStorageBackend;
	track: FilesLabTrack;
}): FilesClient {
	const client = createFilesClient();

	return {
		...client,
		downloadDirect: async () => {
			throw new Error(options.errorMessages.directDownloadForbidden);
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
			throw new Error(options.errorMessages.directUploadForbidden);
		},
		watchProcessing: async function* () {},
		watchUpload: async function* () {},
	};
}

function createHybridFilesClient(options: {
	approach: FilesLabApproach;
	errorMessages: FilesLabErrorMessages;
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

type FilesLabErrorMessages = {
	directDownloadForbidden: string;
	directUploadForbidden: string;
};
