import { z } from "zod/v4";

export const filesPlaybackEventKindValues = [
	"play",
	"pause",
	"progress",
	"seek",
	"rendition-change",
	"buffering",
	"stalled",
	"error",
	"complete",
] as const;
export type FilesPlaybackEventKind = (typeof filesPlaybackEventKindValues)[number];

export const filesPlaybackEventSchema = z.object({
	artifactGroupId: z.string().min(1).nullable(),
	bufferedSeconds: z.number().nonnegative().nullable(),
	durationSeconds: z.number().nonnegative().nullable(),
	eventKind: z.enum(filesPlaybackEventKindValues),
	fileId: z.string().min(1),
	id: z.string().min(1),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	occurredAt: z.date(),
	playbackSessionId: z.string().min(1).nullable(),
	positionSeconds: z.number().nonnegative().nullable(),
	renditionLabel: z.string().min(1).nullable(),
	subjectId: z.string().min(1).nullable(),
});

export type FilesPlaybackEvent = z.infer<typeof filesPlaybackEventSchema>;
