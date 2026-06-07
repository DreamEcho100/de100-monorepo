import type { FilesPlaybackEventKind } from "@de100/files-shared";
import { createEffect, For, on, onCleanup, onMount, Show } from "solid-js";

type HlsConstructor = typeof import("hls.js").default;
type HlsInstance = InstanceType<HlsConstructor>;

export type HlsVideoCaptionTrack = {
	default?: boolean;
	kind?: "captions" | "chapters" | "descriptions" | "metadata" | "subtitles";
	label: string;
	language: string;
	src: string;
};

export type HlsVideoPlayerQoeEvent = {
	bufferedSeconds: number | null;
	durationSeconds: number | null;
	eventKind: FilesPlaybackEventKind;
	metadata: Record<string, unknown> | null;
	positionSeconds: number | null;
	renditionLabel: string | null;
};

export type HlsVideoPlayerProps = {
	autoplay?: boolean;
	captionTracks?: readonly HlsVideoCaptionTrack[];
	class?: string;
	controls?: boolean;
	loadHls?: () => Promise<HlsConstructor>;
	muted?: boolean;
	onQoeEvent?: (event: HlsVideoPlayerQoeEvent) => void;
	playsInline?: boolean;
	poster?: string | null;
	src: string | null | undefined;
};

export function HlsVideoPlayer(props: HlsVideoPlayerProps) {
	let videoRef: HTMLVideoElement | undefined;
	let hls: HlsInstance | null = null;
	let mounted = false;
	let lastProgressEventAt = 0;

	onMount(() => {
		mounted = true;
		void attachSource(props.src);
	});

	createEffect(
		on(
			() => props.src,
			(src) => {
				if (mounted) {
					void attachSource(src);
				}
			},
		),
	);

	onCleanup(() => {
		destroyHls();
	});

	return (
		<div class={props.class}>
			<Show when={props.src} fallback={<div class="aspect-video w-full rounded-lg bg-muted" />}>
				<video
					autoplay={props.autoplay}
					class="aspect-video w-full rounded-lg bg-black"
					controls={props.controls ?? true}
					muted={props.muted}
					onEnded={() => emitQoeEvent("complete")}
					onError={() => emitQoeEvent("error")}
					onPause={() => emitQoeEvent("pause")}
					onPlay={() => emitQoeEvent("play")}
					onStalled={() => emitQoeEvent("stalled")}
					onTimeUpdate={() => emitProgressEvent()}
					onWaiting={() => emitQoeEvent("buffering")}
					playsinline={props.playsInline ?? true}
					poster={props.poster ?? undefined}
					ref={videoRef}
				>
					<For each={props.captionTracks ?? []}>
						{(track) => (
							<track
								default={track.default}
								kind={track.kind ?? "captions"}
								label={track.label}
								src={track.src}
								srclang={track.language}
							/>
						)}
					</For>
				</video>
			</Show>
		</div>
	);

	async function attachSource(src: string | null | undefined) {
		destroyHls();
		if (!videoRef || !src) {
			return;
		}

		if (canUseNativeHls(videoRef)) {
			videoRef.src = src;
			return;
		}

		const Hls = await (props.loadHls ?? loadHlsJs)();
		if (!Hls.isSupported()) {
			emitQoeEvent("error", { reason: "hls-not-supported" });
			return;
		}

		hls = new Hls();
		hls.on(Hls.Events.ERROR, (_event, data) => {
			emitQoeEvent("error", {
				details: readUnknownRecordValue(data, "details"),
				fatal: readUnknownRecordValue(data, "fatal"),
				type: readUnknownRecordValue(data, "type"),
			});
		});
		hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
			emitQoeEvent("rendition-change", {
				level: readUnknownRecordValue(data, "level"),
			});
		});
		hls.loadSource(src);
		hls.attachMedia(videoRef);
	}

	function emitProgressEvent() {
		const now = Date.now();
		if (now - lastProgressEventAt < 15_000) {
			return;
		}

		lastProgressEventAt = now;
		emitQoeEvent("progress");
	}

	function emitQoeEvent(
		eventKind: FilesPlaybackEventKind,
		metadata: Record<string, unknown> | null = null,
	) {
		if (!videoRef) {
			return;
		}

		props.onQoeEvent?.(
			createHlsVideoPlayerQoeEvent({
				eventKind,
				metadata,
				video: videoRef,
			}),
		);
	}

	function destroyHls() {
		hls?.destroy();
		hls = null;
		if (videoRef) {
			videoRef.removeAttribute("src");
			videoRef.load();
		}
	}
}

export function createHlsVideoPlayerQoeEvent(input: {
	eventKind: FilesPlaybackEventKind;
	metadata?: Record<string, unknown> | null;
	video: Pick<HTMLVideoElement, "buffered" | "currentTime" | "duration">;
}): HlsVideoPlayerQoeEvent {
	return {
		bufferedSeconds: readBufferedEnd(input.video.buffered),
		durationSeconds: Number.isFinite(input.video.duration) ? input.video.duration : null,
		eventKind: input.eventKind,
		metadata: input.metadata ?? null,
		positionSeconds: Number.isFinite(input.video.currentTime) ? input.video.currentTime : null,
		renditionLabel: null,
	};
}

function canUseNativeHls(video: HTMLVideoElement) {
	return Boolean(
		video.canPlayType("application/vnd.apple.mpegurl") ||
			video.canPlayType("application/x-mpegURL"),
	);
}

async function loadHlsJs() {
	const module = await import("hls.js");
	return module.default;
}

function readBufferedEnd(buffered: TimeRanges) {
	if (buffered.length === 0) {
		return null;
	}

	return buffered.end(buffered.length - 1);
}

function readUnknownRecordValue(input: unknown, key: string) {
	return typeof input === "object" && input !== null && key in input
		? (input as Record<string, unknown>)[key]
		: null;
}
