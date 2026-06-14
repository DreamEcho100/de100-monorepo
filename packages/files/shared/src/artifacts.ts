import { z } from "zod/v4";

import { fileStatusValues, fileVisibilityValues } from "./constants";

export const filesArtifactGroupKindValues = [
	"hls",
	"hls-encrypted",
	"drm",
	"image-responsive",
	"audio-preview",
	"document-preview",
	"custom",
] as const;
export type FilesArtifactGroupKind = (typeof filesArtifactGroupKindValues)[number];

export const filesArtifactKindValues = [
	"hls-master-manifest",
	"hls-rendition-manifest",
	"hls-segment",
	"hls-key",
	"poster",
	"caption",
	"metadata",
	"thumbnail",
	"responsive-image",
	"waveform",
	"audio-preview",
	"document-preview",
	"drm-manifest",
	"drm-license-hint",
	"custom",
] as const;
export type FilesArtifactKind = (typeof filesArtifactKindValues)[number];

export const filesHlsSegmentFormatValues = ["mpeg-ts", "fmp4-cmaf"] as const;
export type FilesHlsSegmentFormat = (typeof filesHlsSegmentFormatValues)[number];

export const filesHlsProtectionModeValues = [
	"signed-session",
	"app-proxy",
	"public-gated",
	"per-object-signed-url",
	"signed-cookie",
	"aes-128",
	"drm",
] as const;
export type FilesHlsProtectionMode = (typeof filesHlsProtectionModeValues)[number];

export const filesPlaybackSessionStatusValues = ["active", "expired", "revoked"] as const;
export type FilesPlaybackSessionStatus = (typeof filesPlaybackSessionStatusValues)[number];

export const filesArtifactGroupRecordSchema = z.object({
	bucketName: z.string().nullable(),
	createdAt: z.date(),
	deletedAt: z.date().nullable(),
	fileId: z.string().min(1),
	id: z.string().min(1),
	kind: z.enum(filesArtifactGroupKindValues),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	revision: z.number().int().positive(),
	status: z.enum(fileStatusValues),
	storagePrefix: z.string().min(1),
	updatedAt: z.date(),
	visibility: z.enum(fileVisibilityValues),
});

export const filesArtifactRecordSchema = z.object({
	bucketName: z.string().nullable(),
	contentType: z.string().min(1),
	createdAt: z.date(),
	deletedAt: z.date().nullable(),
	durationMs: z.number().int().nonnegative().nullable(),
	fileId: z.string().min(1),
	groupId: z.string().min(1),
	height: z.number().int().positive().nullable(),
	id: z.string().min(1),
	key: z.string().min(1),
	kind: z.enum(filesArtifactKindValues),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	renditionLabel: z.string().min(1).nullable(),
	size: z.number().int().nonnegative(),
	sortOrder: z.number().int().nonnegative(),
	status: z.enum(fileStatusValues),
	updatedAt: z.date(),
	width: z.number().int().positive().nullable(),
});

export const filesHlsRenditionSchema = z.object({
	audioBitrate: z.number().int().positive().optional(),
	bandwidth: z.number().int().positive(),
	codecs: z.array(z.string().min(1)).optional(),
	height: z.number().int().positive(),
	label: z.string().min(1),
	videoBitrate: z.number().int().positive(),
	width: z.number().int().positive(),
});

export const filesHlsPresetSchema = z.object({
	segmentDurationSeconds: z.number().positive().default(4),
	segmentFormat: z.enum(filesHlsSegmentFormatValues).default("mpeg-ts"),
	renditions: z.array(filesHlsRenditionSchema).min(1),
	skipRenditionsAboveSource: z.boolean().default(true),
});

export const filesBalancedHlsPreset = filesHlsPresetSchema.parse({
	renditions: [
		{ bandwidth: 800_000, height: 480, label: "480p", videoBitrate: 700_000, width: 854 },
		{ bandwidth: 2_800_000, height: 720, label: "720p", videoBitrate: 2_500_000, width: 1280 },
		{
			bandwidth: 5_800_000,
			height: 1080,
			label: "1080p",
			videoBitrate: 5_200_000,
			width: 1920,
		},
	],
});

export const filesCreateArtifactGroupInputSchema = z.object({
	bucketName: z.string().nullable().optional(),
	fileId: z.string().min(1),
	id: z.string().min(1).optional(),
	kind: z.enum(filesArtifactGroupKindValues),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	revision: z.number().int().positive().default(1),
	status: z.enum(fileStatusValues).default("draft"),
	storagePrefix: z.string().min(1),
	visibility: z.enum(fileVisibilityValues),
});

export const filesCreateArtifactInputSchema = z.object({
	bucketName: z.string().nullable().optional(),
	contentType: z.string().min(1),
	durationMs: z.number().int().nonnegative().nullable().optional(),
	fileId: z.string().min(1),
	groupId: z.string().min(1),
	height: z.number().int().positive().nullable().optional(),
	id: z.string().min(1).optional(),
	key: z.string().min(1),
	kind: z.enum(filesArtifactKindValues),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	renditionLabel: z.string().min(1).nullable().optional(),
	size: z.number().int().nonnegative(),
	sortOrder: z.number().int().nonnegative().default(0),
	status: z.enum(fileStatusValues).default("ready"),
	width: z.number().int().positive().nullable().optional(),
});

export const filesSignedHlsPlaybackSessionSchema = z.object({
	artifactGroupId: z.string().min(1),
	expiresAt: z.date(),
	fileId: z.string().min(1),
	id: z.string().min(1),
	issuedAt: z.date(),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	protectionMode: z.enum(filesHlsProtectionModeValues),
	status: z.enum(filesPlaybackSessionStatusValues),
	subjectId: z.string().min(1).nullable(),
	token: z.string().min(16),
});

export type FilesArtifactGroupRecord = z.infer<typeof filesArtifactGroupRecordSchema>;
export type FilesArtifactRecord = z.infer<typeof filesArtifactRecordSchema>;
export type FilesHlsRendition = z.infer<typeof filesHlsRenditionSchema>;
export type FilesHlsPreset = z.infer<typeof filesHlsPresetSchema>;
export type FilesCreateArtifactGroupInput = z.infer<typeof filesCreateArtifactGroupInputSchema>;
export type FilesCreateArtifactInput = z.infer<typeof filesCreateArtifactInputSchema>;
export type FilesSignedHlsPlaybackSession = z.infer<typeof filesSignedHlsPlaybackSessionSchema>;
