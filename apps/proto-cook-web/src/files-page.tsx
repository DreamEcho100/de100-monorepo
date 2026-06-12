import { FileUploader } from "@de100/files-domains-solidjs/client";
import type { FilesVariantRecord } from "@de100/files-server/operations";
import type { FileRecord, FileVisibility } from "@de100/files-shared";
import { useI18n } from "@de100/i18n-domains-solidjs/client";
import {
	Alert,
	AlertDescription,
	ArtDirectedImage,
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
	NativeSelect,
	NativeSelectOption,
	P,
} from "@de100/ui-domains-solidjs";
import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { createMutation, createQuery, useQueryClient } from "@tanstack/solid-query";
import { Loader2, Trash2 } from "lucide-solid";
import type { JSX } from "solid-js";
import { createEffect, createMemo, For, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";

import { authClient } from "~/libs/apis/auth-client";
import { orpc, client as orpcClient } from "~/libs/apis/orpc";
import { createOrpcFilesClient } from "~/libs/files-client";
import { localizeOrpcError } from "~/libs/orpc-errors";

import { createLocalizedPath } from "../i18n/routing";

type FilesListProps = {
	emptyMessage: string;
	formatTimestamp: (value: Date | string | null) => string | null;
	isCompletingFile: (id: string) => boolean;
	isDeletingFile: (id: string) => boolean;
	isIssuingSignedAccess: (id: string) => boolean;
	items: FileRecord[];
	onCompleteFile: (id: string) => Promise<void>;
	onDeleteFile: (id: string) => Promise<void>;
	onIssueSignedAccess: (id: string) => Promise<void>;
	signedAccessFileId: string | null;
	signedAccessLink: string | null;
	t: (key: string) => string;
	variantsByFileId: Record<string, FilesVariantRecord[]>;
};

function FilesStatusAlert(props: {
	children: JSX.Element;
	role: "alert" | "status";
	variant?: "default" | "destructive";
}) {
	return (
		<Alert role={props.role} variant={props.variant ?? "default"}>
			<AlertDescription>{props.children}</AlertDescription>
		</Alert>
	);
}

function FilesList(props: FilesListProps) {
	if (props.items.length === 0) {
		return (
			<P
				class="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-muted-foreground text-sm leading-6"
				role="status"
			>
				{props.emptyMessage}
			</P>
		);
	}

	return (
		<ul class="space-y-4">
			<For each={props.items}>
				{(item) => {
					const accessUrl = () => createFilesAccessUrl(item);
					const variants = () => props.variantsByFileId[item.id] ?? [];
					return (
						<li class="space-y-3 rounded-xl border border-border/70 px-4 py-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="space-y-1">
									<p class="font-medium text-foreground">{item.fileName}</p>
									<p class="text-muted-foreground text-sm">
										{item.contentType} - {item.size} {props.t("files.units.bytes")} -{" "}
										{props.formatTimestamp(item.createdAt)}
									</p>
								</div>
								<div class="flex flex-wrap gap-2">
									<Badge variant="outline">{props.t(`files.status.badges.${item.status}`)}</Badge>
									<Badge variant="outline">{props.t(`files.kind.${item.kind}`)}</Badge>
									<Badge variant={item.visibility === "public" ? "secondary" : "outline"}>
										{props.t(`files.visibility.${item.visibility}`)}
									</Badge>
								</div>
							</div>

							<Show when={item.kind === "image"}>
								<div class="max-w-xs overflow-hidden rounded-xl border border-border/70 bg-muted/20">
									<ArtDirectedImage
										alt={item.fileName}
										class="h-28 w-full"
										fallbackSrc={accessUrl()}
										height={112}
										imgClass="h-full w-full object-cover"
										placeholder="blur"
										placeholderColor="hsl(var(--muted))"
										sources={[
											{
												media: "(min-width: 1024px)",
												src: accessUrl(),
											},
											{
												media: "(max-width: 1023px)",
												src: accessUrl(),
											},
										]}
										src={accessUrl()}
										width={200}
									/>
								</div>
							</Show>
							<Show when={item.kind === "video"}>
								<video
									class="max-w-sm rounded-xl border border-border/70"
									controls
									src={accessUrl()}
								>
									<track default kind="captions" label={item.fileName} src={emptyCaptionsTrack} />
								</video>
							</Show>
							<Show when={item.kind === "audio"}>
								<audio class="w-full max-w-sm" controls src={accessUrl()}>
									<track default kind="captions" label={item.fileName} src={emptyCaptionsTrack} />
								</audio>
							</Show>

							<p class="break-all text-muted-foreground text-sm">{item.key}</p>
							<p class="text-muted-foreground text-sm">
								{props.t("files.status.bucketLabel")}:{" "}
								{item.bucketName ?? props.t("files.status.unavailableBucket")}
							</p>
							<Show when={variants().length > 0}>
								<div class="space-y-2">
									<p class="font-medium text-foreground text-sm">
										{props.t("files.status.variantsLabel")}
									</p>
									<div class="flex flex-wrap gap-2">
										<For each={variants()}>
											{(variant) => (
												<Button
													as="a"
													href={createFilesVariantUrl(item, variant)}
													rel="noreferrer"
													target="_blank"
													variant="outline"
												>
													{props.t("files.actions.openVariant")}: {variant.kind}
												</Button>
											)}
										</For>
									</div>
								</div>
							</Show>
							<div class="flex flex-wrap gap-3">
								<Button
									as="a"
									href={accessUrl()}
									rel="noreferrer"
									target="_blank"
									variant="outline"
								>
									{props.t("files.actions.openAppUrl")}
								</Button>
								<Show when={item.status === "ready"}>
									<Button
										disabled={props.isIssuingSignedAccess(item.id)}
										onClick={async () => {
											await props.onIssueSignedAccess(item.id);
										}}
										type="button"
										variant="secondary"
									>
										<Show
											fallback={<span>{props.t("files.actions.generateSignedUrl")}</span>}
											when={props.isIssuingSignedAccess(item.id)}
										>
											<Loader2 class="animate-spin" size={18} />
										</Show>
									</Button>
								</Show>
								<Show when={props.signedAccessFileId === item.id && props.signedAccessLink}>
									{(link) => (
										<Button as="a" href={link()} rel="noreferrer" target="_blank" variant="outline">
											{props.t("files.actions.openSignedUrl")}
										</Button>
									)}
								</Show>
								<Show when={item.status !== "ready" && item.status !== "deleted"}>
									<Button
										disabled={
											props.isCompletingFile(item.id) ||
											props.isDeletingFile(item.id) ||
											props.isIssuingSignedAccess(item.id)
										}
										onClick={async () => {
											await props.onCompleteFile(item.id);
										}}
										type="button"
									>
										<Show
											fallback={<span>{props.t("files.actions.completeUpload")}</span>}
											when={props.isCompletingFile(item.id)}
										>
											<Loader2 class="animate-spin" size={18} />
										</Show>
									</Button>
								</Show>
								<Button
									aria-label={props.t("files.actions.deleteAria")}
									disabled={
										props.isCompletingFile(item.id) ||
										props.isDeletingFile(item.id) ||
										props.isIssuingSignedAccess(item.id)
									}
									onClick={async () => {
										await props.onDeleteFile(item.id);
									}}
									type="button"
									variant="ghost"
								>
									<Show fallback={<Trash2 size={16} />} when={props.isDeletingFile(item.id)}>
										<Loader2 class="animate-spin" size={18} />
									</Show>
								</Button>
							</div>
						</li>
					);
				}}
			</For>
		</ul>
	);
}

export default function FilesPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { locale, t } = useI18n();
	const session = authClient.useSession();
	const filesClient = createOrpcFilesClient();
	const [state, setState] = createStore<{
		isHydrated: boolean;
		signedAccessFileId: null | string;
		signedAccessLink: null | string;
		uploadError: null | string;
		uploadNotice: null | string;
		visibility: FileVisibility;
	}>({
		isHydrated: false,
		signedAccessFileId: null,
		signedAccessLink: null,
		uploadError: null,
		uploadNotice: null,
		visibility: "private",
	});
	const canLoadFiles = () => state.isHydrated && !session().isPending && !!session().data;
	const filesConfig = createQuery(() => ({
		...orpc.files.config.queryOptions(),
		enabled: canLoadFiles(),
	}));
	const filesItems = createQuery(() => ({
		...orpc.files.getAll.queryOptions(),
		enabled: canLoadFiles(),
	}));
	const completeUploadMutation = createMutation(() =>
		orpc.files.completeUpload.mutationOptions({
			onError: (error) => {
				setState("uploadError", localizeOrpcError(error, t) ?? t("files.status.completeFailed"));
			},
			onSuccess: async () => {
				setState("uploadNotice", t("files.status.uploadCompletedNotice"));
				await refreshFiles();
			},
		}),
	);
	const deleteFileMutation = createMutation(() =>
		orpc.files.delete.mutationOptions({
			onError: (error) => {
				setState("uploadError", localizeOrpcError(error, t) ?? t("files.status.deleteFailed"));
			},
			onSuccess: async () => {
				setState("uploadNotice", t("files.status.deletedNotice"));
				await refreshFiles();
			},
		}),
	);
	const issueSignedAccessMutation = createMutation(() =>
		orpc.files.issueSignedAccess.mutationOptions({
			onError: (error) => {
				setState(
					"uploadError",
					localizeOrpcError(error, t) ?? t("files.status.signedAccessFailed"),
				);
			},
			onSuccess: (result, variables) => {
				setState({
					signedAccessFileId: variables.id,
					signedAccessLink: result?.url ?? null,
					uploadNotice: t("files.status.signedAccessReady"),
				});
			},
		}),
	);
	const draftFiles = createMemo(() =>
		((filesItems.data ?? []) as FileRecord[]).filter((item) => item.status !== "ready"),
	);
	const readyFiles = createMemo(() =>
		((filesItems.data ?? []) as FileRecord[]).filter((item) => item.status === "ready"),
	);
	const readyFileIds = createMemo(() => readyFiles().map((item) => item.id));
	const fileVariants = createQuery(() => {
		const ids = readyFileIds();

		return {
			enabled: canLoadFiles() && ids.length > 0,
			queryFn: async () => {
				const entries = await Promise.all(
					ids.map(async (fileId) => [fileId, await orpcClient.files.listVariants({ fileId })]),
				);

				return Object.fromEntries(entries) as Record<string, FilesVariantRecord[]>;
			},
			queryKey: ["files", "variants", ids.join("|")],
		};
	});

	onMount(() => {
		setState("isHydrated", true);
	});

	createEffect(() => {
		const currentSession = session();
		if (currentSession.isPending || currentSession.data) {
			return;
		}

		navigate(createLocalizedPath(locale(), "/login"), { replace: true });
	});

	async function refreshFiles() {
		await queryClient.invalidateQueries({
			queryKey: orpc.files.getAll.queryKey(),
		});
		await queryClient.invalidateQueries({
			queryKey: ["files", "variants"],
		});
	}

	function isCompletingFile(id: string) {
		return completeUploadMutation.isPending && completeUploadMutation.variables?.fileId === id;
	}

	function isDeletingFile(id: string) {
		return deleteFileMutation.isPending && deleteFileMutation.variables?.id === id;
	}

	function isIssuingSignedAccess(id: string) {
		return issueSignedAccessMutation.isPending && issueSignedAccessMutation.variables?.id === id;
	}

	async function handleCompleteFile(id: string) {
		setState({
			uploadError: null,
			uploadNotice: null,
		});

		try {
			await completeUploadMutation.mutateAsync({ fileId: id });
		} catch {
			// handled by mutation options
		}
	}

	async function handleDeleteFile(id: string) {
		setState({
			uploadError: null,
			uploadNotice: null,
		});

		try {
			await deleteFileMutation.mutateAsync({ id });
		} catch {
			// handled by mutation options
		}
	}

	async function handleIssueSignedAccess(id: string) {
		setState({
			uploadError: null,
			uploadNotice: null,
		});

		try {
			await issueSignedAccessMutation.mutateAsync({ id });
		} catch {
			// handled by mutation options
		}
	}

	function formatTimestamp(value: Date | string | null) {
		if (!value) {
			return null;
		}

		return new Date(value).toLocaleString(locale());
	}

	return (
		<main
			class="mx-auto grid w-full max-w-7xl items-start gap-6 px-[clamp(1rem,2vw+0.5rem,2rem)] pt-8 pb-16 lg:grid-cols-2"
			id="main-content"
		>
			<Title>{t("files.metaTitle")}</Title>
			<Card class="border-primary/10 bg-card/95 shadow-black/5 shadow-sm lg:col-span-2">
				<CardHeader class="space-y-4">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="space-y-2">
							<P
								class="font-semibold text-primary text-xs uppercase tracking-[0.24em]"
								tone="accent"
								variant="caption-sm"
							>
								{t("files.page.eyebrow")}
							</P>
							<CardTitle>{t("files.page.title")}</CardTitle>
							<CardDescription>{t("files.page.description")}</CardDescription>
						</div>
						<div class="flex flex-wrap gap-2">
							<Button as="a" href={createLocalizedPath(locale(), "/files-lab")} variant="outline">
								{t("files.actions.openLab")}
							</Button>
							<Badge variant="secondary">{t("files.badges.authAccess")}</Badge>
						</div>
					</div>
					<Show when={state.isHydrated && !session().isPending && session().data}>
						{(currentSession) => (
							<P class="max-w-[60ch] text-base text-muted-foreground leading-7">
								{t("files.page.sessionPrefix")} {currentSession().user.email}.{" "}
								{t("files.page.sessionSuffix")}
							</P>
						)}
					</Show>
				</CardHeader>
			</Card>

			<Show
				fallback={
					<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm lg:col-span-2">
						<CardContent class="pt-6">
							<FilesStatusAlert role="status">{t("files.status.loadingBackend")}</FilesStatusAlert>
						</CardContent>
					</Card>
				}
				when={state.isHydrated}
			>
				<div class="contents">
					<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
						<CardHeader>
							<CardTitle>{t("files.sections.backendTitle")}</CardTitle>
							<CardDescription>{t("files.sections.backendDescription")}</CardDescription>
						</CardHeader>
						<CardContent class="space-y-4">
							<Show when={!canLoadFiles() || filesConfig.isPending}>
								<FilesStatusAlert role="status">
									{t("files.status.loadingBackend")}
								</FilesStatusAlert>
							</Show>
							<Show when={canLoadFiles() && filesConfig.isError}>
								<FilesStatusAlert role="alert" variant="destructive">
									{localizeOrpcError(filesConfig.error, t) ?? t("files.status.backendLoadError")}
								</FilesStatusAlert>
							</Show>
							<Show when={canLoadFiles() && filesConfig.data}>
								{(config) => (
									<div class="flex flex-wrap gap-2">
										<Badge variant={config().directUpload.enabled ? "secondary" : "outline"}>
											{config().directUpload.enabled
												? t("files.status.directRpcReady")
												: t("files.status.directRpcUnavailable")}
										</Badge>
										<Badge variant="outline">
											{t("files.status.directLimitLabel")}: {config().directUpload.maxBytes}{" "}
											{t("files.units.bytes")}
										</Badge>
										<Badge variant="outline">
											{t("files.status.routeCountLabel")}: {config().routes.length}
										</Badge>
									</div>
								)}
							</Show>
							<Show when={state.signedAccessLink}>
								{(link) => (
									<FilesStatusAlert role="status">
										{t("files.status.signedAccessLabel")}{" "}
										<a class="underline" href={link()} rel="noreferrer" target="_blank">
											{t("files.actions.openSignedUrl")}
										</a>
									</FilesStatusAlert>
								)}
							</Show>
						</CardContent>
					</Card>

					<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
						<CardHeader>
							<CardTitle>{t("files.sections.uploadTitle")}</CardTitle>
							<CardDescription>{t("files.sections.uploadDescription")}</CardDescription>
						</CardHeader>
						<CardContent class="grid gap-4">
							<Field class="grid gap-4">
								<FieldLabel for="files-visibility">{t("files.fields.visibility")}</FieldLabel>
								<FieldContent>
									<NativeSelect
										class="w-full"
										id="files-visibility"
										onChange={(changeEvent) =>
											setState(
												"visibility",
												changeEvent.currentTarget.value === "public" ? "public" : "private",
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
									<FieldDescription>{t("files.fields.visibilityDescription")}</FieldDescription>
								</FieldContent>
							</Field>

							<FileUploader
								accept="image/*,video/*,audio/*,application/pdf,text/plain,text/csv,application/json"
								class="rounded-xl border border-border/70 bg-muted/15 p-4"
								client={filesClient}
								disabled={!canLoadFiles()}
								labels={{
									browse: t("files.actions.uploadFile"),
									cancel: t("files.actions.cancelUpload"),
									clearCompleted: t("files.actions.clearCompleted"),
									dropzone: t("files.fields.file"),
									empty: t("files.status.noQueuedFiles"),
									pause: t("files.actions.pauseUpload"),
									resume: t("files.actions.resumeUpload"),
									retry: t("files.actions.retryUpload"),
									upload: t("files.actions.uploadFile"),
									uploadAll: t("files.actions.uploadAll"),
								}}
								onUploadComplete={async () => {
									setState({
										uploadError: null,
										uploadNotice: t("files.status.uploadCompletedNotice"),
									});
									await refreshFiles();
								}}
								restrictions={{
									allowedFileKinds: ["image", "video", "audio", "document", "file"],
									maxFileBytes: 25 * 1024 * 1024,
									maxFiles: 5,
								}}
								routeSlug="proto-cook-library"
								validationMessages={{
									invalidFileKind: t("files.validation.invalidFileKind"),
									invalidFileType: t("files.validation.invalidFileType"),
									overFileCount: t("files.validation.overFileCount"),
									overFileSize: t("files.validation.overFileSize"),
								}}
								visibility={state.visibility}
							/>

							<Show when={state.uploadNotice}>
								{(message) => <FilesStatusAlert role="status">{message()}</FilesStatusAlert>}
							</Show>

							<Show when={state.uploadError}>
								{(message) => (
									<FilesStatusAlert role="alert" variant="destructive">
										{message()}
									</FilesStatusAlert>
								)}
							</Show>
						</CardContent>
					</Card>

					<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
						<CardHeader>
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div>
									<CardTitle>{t("files.sections.draftsTitle")}</CardTitle>
									<CardDescription>{t("files.sections.draftsDescription")}</CardDescription>
								</div>
								<Badge variant="outline">
									{draftFiles().length} {t("files.badges.draftsSuffix")}
								</Badge>
							</div>
						</CardHeader>
						<CardContent class="space-y-4">
							<Show when={!canLoadFiles() || filesItems.isPending}>
								<FilesStatusAlert role="status">{t("files.status.loadingDrafts")}</FilesStatusAlert>
							</Show>
							<Show when={canLoadFiles() && filesItems.isError}>
								<FilesStatusAlert role="alert" variant="destructive">
									{localizeOrpcError(filesItems.error, t) ?? t("files.status.loadError")}
								</FilesStatusAlert>
							</Show>
							<Show when={canLoadFiles() && !filesItems.isPending && !filesItems.isError}>
								<FilesList
									emptyMessage={t("files.status.noDrafts")}
									formatTimestamp={formatTimestamp}
									isCompletingFile={isCompletingFile}
									isDeletingFile={isDeletingFile}
									isIssuingSignedAccess={isIssuingSignedAccess}
									items={draftFiles()}
									onCompleteFile={handleCompleteFile}
									onDeleteFile={handleDeleteFile}
									onIssueSignedAccess={handleIssueSignedAccess}
									signedAccessFileId={state.signedAccessFileId}
									signedAccessLink={state.signedAccessLink}
									t={t}
									variantsByFileId={fileVariants.data ?? {}}
								/>
							</Show>
						</CardContent>
					</Card>

					<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
						<CardHeader>
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div>
									<CardTitle>{t("files.sections.readyTitle")}</CardTitle>
									<CardDescription>{t("files.sections.readyDescription")}</CardDescription>
								</div>
								<Badge variant="secondary">
									{readyFiles().length} {t("files.badges.readySuffix")}
								</Badge>
							</div>
						</CardHeader>
						<CardContent>
							<Show when={canLoadFiles() && !filesItems.isPending && !filesItems.isError}>
								<FilesList
									emptyMessage={t("files.status.noReady")}
									formatTimestamp={formatTimestamp}
									isCompletingFile={isCompletingFile}
									isDeletingFile={isDeletingFile}
									isIssuingSignedAccess={isIssuingSignedAccess}
									items={readyFiles()}
									onCompleteFile={handleCompleteFile}
									onDeleteFile={handleDeleteFile}
									onIssueSignedAccess={handleIssueSignedAccess}
									signedAccessFileId={state.signedAccessFileId}
									signedAccessLink={state.signedAccessLink}
									t={t}
									variantsByFileId={fileVariants.data ?? {}}
								/>
							</Show>
						</CardContent>
					</Card>
				</div>
			</Show>
		</main>
	);
}

const emptyCaptionsTrack = "data:text/vtt,WEBVTT%0A";

function createFilesAccessUrl(file: FileRecord) {
	if (file.accessUrl) {
		return file.accessUrl;
	}

	const encodedKey = file.key.split("/").map(encodeURIComponent).join("/");
	return `/api/files/${file.visibility}/${encodedKey}`;
}

function createFilesVariantUrl(file: FileRecord, variant: FilesVariantRecord) {
	return `/api/files/${encodeURIComponent(file.id)}/variants/${encodeURIComponent(variant.kind)}`;
}
