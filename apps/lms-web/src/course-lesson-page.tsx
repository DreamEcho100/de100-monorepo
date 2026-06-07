import type { HlsVideoPlayerQoeEvent } from "@de100/files-domains-solidjs/client";
import { createHlsVideoPlayerQoeEvent, HlsVideoPlayer } from "@de100/files-domains-solidjs/client";
import {
	Alert,
	AlertDescription,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	NativeSelect,
	NativeSelectOption,
	P,
} from "@de100/ui-domains-solidjs";
import { Title } from "@solidjs/meta";
import { useParams } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { createSignal, For, Match, Show, Switch } from "solid-js";

import { orpc } from "~/libs/apis/orpc";

type CoursePlayerMode = "external" | "helper" | "package";

type CoursePlaybackSource = {
	captionTracks: Array<{
		default: boolean;
		kind: "captions" | "chapters" | "descriptions" | "metadata" | "subtitles";
		label: string;
		language: string;
		src: string;
	}>;
	masterUrl: string;
	token: string;
};

const emptyCaptionsTrack = "data:text/vtt,WEBVTT%0A";

export default function CourseLessonPage() {
	const params = useParams<{
		chapterSlug: string;
		courseSlug: string;
		lessonSlug: string;
	}>();
	const [playbackToken, setPlaybackToken] = createSignal<string | null>(null);
	const [playbackSource, setPlaybackSource] = createSignal<CoursePlaybackSource | null>(null);
	const [message, setMessage] = createSignal<string | null>(null);
	const [playerMode, setPlayerMode] = createSignal<CoursePlayerMode>("package");
	const playbackMutation = createMutation(() =>
		orpc.courses.createPlaybackSession.mutationOptions({
			onError: (error) => {
				setPlaybackToken(null);
				setPlaybackSource(null);
				setMessage(error instanceof Error ? error.message : "Playback session failed.");
			},
			onSuccess: (result) => {
				setPlaybackToken(result.session?.token ?? null);
				setPlaybackSource(result.playback);
				setMessage(`Playback decision: ${result.decision.reason}.`);
			},
		}),
	);
	const qoeMutation = createMutation(() =>
		orpc.courses.recordPlaybackEvent.mutationOptions({
			onError: (error) => {
				setMessage(error instanceof Error ? error.message : "Playback event failed.");
			},
		}),
	);

	return (
		<main
			class="mx-auto grid w-full max-w-5xl gap-6 px-[clamp(1rem,2vw+0.5rem,2rem)] pt-8 pb-16"
			id="main-content"
		>
			<Title>Course Lesson</Title>
			<Card class="border-primary/10 bg-card/95 shadow-black/5 shadow-sm">
				<CardHeader class="space-y-3">
					<div>
						<CardTitle>{params.lessonSlug}</CardTitle>
						<CardDescription>
							{params.courseSlug} / {params.chapterSlug}
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent class="grid gap-4">
					<Show
						fallback={
							<div class="aspect-video w-full rounded-lg border border-border/70 bg-muted" />
						}
						when={playbackSource()}
					>
						{(source) => (
							<div class="grid gap-3">
								<NativeSelect
									aria-label="Player prototype"
									onChange={(event) => setPlayerMode(event.currentTarget.value as CoursePlayerMode)}
									value={playerMode()}
								>
									<NativeSelectOption value="package">Package player</NativeSelectOption>
									<NativeSelectOption value="helper">Helper-only player</NativeSelectOption>
									<NativeSelectOption value="external">External adapter</NativeSelectOption>
								</NativeSelect>
								<Switch>
									<Match when={playerMode() === "package"}>
										<HlsVideoPlayer
											captionTracks={source().captionTracks}
											onQoeEvent={recordPlaybackEvent}
											src={source().masterUrl}
										/>
									</Match>
									<Match when={playerMode() === "helper"}>
										<HelperOnlyCoursePlayer onQoeEvent={recordPlaybackEvent} source={source()} />
									</Match>
									<Match when={playerMode() === "external"}>
										<ExternalCoursePlayerPrototype
											onQoeEvent={recordPlaybackEvent}
											source={source()}
										/>
									</Match>
								</Switch>
							</div>
						)}
					</Show>
					<div class="flex flex-wrap gap-2">
						<Button
							disabled={playbackMutation.isPending}
							onClick={requestPlaybackSession}
							type="button"
						>
							Request playback
						</Button>
					</div>
					<Show when={message()}>
						{(value) => (
							<Alert role="status">
								<AlertDescription>{value()}</AlertDescription>
							</Alert>
						)}
					</Show>
					<Show when={playbackToken()}>
						{(token) => (
							<P class="break-all rounded-lg border border-border/70 p-3 text-muted-foreground text-xs">
								{token()}
							</P>
						)}
					</Show>
				</CardContent>
			</Card>
		</main>
	);

	async function requestPlaybackSession() {
		try {
			await playbackMutation.mutateAsync({
				chapterSlug: params.chapterSlug,
				courseSlug: params.courseSlug,
				lessonSlug: params.lessonSlug,
			});
		} catch {
			// handled by mutation options
		}
	}

	function recordPlaybackEvent(event: HlsVideoPlayerQoeEvent) {
		const source = playbackSource();
		if (!source) {
			return;
		}

		void qoeMutation
			.mutateAsync({
				bufferedSeconds: event.bufferedSeconds,
				durationSeconds: event.durationSeconds,
				eventKind: event.eventKind,
				metadata: {
					...(event.metadata ?? {}),
					playerMode: playerMode(),
				},
				positionSeconds: event.positionSeconds,
				renditionLabel: event.renditionLabel,
				token: source.token,
			})
			.catch(() => {
				// handled by mutation options
			});
	}
}

