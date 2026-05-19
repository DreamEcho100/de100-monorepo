import { useI18n } from "@de100/apps-lms-i18n";
import {
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
	Input,
} from "@de100/ui-solidjs";
import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { createMutation, createQuery, useQueryClient } from "@tanstack/solid-query";
import { Loader2, Trash2 } from "lucide-solid";
import { createEffect, createMemo, createSignal, For, onMount, Show } from "solid-js";

import { authClient } from "~/libs/apis/auth-client";
import { orpc } from "~/libs/apis/orpc";

import { createLocalizedPath } from "../i18n/routing";

type MediaRecord = {
	accessUrl: string;
	bucketName: string | null;
	confirmedAt: Date | string | null;
	contentType: string;
	createdAt: Date | string;
	deletedAt: Date | string | null;
	directUrl: string | null;
	fileName: string;
	id: string;
	key: string;
	size: number;
	status: "draft" | "ready" | "deleted";
	updatedAt: Date | string;
	userId: string;
	visibility: "public" | "private";
};

type MediaListProps = {
	emptyMessage: string;
	formatTimestamp: (value: Date | string | null) => string | null;
	isConfirmingMedia: (id: string) => boolean;
	isDeletingMedia: (id: string) => boolean;
	isIssuingSignedAccess: (id: string) => boolean;
	items: MediaRecord[];
	onConfirmMedia: (id: string) => Promise<void>;
	onDeleteMedia: (id: string) => Promise<void>;
	onIssueSignedAccess: (id: string) => Promise<void>;
	signedAccessLink: string | null;
	signedAccessMediaId: string | null;
	supportsSignedDelivery: boolean;
	t: (key: string) => string;
};

