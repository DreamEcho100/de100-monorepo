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
import { createEffect, createSignal, For, onMount, Show } from "solid-js";

import { authClient } from "~/libs/apis/auth-client";
import { orpc } from "~/libs/apis/orpc";

import { createLocalizedPath } from "../i18n/routing";

type CourseVideoLabLog = {
	id: string;
	message: string;
	status: "error" | "info" | "success";
};

export default function CourseVideoLabPage() {
	const { locale } = useI18n();
	const navigate = useNavigate();
	const session = authClient.useSession();
	const [isHydrated, setIsHydrated] = createSignal(false);
	const [courseSlug, setCourseSlug] = createSignal("video-lab-course");
	const [courseTitle, setCourseTitle] = createSignal("Video Lab Course");
	const [chapterSlug, setChapterSlug] = createSignal("intro");
	const [chapterTitle, setChapterTitle] = createSignal("Intro");
	const [lessonSlug, setLessonSlug] = createSignal("hls-preview");
	const [lessonTitle, setLessonTitle] = createSignal("HLS Preview");
	const [lessonVisibility, setLessonVisibility] = createSignal<"enrolled" | "preview" | "private">(
		"preview",
	);
	const [fileId, setFileId] = createSignal("");
	const [logs, setLogs] = createSignal<CourseVideoLabLog[]>([]);
	const [playbackToken, setPlaybackToken] = createSignal<string | null>(null);
	const canUseLab = () => isHydrated() && !session().isPending && !!session().data;

	const createCourseMutation = createMutation(() =>
		orpc.courses.createCourse.mutationOptions({
			onError: (error) => appendLog(readErrorMessage(error, "Course creation failed."), "error"),
			onSuccess: (course) => {
				appendLog(`Created course ${course.slug}.`, "success");
			},
		}),
	);
	const createChapterMutation = createMutation(() =>
		orpc.courses.createChapter.mutationOptions({
			onError: (error) => appendLog(readErrorMessage(error, "Chapter creation failed."), "error"),
			onSuccess: (chapter) => {
				appendLog(`Created chapter ${chapter.slug}.`, "success");
			},
		}),
	);
	const createLessonMutation = createMutation(() =>
		orpc.courses.createLesson.mutationOptions({
			onError: (error) => appendLog(readErrorMessage(error, "Lesson creation failed."), "error"),
			onSuccess: (lesson) => {
				appendLog(`Created lesson ${lesson.slug}.`, "success");
			},
		}),
	);
	const attachVideoMutation = createMutation(() =>
		orpc.courses.attachLessonVideo.mutationOptions({
			onError: (error) => appendLog(readErrorMessage(error, "Video attachment failed."), "error"),
			onSuccess: (result) => {
				appendLog(
					`Attached video file ${result.file.id}; asset is ${result.asset.status}.`,
					"success",
				);
			},
		}),
	);
	const playbackMutation = createMutation(() =>
		orpc.courses.createPlaybackSession.mutationOptions({
			onError: (error) => appendLog(readErrorMessage(error, "Playback session failed."), "error"),
			onSuccess: (result) => {
				setPlaybackToken(result.session?.token ?? null);
				appendLog(
					`Playback decision: ${result.decision.reason}.`,
					result.session ? "success" : "info",
				);
			},
		}),
	);

	onMount(() => {
		setIsHydrated(true);
		setCourseSlug(`video-lab-${Date.now()}`);
	});

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
			<Title>Course Video Lab</Title>
			<Show
				fallback={
					<Alert role="status">
						<AlertDescription>Loading course video lab session...</AlertDescription>
					</Alert>
				}
				when={canUseLab()}
			>
				<Card class="border-primary/10 bg-card/95 shadow-black/5 shadow-sm">
					<CardHeader class="space-y-3">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<CardTitle>Course video lab</CardTitle>
								<CardDescription>
									Attach uploaded videos to lessons, queue HLS processing, and request signed
									playback sessions.
								</CardDescription>
							</div>
							<Badge variant="secondary">Phase 8</Badge>
						</div>
					</CardHeader>
				</Card>

				<div class="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
					<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
						<CardHeader>
							<CardTitle>Course structure</CardTitle>
							<CardDescription>Owner-scoped course, chapter, and lesson creation.</CardDescription>
						</CardHeader>
						<CardContent class="grid gap-4">
							<Field class="grid gap-2">
								<FieldLabel for="course-video-lab-course-slug">Course slug</FieldLabel>
								<FieldContent>
									<Input
										id="course-video-lab-course-slug"
										onInput={(event) => setCourseSlug(event.currentTarget.value)}
										value={courseSlug()}
									/>
								</FieldContent>
							</Field>
							<Field class="grid gap-2">
								<FieldLabel for="course-video-lab-course-title">Course title</FieldLabel>
								<FieldContent>
									<Input
										id="course-video-lab-course-title"
										onInput={(event) => setCourseTitle(event.currentTarget.value)}
										value={courseTitle()}
									/>
								</FieldContent>
							</Field>
							<Button
								disabled={createCourseMutation.isPending}
								onClick={createCourse}
								type="button"
							>
								Create course
							</Button>

							<div class="grid gap-3 border-border border-t pt-4">
								<Field class="grid gap-2">
									<FieldLabel for="course-video-lab-chapter-slug">Chapter slug</FieldLabel>
									<FieldContent>
										<Input
											id="course-video-lab-chapter-slug"
											onInput={(event) => setChapterSlug(event.currentTarget.value)}
											value={chapterSlug()}
										/>
									</FieldContent>
								</Field>
								<Field class="grid gap-2">
									<FieldLabel for="course-video-lab-chapter-title">Chapter title</FieldLabel>
									<FieldContent>
										<Input
											id="course-video-lab-chapter-title"
											onInput={(event) => setChapterTitle(event.currentTarget.value)}
											value={chapterTitle()}
										/>
									</FieldContent>
								</Field>
								<Button
									disabled={createChapterMutation.isPending}
									onClick={createChapter}
									type="button"
									variant="secondary"
								>
									Create chapter
								</Button>
							</div>

							<div class="grid gap-3 border-border border-t pt-4">
								<Field class="grid gap-2">
									<FieldLabel for="course-video-lab-lesson-slug">Lesson slug</FieldLabel>
									<FieldContent>
										<Input
											id="course-video-lab-lesson-slug"
											onInput={(event) => setLessonSlug(event.currentTarget.value)}
											value={lessonSlug()}
										/>
									</FieldContent>
								</Field>
								<Field class="grid gap-2">
									<FieldLabel for="course-video-lab-lesson-title">Lesson title</FieldLabel>
									<FieldContent>
										<Input
											id="course-video-lab-lesson-title"
											onInput={(event) => setLessonTitle(event.currentTarget.value)}
											value={lessonTitle()}
										/>
									</FieldContent>
								</Field>
								<Field class="grid gap-2">
									<FieldLabel for="course-video-lab-lesson-visibility">
										Lesson visibility
									</FieldLabel>
									<FieldContent>
										<NativeSelect
											id="course-video-lab-lesson-visibility"
											onChange={(event) =>
												setLessonVisibility(
													event.currentTarget.value as "enrolled" | "preview" | "private",
												)
											}
											value={lessonVisibility()}
										>
											<NativeSelectOption value="preview">preview</NativeSelectOption>
											<NativeSelectOption value="enrolled">enrolled</NativeSelectOption>
											<NativeSelectOption value="private">private</NativeSelectOption>
										</NativeSelect>
									</FieldContent>
								</Field>
								<Button
									disabled={createLessonMutation.isPending}
									onClick={createLesson}
									type="button"
									variant="secondary"
								>
									Create lesson
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
						<CardHeader>
							<CardTitle>Video asset</CardTitle>
							<CardDescription>
								Use a ready/stored video file ID from the Files page or upload API.
							</CardDescription>
						</CardHeader>
						<CardContent class="grid gap-4">
							<Field class="grid gap-2">
								<FieldLabel for="course-video-lab-file-id">Video file ID</FieldLabel>
								<FieldContent>
									<Input
										id="course-video-lab-file-id"
										onInput={(event) => setFileId(event.currentTarget.value)}
										value={fileId()}
									/>
								</FieldContent>
							</Field>
							<div class="flex flex-wrap gap-2">
								<Button
									disabled={attachVideoMutation.isPending || fileId().trim().length === 0}
									onClick={attachVideo}
									type="button"
								>
									Attach video
								</Button>
								<Button
									disabled={playbackMutation.isPending}
									onClick={requestPlaybackSession}
									type="button"
									variant="outline"
								>
									Request playback
								</Button>
							</div>
							<Show when={playbackToken()}>
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
									Files
								</Button>
								<Button
									as="a"
									href={createLocalizedPath(
										locale(),
										`/courses/${courseSlug()}/${chapterSlug()}/${lessonSlug()}`,
									)}
									type="button"
									variant="outline"
								>
									Lesson
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>

				<Card class="border-border/70 bg-card/95 shadow-black/5 shadow-sm">
					<CardHeader>
						<CardTitle>Run log</CardTitle>
						<CardDescription>Course workflow results from this browser session.</CardDescription>
					</CardHeader>
					<CardContent>
						<ul class="grid gap-2">
							<Show
								fallback={
									<P class="text-muted-foreground text-sm">No course workflow events yet.</P>
								}
								when={logs().length > 0}
							>
								<For each={logs()}>
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

	async function createCourse() {
		try {
			await createCourseMutation.mutateAsync({
				slug: courseSlug(),
				status: "published",
				title: courseTitle(),
			});
		} catch {
			// handled by mutation options
		}
	}

	async function createChapter() {
		try {
			await createChapterMutation.mutateAsync({
				courseSlug: courseSlug(),
				position: 1,
				slug: chapterSlug(),
				title: chapterTitle(),
			});
		} catch {
			// handled by mutation options
		}
	}

	async function createLesson() {
		try {
			await createLessonMutation.mutateAsync({
				chapterSlug: chapterSlug(),
				courseSlug: courseSlug(),
				position: 1,
				slug: lessonSlug(),
				title: lessonTitle(),
				visibility: lessonVisibility(),
			});
		} catch {
			// handled by mutation options
		}
	}

	async function attachVideo() {
		try {
			await attachVideoMutation.mutateAsync({
				chapterSlug: chapterSlug(),
				courseSlug: courseSlug(),
				fileId: fileId().trim(),
				lessonSlug: lessonSlug(),
			});
		} catch {
			// handled by mutation options
		}
	}

	async function requestPlaybackSession() {
		try {
			await playbackMutation.mutateAsync({
				chapterSlug: chapterSlug(),
				courseSlug: courseSlug(),
				lessonSlug: lessonSlug(),
			});
		} catch {
			// handled by mutation options
		}
	}

	function appendLog(message: string, status: CourseVideoLabLog["status"]) {
		setLogs((current) => [
			{
				id: crypto.randomUUID(),
				message,
				status,
			},
			...current,
		]);
	}
}

function readErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback;
}
