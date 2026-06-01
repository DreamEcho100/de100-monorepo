import { useI18n } from "@de100/i18n-domains-solidjs/client";
import type { UploaderRecordVisibility } from "@de100/ui-domains-solidjs";
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
	Image,
	NativeSelect,
	NativeSelectOption,
	P,
	Uploader,
} from "@de100/ui-domains-solidjs";
import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { createMutation, createQuery, useQueryClient } from "@tanstack/solid-query";
import { Loader2, Trash2 } from "lucide-solid";
import type { JSX } from "solid-js";
import { createEffect, createMemo, createSignal, For, onMount, Show } from "solid-js";

import { authClient } from "~/libs/apis/auth-client";
import { orpc } from "~/libs/apis/orpc";
import { createMediaUploaderRuntimeFactory } from "~/libs/media-uploader-runtime";
import { localizeOrpcError } from "~/libs/orpc-errors";

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

function MediaStatusAlert(props: {
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

function MediaList(props: MediaListProps) {
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
						{item.contentType.startsWith("image/") ? (
							<div class="max-w-xs overflow-hidden rounded-xl border border-border/70 bg-muted/20">
								<Show
									fallback={
										<Image
											alt={item.fileName}
											class="h-28 w-full"
											height={112}
											imgClass="h-full w-full object-cover"
											placeholder="skeleton"
											src={item.directUrl ?? item.accessUrl}
											width={200}
										/>
									}
									when={item.status === "ready"}
								>
									<ArtDirectedImage
										alt={item.fileName}
										class="h-28 w-full"
										fallbackSrc={item.accessUrl}
										height={112}
										imgClass="h-full w-full object-cover"
										placeholder="blur"
										placeholderColor="hsl(var(--muted))"
										sources={[
											{
												media: "(min-width: 1024px)",
												src: item.directUrl ?? item.accessUrl,
											},
											{
												media: "(max-width: 1023px)",
												src: item.accessUrl,
											},
										]}
										src={item.directUrl ?? item.accessUrl}
										width={200}
									/>
								</Show>
							</div>
						) : null}
						<p class="break-all text-muted-foreground text-sm">{item.key}</p>
						<p class="text-muted-foreground text-sm">
							{props.t("media.status.bucketLabel")}:{" "}
							{item.bucketName ?? props.t("media.status.unavailableBucket")}
						</p>
						<div class="flex flex-wrap gap-3">
							<Button
								as="a"
								href={item.accessUrl}
								rel="noreferrer"
								target="_blank"
								variant="outline"
							>
								{props.t("media.actions.openAppUrl")}
							</Button>
							<Show when={item.directUrl}>
								{(directUrl) => (
									<Button
										as="a"
										href={directUrl()}
										rel="noreferrer"
										target="_blank"
										variant="outline"
									>
										{props.t("media.actions.openDirectUrl")}
									</Button>
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
									<Button as="a" href={link()} rel="noreferrer" target="_blank" variant="outline">
										{props.t("media.actions.openSignedUrl")}
									</Button>
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
	const [isHydrated, setIsHydrated] = createSignal(false);
	const [uploadError, setUploadError] = createSignal<string | null>(null);
	const [uploadNotice, setUploadNotice] = createSignal<string | null>(null);
	const [signedAccessLink, setSignedAccessLink] = createSignal<string | null>(null);
	const [signedAccessMediaId, setSignedAccessMediaId] = createSignal<string | null>(null);
	const [visibility, setVisibility] = createSignal<UploaderRecordVisibility>("private");
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
				setUploadError(localizeOrpcError(error, t) ?? t("media.status.uploadFailed"));
			},
			onSuccess: async () => {
				setUploadNotice(t("media.status.storedDraftNotice"));
				await refreshMedia();
			},
		}),
	);
	const mediaUploaderRuntimeFactory = createMemo(() =>
		createMediaUploaderRuntimeFactory({
			uploadFile: async ({ file, visibility: uploadVisibility }) => {
				setUploadError(null);
				setUploadNotice(null);
				await uploadMediaMutation.mutateAsync({
					file,
					visibility: uploadVisibility,
				});
			},
		}),
	);
	const confirmUploadMutation = createMutation(() =>
		orpc.media.confirmUpload.mutationOptions({
			onError: (error) => {
				setUploadError(localizeOrpcError(error, t) ?? t("media.status.confirmFailed"));
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
				setUploadError(localizeOrpcError(error, t) ?? t("media.status.deleteFailed"));
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
				setUploadError(localizeOrpcError(error, t) ?? t("media.status.signedAccessFailed"));
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
							<P
								class="font-semibold text-primary text-xs uppercase tracking-[0.24em]"
								tone="accent"
								variant="caption-sm"
							>
								{t("media.page.eyebrow")}
							</P>
							<CardTitle>{t("media.page.title")}</CardTitle>
							<CardDescription>{t("media.page.description")}</CardDescription>
						</div>
						<Badge variant="secondary">{t("media.badges.authAccess")}</Badge>
					</div>
					<Show when={isHydrated() && !session().isPending && session().data}>
						{(currentSession) => (
							<P class="max-w-[60ch] text-base text-muted-foreground leading-7">
								{t("media.page.sessionPrefix")} {currentSession().user.email}.{" "}
								{t("media.page.sessionSuffix")}
							</P>
						)}
					</Show>
				</CardHeader>
			</Card>

			<Show
				fallback={
					<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm lg:col-span-2">
						<CardContent class="pt-6">
							<MediaStatusAlert role="status">{t("media.status.loadingBackend")}</MediaStatusAlert>
						</CardContent>
					</Card>
				}
				when={isHydrated()}
			>
				{(_val) => (
					<>
						<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
							<CardHeader>
								<CardTitle>{t("media.sections.backendTitle")}</CardTitle>
								<CardDescription>{t("media.sections.backendDescription")}</CardDescription>
							</CardHeader>
							<CardContent class="space-y-4">
								<Show when={!canLoadMedia() || mediaCapabilities.isPending}>
									<MediaStatusAlert role="status">
										{t("media.status.loadingBackend")}
									</MediaStatusAlert>
								</Show>
								<Show when={canLoadMedia() && mediaCapabilities.isError}>
									<MediaStatusAlert role="alert" variant="destructive">
										{localizeOrpcError(mediaCapabilities.error, t) ??
											t("media.status.backendLoadError")}
									</MediaStatusAlert>
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
										<MediaStatusAlert role="status">
											{t("media.status.signedAccessLabel")}{" "}
											<a class="underline" href={link()} rel="noreferrer" target="_blank">
												{t("media.actions.openSignedUrl")}
											</a>
										</MediaStatusAlert>
									)}
								</Show>
							</CardContent>
						</Card>

						<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
							<CardHeader>
								<CardTitle>{t("media.sections.uploadTitle")}</CardTitle>
								<CardDescription>{t("media.sections.uploadDescription")}</CardDescription>
							</CardHeader>
							<CardContent class="grid gap-4">
								<Field class="grid gap-4">
									<FieldLabel for="media-visibility">{t("media.fields.visibility")}</FieldLabel>
									<FieldContent>
										<NativeSelect
											class="w-full"
											id="media-visibility"
											onChange={(changeEvent) =>
												setVisibility(
													changeEvent.currentTarget.value === "public" ? "public" : "private",
												)
											}
											value={visibility()}
										>
											<NativeSelectOption value="private">
												{t("media.visibility.private")}
											</NativeSelectOption>
											<NativeSelectOption value="public">
												{t("media.visibility.public")}
											</NativeSelectOption>
										</NativeSelect>
										<FieldDescription>{t("media.fields.visibilityDescription")}</FieldDescription>
									</FieldContent>
								</Field>

								<Uploader
									class="rounded-xl border border-border/70 bg-muted/15 p-4"
									controllerDependencies={{
										createRuntime: mediaUploaderRuntimeFactory(),
									}}
									disabled={!canLoadMedia() || uploadMediaMutation.isPending}
									helperText={t("media.fields.file")}
									i18n={{
										browseCta: t("media.actions.uploadFile"),
										dropzoneHint: t("media.fields.file"),
										uploadSuccess: t("media.status.storedDraftNotice"),
									}}
									persistence={{ enabled: false }}
									restrictions={{
										allowedMimeTypes: [
											"image/*",
											"video/*",
											"application/pdf",
											"text/plain",
											"text/csv",
											"application/json",
										],
										maxFileBytes: 25 * 1024 * 1024,
										maxFiles: 5,
									}}
									visibility={visibility()}
								/>

								<Show when={uploadNotice()}>
									{(message) => <MediaStatusAlert role="status">{message()}</MediaStatusAlert>}
								</Show>

								<Show when={uploadError()}>
									{(message) => (
										<MediaStatusAlert role="alert" variant="destructive">
											{message()}
										</MediaStatusAlert>
									)}
								</Show>
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
									<MediaStatusAlert role="status">
										{t("media.status.loadingDrafts")}
									</MediaStatusAlert>
								</Show>
								<Show when={canLoadMedia() && mediaItems.isError}>
									<MediaStatusAlert role="alert" variant="destructive">
										{localizeOrpcError(mediaItems.error, t) ?? t("media.status.loadError")}
									</MediaStatusAlert>
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