function MediaList(props: MediaListProps) {
	if (props.items.length === 0) {
		return (
			<p
				class="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-muted-foreground text-sm leading-6"
				role="status"
			>
				{props.emptyMessage}
			</p>
		);
	}

	return (
		<ul class="space-y-4">
			<For each={props.items}>
				{(item) => (
					<li class="space-y-3 rounded-xl border border-border/70 px-4 py-4">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="space-y-1">
								<p class="font-medium text-foreground">{item.fileName}</p>
								<p class="text-muted-foreground text-sm">
									{item.contentType} · {item.size} {props.t("media.units.bytes")} ·{" "}
									{props.formatTimestamp(item.createdAt)}
								</p>
								<Show when={item.confirmedAt}>
									{(confirmedAt) => (
										<p class="text-muted-foreground text-sm">
											{props.t("media.status.confirmedPrefix")}{" "}
											{props.formatTimestamp(confirmedAt())}
										</p>
									)}
								</Show>
							</div>
							<div class="flex flex-wrap gap-2">
								<Badge variant="outline">{props.t(`media.status.badges.${item.status}`)}</Badge>
								<Badge variant={item.visibility === "public" ? "secondary" : "outline"}>
									{props.t(`media.visibility.${item.visibility}`)}
								</Badge>
							</div>
						</div>
						<p class="break-all text-muted-foreground text-sm">{item.key}</p>
						<p class="text-muted-foreground text-sm">
							{props.t("media.status.bucketLabel")}:{" "}
							{item.bucketName ?? props.t("media.status.unavailableBucket")}
						</p>
						<div class="flex flex-wrap gap-3">
							<a
								class="inline-flex items-center justify-center rounded-lg border border-border/70 bg-card px-4 py-2 font-medium text-foreground text-sm no-underline transition-colors hover:bg-accent hover:text-accent-foreground"
								href={item.accessUrl}
								rel="noreferrer"
								target="_blank"
							>
								{props.t("media.actions.openAppUrl")}
							</a>
							<Show when={item.directUrl}>
								{(directUrl) => (
									<a
										class="inline-flex items-center justify-center rounded-lg border border-border/70 bg-card px-4 py-2 font-medium text-foreground text-sm no-underline transition-colors hover:bg-accent hover:text-accent-foreground"
										href={directUrl()}
										rel="noreferrer"
										target="_blank"
									>
										{props.t("media.actions.openDirectUrl")}
									</a>
								)}
							</Show>
							<Show when={props.supportsSignedDelivery && item.status === "ready"}>
								<Button
									disabled={props.isIssuingSignedAccess(item.id)}
									onClick={async () => {
										await props.onIssueSignedAccess(item.id);
									}}
									type="button"
									variant="secondary"
								>
									<Show
										fallback={<span>{props.t("media.actions.generateSignedUrl")}</span>}
										when={props.isIssuingSignedAccess(item.id)}
									>
										<Loader2 class="animate-spin" size={18} />
									</Show>
								</Button>
							</Show>
							<Show when={props.signedAccessMediaId === item.id && props.signedAccessLink}>
								{(link) => (
									<a
										class="inline-flex items-center justify-center rounded-lg border border-border/70 bg-card px-4 py-2 font-medium text-foreground text-sm no-underline transition-colors hover:bg-accent hover:text-accent-foreground"
										href={link()}
										rel="noreferrer"
										target="_blank"
									>
										{props.t("media.actions.openSignedUrl")}
									</a>
								)}
							</Show>
							<Show when={item.status === "draft"}>
								<Button
									disabled={
										props.isConfirmingMedia(item.id) ||
										props.isDeletingMedia(item.id) ||
										props.isIssuingSignedAccess(item.id)
									}
									onClick={async () => {
										await props.onConfirmMedia(item.id);
									}}
									type="button"
								>
									<Show
										fallback={<span>{props.t("media.actions.confirmUpload")}</span>}
										when={props.isConfirmingMedia(item.id)}
									>
										<Loader2 class="animate-spin" size={18} />
									</Show>
								</Button>
							</Show>
							<Button
								aria-label={props.t("media.actions.deleteAria")}
								disabled={
									props.isConfirmingMedia(item.id) ||
									props.isDeletingMedia(item.id) ||
									props.isIssuingSignedAccess(item.id)
								}
								onClick={async () => {
									await props.onDeleteMedia(item.id);
								}}
								type="button"
								variant="ghost"
							>
								<Show fallback={<Trash2 size={16} />} when={props.isDeletingMedia(item.id)}>
									<Loader2 class="animate-spin" size={18} />
								</Show>
							</Button>
						</div>
					</li>
				)}
			</For>
		</ul>
	);
}

