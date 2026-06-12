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
	Input,
	NativeSelect,
	NativeSelectOption,
	P,
} from "@de100/ui-domains-solidjs";
import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { createEffect, For, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";

import { authClient } from "~/libs/apis/auth-client";
import { orpc } from "~/libs/apis/orpc";

import { createLocalizedPath } from "../i18n/routing";

type CourseVideoLabLog = {
	id: string;
	message: string;
	status: "error" | "info" | "success";
};

type LessonVisibility = "enrolled" | "preview" | "private";

export default function CourseVideoLabPage() {
	const { locale, t } = useI18n();
	const navigate = useNavigate();
	const session = authClient.useSession();
	const [state, setState] = createStore<{
		chapterSlug: string;
		chapterTitle: string;
		courseSlug: string;
		courseTitle: string;
		fileId: string;
		isHydrated: boolean;
		lessonSlug: string;
		lessonTitle: string;
		lessonVisibility: LessonVisibility;
		logs: CourseVideoLabLog[];
		playbackToken: null | string;
	}>({
		chapterSlug: "intro",
		chapterTitle: t("courseVideoLab.defaults.chapterTitle"),
		courseSlug: "video-lab-course",
		courseTitle: t("courseVideoLab.defaults.courseTitle"),
		fileId: "",
		isHydrated: false,
		lessonSlug: "hls-preview",
		lessonTitle: t("courseVideoLab.defaults.lessonTitle"),
		lessonVisibility: "preview",
		logs: [],
		playbackToken: null,
	});
	const canUseLab = () => state.isHydrated && !session().isPending && !!session().data;

	function appendLog(message: string, status: CourseVideoLabLog["status"]) {
		setState("logs", (current) => [
			{
				id: crypto.randomUUID(),
				message,
				status,
			},
			...current,
		]);
	}

	const createCourseMutation = createMutation(() =>
		orpc.courses.createCourse.mutationOptions({
			onError: (error) =>
				appendLog(readErrorMessage(error, t("courseVideoLab.logs.courseCreationFailed")), "error"),
			onSuccess: (course) => {
				appendLog(t("courseVideoLab.logs.createdCourse", { slug: course.slug }), "success");
			},
		}),
	);
	async function createCourse() {
		try {
			await createCourseMutation.mutateAsync({
				slug: state.courseSlug,
				status: "published",
				title: state.courseTitle,
			});
		} catch {
			// handled by mutation options
		}
	}

	const createChapterMutation = createMutation(() =>
		orpc.courses.createChapter.mutationOptions({
			onError: (error) =>
				appendLog(readErrorMessage(error, t("courseVideoLab.logs.chapterCreationFailed")), "error"),
			onSuccess: (chapter) => {
				appendLog(t("courseVideoLab.logs.createdChapter", { slug: chapter.slug }), "success");
			},
		}),
	);
	async function createChapter() {
		try {
			await createChapterMutation.mutateAsync({
				courseSlug: state.courseSlug,
				position: 1,
				slug: state.chapterSlug,
				title: state.chapterTitle,
			});
		} catch {
			// handled by mutation options
		}
	}

	const createLessonMutation = createMutation(() =>
		orpc.courses.createLesson.mutationOptions({
			onError: (error) =>
				appendLog(readErrorMessage(error, t("courseVideoLab.logs.lessonCreationFailed")), "error"),
			onSuccess: (lesson) => {
				appendLog(t("courseVideoLab.logs.createdLesson", { slug: lesson.slug }), "success");
			},
		}),
	);
	async function createLesson() {
		try {
			await createLessonMutation.mutateAsync({
				chapterSlug: state.chapterSlug,
				courseSlug: state.courseSlug,
				position: 1,
				slug: state.lessonSlug,
				title: state.lessonTitle,
				visibility: state.lessonVisibility,
			});
		} catch {
			// handled by mutation options
		}
	}

	const attachVideoMutation = createMutation(() =>
		orpc.courses.attachLessonVideo.mutationOptions({
			onError: (error) =>
				appendLog(readErrorMessage(error, t("courseVideoLab.logs.videoAttachmentFailed")), "error"),
			onSuccess: (result) => {
				appendLog(
					t("courseVideoLab.logs.attachedVideo", {
						fileId: result.file.id,
						status: result.asset.status,
					}),
					"success",
				);
			},
		}),
	);
	async function attachVideo() {
		try {
			await attachVideoMutation.mutateAsync({
				chapterSlug: state.chapterSlug,
				courseSlug: state.courseSlug,
				fileId: state.fileId.trim(),
				lessonSlug: state.lessonSlug,
			});
		} catch {
			// handled by mutation options
		}
	}

	const playbackMutation = createMutation(() =>
		orpc.courses.createPlaybackSession.mutationOptions({
			onError: (error) =>
				appendLog(readErrorMessage(error, t("courseVideoLab.logs.playbackSessionFailed")), "error"),
			onSuccess: (result) => {
				setState("playbackToken", result.session?.token ?? null);
				appendLog(
					t("courseVideoLab.logs.playbackDecision", { reason: result.decision.reason }),
					result.session ? "success" : "info",
				);
			},
		}),
	);
	async function requestPlaybackSession() {
		try {
			await playbackMutation.mutateAsync({
				chapterSlug: state.chapterSlug,
				courseSlug: state.courseSlug,
				lessonSlug: state.lessonSlug,
			});
		} catch {
			// handled by mutation options
		}
	}

	onMount(() => {
		setState({
			courseSlug: `video-lab-${Date.now()}`,
			isHydrated: true,
		});
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
			<Title>{t("courseVideoLab.metaTitle")}</Title>
			<Show
				fallback={
					<Alert role="status">
						<AlertDescription>{t("courseVideoLab.page.loading")}</AlertDescription>
					</Alert>
				}
				when={canUseLab()}
			>
				<Card class="border-primary/10 bg-card/95 shadow-black/5 shadow-sm">
					<CardHeader class="space-y-3">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<CardTitle>{t("courseVideoLab.page.title")}</CardTitle>
								<CardDescription>{t("courseVideoLab.page.description")}</CardDescription>
							</div>
							<Badge variant="secondary">{t("courseVideoLab.page.phaseBadge")}</Badge>
						</div>
					</CardHeader>
				</Card>

				<div class="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
					<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
						<CardHeader>
							<CardTitle>{t("courseVideoLab.structure.title")}</CardTitle>
							<CardDescription>{t("courseVideoLab.structure.description")}</CardDescription>
						</CardHeader>
						<CardContent class="grid gap-4">
							<Field class="grid gap-2">
								<FieldLabel for="course-video-lab-course-slug">
									{t("courseVideoLab.fields.courseSlug")}
								</FieldLabel>
								<FieldContent>
									<Input
										id="course-video-lab-course-slug"
										onInput={(event) => setState("courseSlug", event.currentTarget.value)}
										value={state.courseSlug}
									/>
								</FieldContent>
							</Field>
							<Field class="grid gap-2">
								<FieldLabel for="course-video-lab-course-title">
									{t("courseVideoLab.fields.courseTitle")}
								</FieldLabel>
								<FieldContent>
									<Input
										id="course-video-lab-course-title"
										onInput={(event) => setState("courseTitle", event.currentTarget.value)}
										value={state.courseTitle}
									/>
								</FieldContent>
							</Field>
							<Button
								disabled={createCourseMutation.isPending}
								onClick={createCourse}
								type="button"
							>
								{t("courseVideoLab.actions.createCourse")}
							</Button>

							<div class="grid gap-3 border-border border-t pt-4">
								<Field class="grid gap-2">
									<FieldLabel for="course-video-lab-chapter-slug">
										{t("courseVideoLab.fields.chapterSlug")}
									</FieldLabel>
									<FieldContent>
										<Input
											id="course-video-lab-chapter-slug"
											onInput={(event) => setState("chapterSlug", event.currentTarget.value)}
											value={state.chapterSlug}
										/>
									</FieldContent>
								</Field>
								<Field class="grid gap-2">
									<FieldLabel for="course-video-lab-chapter-title">
										{t("courseVideoLab.fields.chapterTitle")}
									</FieldLabel>
									<FieldContent>
										<Input
											id="course-video-lab-chapter-title"
											onInput={(event) => setState("chapterTitle", event.currentTarget.value)}
											value={state.chapterTitle}
										/>
									</FieldContent>
								</Field>
								<Button
									disabled={createChapterMutation.isPending}
									onClick={createChapter}
									type="button"
									variant="secondary"
								>
									{t("courseVideoLab.actions.createChapter")}
								</Button>
							</div>

							<div class="grid gap-3 border-border border-t pt-4">
								<Field class="grid gap-2">
									<FieldLabel for="course-video-lab-lesson-slug">
										{t("courseVideoLab.fields.lessonSlug")}
									</FieldLabel>
									<FieldContent>
										<Input
											id="course-video-lab-lesson-slug"
											onInput={(event) => setState("lessonSlug", event.currentTarget.value)}
											value={state.lessonSlug}
										/>
									</FieldContent>
								</Field>
								<Field class="grid gap-2">
									<FieldLabel for="course-video-lab-lesson-title">
										{t("courseVideoLab.fields.lessonTitle")}
									</FieldLabel>
									<FieldContent>
										<Input
											id="course-video-lab-lesson-title"
											onInput={(event) => setState("lessonTitle", event.currentTarget.value)}
											value={state.lessonTitle}
										/>
									</FieldContent>
								</Field>
								<Field class="grid gap-2">
									<FieldLabel for="course-video-lab-lesson-visibility">
										{t("courseVideoLab.fields.lessonVisibility")}
									</FieldLabel>
									<FieldContent>
										<NativeSelect
											id="course-video-lab-lesson-visibility"
											onChange={(event) =>
												setState("lessonVisibility", event.currentTarget.value as LessonVisibility)
											}
											value={state.lessonVisibility}
										>
											<NativeSelectOption value="preview">
												{t("courseVideoLab.lessonVisibility.preview")}
											</NativeSelectOption>
											<NativeSelectOption value="enrolled">
												{t("courseVideoLab.lessonVisibility.enrolled")}
											</NativeSelectOption>
											<NativeSelectOption value="private">
												{t("courseVideoLab.lessonVisibility.private")}
											</NativeSelectOption>
										</NativeSelect>
									</FieldContent>
								</Field>
								<Button
									disabled={createLessonMutation.isPending}
									onClick={createLesson}
									type="button"
									variant="secondary"
								>
									{t("courseVideoLab.actions.createLesson")}
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
						<CardHeader>
							<CardTitle>{t("courseVideoLab.asset.title")}</CardTitle>
							<CardDescription>{t("courseVideoLab.asset.description")}</CardDescription>
						</CardHeader>
						<CardContent class="grid gap-4">
							<Field class="grid gap-2">
								<FieldLabel for="course-video-lab-file-id">
									{t("courseVideoLab.fields.videoFileId")}
								</FieldLabel>
								<FieldContent>
									<Input
										id="course-video-lab-file-id"
										onInput={(event) => setState("fileId", event.currentTarget.value)}
										value={state.fileId}
									/>
								</FieldContent>
							</Field>
							<div class="flex flex-wrap gap-2">
								<Button
									disabled={attachVideoMutation.isPending || state.fileId.trim().length === 0}
									onClick={attachVideo}
									type="button"
								>
									{t("courseVideoLab.actions.attachVideo")}
								</Button>
								<Button
									disabled={playbackMutation.isPending}
									onClick={requestPlaybackSession}
									type="button"
									variant="outline"
								>
									{t("courseVideoLab.actions.requestPlayback")}
								</Button>
							</div>
							<Show when={state.playbackToken}>
								{(token) => (
									<P class="break-all rounded-lg border border-border/70 p-3 text-muted-foreground text-xs">
										{token()}
									</P>
								)}
							</Show>
							<div class="flex flex-wrap gap-2">
								<Button
									as="a"
									href={createLocalizedPath(locale(), "/files")}
									type="button"
									variant="outline"
								>
									{t("filesLab.actions.files")}
								</Button>
								<Button
									as="a"
									href={createLocalizedPath(
										locale(),
										`/courses/${state.courseSlug}/${state.chapterSlug}/${state.lessonSlug}`,
									)}
									type="button"
									variant="outline"
								>
									{t("filesLab.actions.lesson")}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>

				<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
					<CardHeader>
						<CardTitle>{t("courseVideoLab.runLog.title")}</CardTitle>
						<CardDescription>{t("courseVideoLab.runLog.description")}</CardDescription>
					</CardHeader>
					<CardContent>
						<ul class="grid gap-2">
							<Show
								fallback={
									<P class="text-muted-foreground text-sm">{t("courseVideoLab.logs.empty")}</P>
								}
								when={state.logs.length > 0}
							>
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
							</Show>
						</ul>
					</CardContent>
				</Card>
			</Show>
		</main>
	);
}

function readErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback;
}