function HelperOnlyCoursePlayer(props: {
	onQoeEvent: (event: HlsVideoPlayerQoeEvent) => void;
	source: CoursePlaybackSource;
}) {
	return (
		<video
			class="aspect-video w-full rounded-lg bg-black"
			controls
			onEnded={(event) => props.onQoeEvent(createNativeVideoEvent(event.currentTarget, "complete"))}
			onError={(event) => props.onQoeEvent(createNativeVideoEvent(event.currentTarget, "error"))}
			onPause={(event) => props.onQoeEvent(createNativeVideoEvent(event.currentTarget, "pause"))}
			onPlay={(event) => props.onQoeEvent(createNativeVideoEvent(event.currentTarget, "play"))}
			onStalled={(event) =>
				props.onQoeEvent(createNativeVideoEvent(event.currentTarget, "stalled"))
			}
			onWaiting={(event) =>
				props.onQoeEvent(createNativeVideoEvent(event.currentTarget, "buffering"))
			}
			src={props.source.masterUrl}
		>
			<track default kind="captions" label="Captions" src={emptyCaptionsTrack} />
			<For each={props.source.captionTracks}>
				{(track) => (
					<track
						default={track.default}
						kind={track.kind}
						label={track.label}
						src={track.src}
						srclang={track.language}
					/>
				)}
			</For>
		</video>
	);
}

function ExternalCoursePlayerPrototype(props: {
	onQoeEvent: (event: HlsVideoPlayerQoeEvent) => void;
	source: CoursePlaybackSource;
}) {
	return (
		<HlsVideoPlayer
			captionTracks={props.source.captionTracks}
			onQoeEvent={(event) =>
				props.onQoeEvent({
					...event,
					metadata: {
						...(event.metadata ?? {}),
						adapter: "external-player-prototype",
					},
				})
			}
			src={props.source.masterUrl}
		/>
	);
}

function createNativeVideoEvent(
	video: HTMLVideoElement,
	eventKind: HlsVideoPlayerQoeEvent["eventKind"],
) {
	return createHlsVideoPlayerQoeEvent({
		eventKind,
		video,
	});
}