export default function MediaPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { locale, t } = useI18n();
	const session = authClient.useSession();
	const [file, setFile] = createSignal<File | null>(null);
	const [isHydrated, setIsHydrated] = createSignal(false);
	const [uploadError, setUploadError] = createSignal<string | null>(null);
	const [uploadNotice, setUploadNotice] = createSignal<string | null>(null);
	const [signedAccessLink, setSignedAccessLink] = createSignal<string | null>(null);
	const [signedAccessMediaId, setSignedAccessMediaId] = createSignal<string | null>(null);
	const [visibility, setVisibility] = createSignal<"public" | "private">("private");
	const canLoadMedia = () => isHydrated() && !session().isPending && !!session().data;
	const mediaCapabilities = createQuery(() => ({
		...orpc.media.getCapabilities.queryOptions(),
		enabled: canLoadMedia(),
	}));
	const mediaItems = createQuery(() => ({
		...orpc.media.getAll.queryOptions(),
		enabled: canLoadMedia(),
	}));
	const uploadMediaMutation = createMutation(() =>
		orpc.media.upload.mutationOptions({
			onError: (error) => {
				setUploadError(error instanceof Error ? error.message : t("media.status.uploadFailed"));
			},
			onSuccess: async () => {
				setFile(null);
				setUploadNotice(t("media.status.storedDraftNotice"));
				await refreshMedia();
			},
		}),
	);
	const confirmUploadMutation = createMutation(() =>
		orpc.media.confirmUpload.mutationOptions({
			onError: (error) => {
				setUploadError(error instanceof Error ? error.message : t("media.status.confirmFailed"));
			},
			onSuccess: async () => {
				setUploadNotice(t("media.status.uploadConfirmedNotice"));
				await refreshMedia();
			},
		}),
	);
	const deleteMediaMutation = createMutation(() =>
		orpc.media.delete.mutationOptions({
			onError: (error) => {
				setUploadError(error instanceof Error ? error.message : t("media.status.deleteFailed"));
			},
			onSuccess: async () => {
				setUploadNotice(t("media.status.deletedNotice"));
				await refreshMedia();
			},
		}),
	);
	const issueSignedAccessMutation = createMutation(() =>
		orpc.media.issueSignedAccess.mutationOptions({
			onError: (error) => {
				setUploadError(
					error instanceof Error ? error.message : t("media.status.signedAccessFailed"),
				);
			},
			onSuccess: (result, variables) => {
				setSignedAccessLink(result.url);
				setSignedAccessMediaId(variables.id);
				setUploadNotice(t("media.status.signedAccessReady"));
			},
		}),
	);
	const draftMedia = createMemo(() =>
		((mediaItems.data ?? []) as MediaRecord[]).filter((item) => item.status === "draft"),
	);
	const readyMedia = createMemo(() =>
		((mediaItems.data ?? []) as MediaRecord[]).filter((item) => item.status === "ready"),
	);

	onMount(() => {
		setIsHydrated(true);
	});

	createEffect(() => {
		const currentSession = session();
		if (currentSession.isPending || currentSession.data) {
			return;
		}

		navigate(createLocalizedPath(locale(), "/login"), { replace: true });
	});

	async function refreshMedia() {
		await queryClient.invalidateQueries({
			queryKey: orpc.media.getAll.queryKey(),
		});
	}

	function isConfirmingMedia(id: string) {
		return confirmUploadMutation.isPending && confirmUploadMutation.variables?.id === id;
	}

	function isDeletingMedia(id: string) {
		return deleteMediaMutation.isPending && deleteMediaMutation.variables?.id === id;
	}

	function isIssuingSignedAccess(id: string) {
		return issueSignedAccessMutation.isPending && issueSignedAccessMutation.variables?.id === id;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		const currentFile = file();
		if (!currentFile) {
			setUploadError(t("media.status.missingFile"));
			return;
		}

		setUploadError(null);
		setUploadNotice(null);

		try {
			await uploadMediaMutation.mutateAsync({
				file: currentFile,
				visibility: visibility(),
			});
		} catch {
			// handled by mutation options
		}
	}

	async function handleConfirmMedia(id: string) {
		setUploadError(null);
		setUploadNotice(null);

		try {
			await confirmUploadMutation.mutateAsync({ id });
		} catch {
			// handled by mutation options
		}
	}

	async function handleDeleteMedia(id: string) {
		setUploadError(null);
		setUploadNotice(null);

		try {
			await deleteMediaMutation.mutateAsync({ id });
		} catch {
			// handled by mutation options
		}
	}

	async function handleIssueSignedAccess(id: string) {
		setUploadError(null);
		setUploadNotice(null);

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
			<Title>{t("media.metaTitle")}</Title>
			<Card class="border-primary/10 bg-card/95 shadow-black/5 shadow-sm lg:col-span-2">
				<CardHeader class="space-y-4">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="space-y-2">
							<p class="font-semibold text-primary text-xs uppercase tracking-[0.24em]">
								{t("media.page.eyebrow")}
							</p>
							<CardTitle>{t("media.page.title")}</CardTitle>
							<CardDescription>{t("media.page.description")}</CardDescription>
						</div>
						<Badge variant="secondary">{t("media.badges.authAccess")}</Badge>
					</div>
					<Show when={isHydrated() && !session().isPending && session().data}>
						{(currentSession) => (
							<p class="max-w-[60ch] text-base text-muted-foreground leading-7">
								{t("media.page.sessionPrefix")} {currentSession().user.email}.{" "}
								{t("media.page.sessionSuffix")}
							</p>
						)}
					</Show>
				</CardHeader>
			</Card>

			<Show
				fallback={
					<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm lg:col-span-2">
						<CardContent class="pt-6">
							<p
								class="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sky-700 text-sm leading-6 dark:text-sky-300"
								role="status"
							>
								{t("media.status.loadingBackend")}
							</p>
						</CardContent>
					</Card>
				}
				when={isHydrated()}
			>
				{() => (
					<>
						<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
							<CardHeader>
								<CardTitle>{t("media.sections.backendTitle")}</CardTitle>
								<CardDescription>{t("media.sections.backendDescription")}</CardDescription>
							</CardHeader>
							<CardContent class="space-y-4">
								<Show when={!canLoadMedia() || mediaCapabilities.isPending}>
									<p
										class="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sky-700 text-sm leading-6 dark:text-sky-300"
										role="status"
									>
										{t("media.status.loadingBackend")}
									</p>
								</Show>
								<Show when={canLoadMedia() && mediaCapabilities.isError}>
									<p
										class="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive text-sm leading-6"
										role="alert"
									>
										{mediaCapabilities.error instanceof Error
											? mediaCapabilities.error.message
											: t("media.status.backendLoadError")}
									</p>
								</Show>
								<Show when={canLoadMedia() && mediaCapabilities.data}>
									{(capabilities) => (
										<div class="flex flex-wrap gap-2">
											<Badge variant="secondary">
												{t("media.status.backendLabel")}:{" "}
												{t(`media.driver.${capabilities().driver}`)}
											</Badge>
											<Badge
												variant={capabilities().supportsDirectPublicUrl ? "secondary" : "outline"}
											>
												{capabilities().supportsDirectPublicUrl
													? t("media.status.directPublicReady")
													: t("media.status.directPublicUnavailable")}
											</Badge>
											<Badge
												variant={capabilities().supportsSignedDelivery ? "secondary" : "outline"}
											>
												{capabilities().supportsSignedDelivery
													? t("media.status.signedDeliveryReady")
													: t("media.status.signedDeliveryUnavailable")}
											</Badge>
										</div>
									)}
								</Show>
								<Show when={signedAccessLink()}>
									{(link) => (
										<p
											class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-700 text-sm leading-6 dark:text-emerald-300"
											role="status"
										>
											{t("media.status.signedAccessLabel")}{" "}
											<a class="underline" href={link()} rel="noreferrer" target="_blank">
												{t("media.actions.openSignedUrl")}
											</a>
										</p>
									)}
								</Show>
							</CardContent>
						</Card>

						<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
							<CardHeader>
								<CardTitle>{t("media.sections.uploadTitle")}</CardTitle>
								<CardDescription>{t("media.sections.uploadDescription")}</CardDescription>
							</CardHeader>
							<CardContent>
								<form class="grid gap-4" onSubmit={handleSubmit}>
									<Field class="grid gap-4">
										<FieldLabel for="media-file">{t("media.fields.file")}</FieldLabel>
										<FieldContent>
											<Input
												accept="image/*,video/*,.pdf,.txt,.csv,.json"
												id="media-file"
												onChange={(inputEvent) =>
													setFile(inputEvent.currentTarget.files?.[0] ?? null)
												}
												type="file"
											/>
											<FieldDescription>{t("media.fields.visibilityDescription")}</FieldDescription>
										</FieldContent>
									</Field>

									<Field class="grid gap-4">
										<FieldLabel for="media-visibility">{t("media.fields.visibility")}</FieldLabel>
										<FieldContent>
											<select
												class="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
												id="media-visibility"
												onChange={(changeEvent) =>
													setVisibility(
														changeEvent.currentTarget.value === "public" ? "public" : "private",
													)
												}
												value={visibility()}
											>
												<option value="private">{t("media.visibility.private")}</option>
												<option value="public">{t("media.visibility.public")}</option>
											</select>
										</FieldContent>
									</Field>

									<Show when={uploadNotice()}>
										{(message) => (
											<p
												class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-700 text-sm leading-6 dark:text-emerald-300"
												role="status"
											>
												{message()}
											</p>
										)}
									</Show>

									<Show when={uploadError()}>
										{(message) => (
											<p
												class="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive text-sm leading-6"
												role="alert"
											>
												{message()}
											</p>
										)}
									</Show>

									<Button disabled={!file() || uploadMediaMutation.isPending} type="submit">
										<Show
											fallback={<span>{t("media.actions.uploadFile")}</span>}
											when={uploadMediaMutation.isPending}
										>
											<Loader2 class="animate-spin" size={18} />
										</Show>
									</Button>
								</form>
							</CardContent>
						</Card>

						<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
							<CardHeader>
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div>
										<CardTitle>{t("media.sections.draftsTitle")}</CardTitle>
										<CardDescription>{t("media.sections.draftsDescription")}</CardDescription>
									</div>
									<Badge variant="outline">
										{draftMedia().length} {t("media.badges.draftsSuffix")}
									</Badge>
								</div>
							</CardHeader>
							<CardContent class="space-y-4">
								<Show when={!canLoadMedia() || mediaItems.isPending}>
									<p
										class="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sky-700 text-sm leading-6 dark:text-sky-300"
										role="status"
									>
										{t("media.status.loadingDrafts")}
									</p>
								</Show>
								<Show when={canLoadMedia() && mediaItems.isError}>
									<p
										class="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive text-sm leading-6"
										role="alert"
									>
										{mediaItems.error instanceof Error
											? mediaItems.error.message
											: t("media.status.loadError")}
									</p>
								</Show>
								<Show when={canLoadMedia() && !mediaItems.isPending && !mediaItems.isError}>
									<MediaList
										emptyMessage={t("media.status.noDrafts")}
										formatTimestamp={formatTimestamp}
										isConfirmingMedia={isConfirmingMedia}
										isDeletingMedia={isDeletingMedia}
										isIssuingSignedAccess={isIssuingSignedAccess}
										items={draftMedia()}
										onConfirmMedia={handleConfirmMedia}
										onDeleteMedia={handleDeleteMedia}
										onIssueSignedAccess={handleIssueSignedAccess}
										signedAccessLink={signedAccessLink()}
										signedAccessMediaId={signedAccessMediaId()}
										supportsSignedDelivery={!!mediaCapabilities.data?.supportsSignedDelivery}
										t={t}
									/>
								</Show>
							</CardContent>
						</Card>

						<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
							<CardHeader>
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div>
										<CardTitle>{t("media.sections.readyTitle")}</CardTitle>
										<CardDescription>{t("media.sections.readyDescription")}</CardDescription>
									</div>
									<Badge variant="secondary">
										{readyMedia().length} {t("media.badges.readySuffix")}
									</Badge>
								</div>
							</CardHeader>
							<CardContent>
								<Show when={canLoadMedia() && !mediaItems.isPending && !mediaItems.isError}>
									<MediaList
										emptyMessage={t("media.status.noReady")}
										formatTimestamp={formatTimestamp}
										isConfirmingMedia={isConfirmingMedia}
										isDeletingMedia={isDeletingMedia}
										isIssuingSignedAccess={isIssuingSignedAccess}
										items={readyMedia()}
										onConfirmMedia={handleConfirmMedia}
										onDeleteMedia={handleDeleteMedia}
										onIssueSignedAccess={handleIssueSignedAccess}
										signedAccessLink={signedAccessLink()}
										signedAccessMediaId={signedAccessMediaId()}
										supportsSignedDelivery={!!mediaCapabilities.data?.supportsSignedDelivery}
										t={t}
									/>
								</Show>
							</CardContent>
						</Card>
					</>
				)}
			</Show>
		</main>
	);
}
