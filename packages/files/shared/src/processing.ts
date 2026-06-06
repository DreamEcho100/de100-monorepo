import { z } from "zod/v4";

import { fileKindValues, fileStatusValues } from "./constants";

export const filesPipelineStageNameValues = [
	"validate",
	"detect",
	"scan",
	"store",
	"metadata",
	"thumbnail",
	"variant",
	"artifact",
	"caption",
	"optimize",
	"transcode",
	"complete",
	"error",
	"delete-cleanup",
] as const;
export type FilesPipelineStageName = (typeof filesPipelineStageNameValues)[number];

export const filesProcessingStageStatusValues = ["succeeded", "skipped", "failed"] as const;
export type FilesProcessingStageStatus = (typeof filesProcessingStageStatusValues)[number];

export const filesPipelineRunStatusValues = ["succeeded", "failed"] as const;
export type FilesPipelineRunStatus = (typeof filesPipelineRunStatusValues)[number];

export const filesVariantKindValues = [
	"thumbnail",
	"preview",
	"poster",
	"optimized",
	"waveform",
	"transcode",
	"hls",
	"hls-encryption",
	"drm-packaging",
	"caption",
] as const;
export type FilesVariantKind = (typeof filesVariantKindValues)[number];

export const filesProcessingDependencyValues = [
	"file-type",
	"sharp",
	"exifr",
	"music-metadata",
	"ffmpeg",
	"ffprobe",
] as const;
export type FilesProcessingDependency = (typeof filesProcessingDependencyValues)[number];

export const filesProcessingCapabilityValues = [
	"magic-number-detection",
	"image-metadata",
	"image-variant",
	"video-metadata",
	"video-poster",
	"audio-metadata",
	"audio-waveform",
	"optimization",
	"transcode",
	"hls-packaging",
	"hls-encryption",
	"drm-packaging",
	"caption-attachment",
	"caption-generation",
	"document-preview",
	"scan",
] as const;
export type FilesProcessingCapability = (typeof filesProcessingCapabilityValues)[number];

export const filesVariantFitValues = ["cover", "contain", "inside", "outside", "fill"] as const;
export type FilesVariantFit = (typeof filesVariantFitValues)[number];

export const filesProcessingVariantDefinitionSchema = z.object({
	contentType: z.string().min(1).optional(),
	fit: z.enum(filesVariantFitValues).optional(),
	height: z.number().int().positive().optional(),
	kind: z.string().min(1),
	metadata: z.record(z.string(), z.unknown()).optional(),
	requiredForKinds: z.array(z.enum(fileKindValues)).optional(),
	width: z.number().int().positive().optional(),
});

export const filesGeneratedVariantSchema = z.object({
	bucketName: z.string().nullable().optional(),
	contentType: z.string().min(1),
	height: z.number().int().positive().nullable().optional(),
	id: z.string().min(1).optional(),
	key: z.string().min(1),
	kind: z.string().min(1),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	size: z.number().int().nonnegative(),
	status: z.enum(fileStatusValues).default("ready"),
	width: z.number().int().positive().nullable().optional(),
});

export const filesDetectedMetadataSchema = z.object({
	bitrate: z.number().nonnegative().optional(),
	codecs: z.array(z.string().min(1)).optional(),
	contentType: z.string().min(1).nullable().optional(),
	detectedExtension: z.string().min(1).nullable().optional(),
	detectedMimeType: z.string().min(1).nullable().optional(),
	durationMs: z.number().nonnegative().optional(),
	height: z.number().int().positive().optional(),
	pages: z.number().int().positive().optional(),
	raw: z.record(z.string(), z.unknown()).nullable().optional(),
	width: z.number().int().positive().optional(),
});

export const filesProcessingStageResultSchema = z.object({
	durationMs: z.number().nonnegative(),
	error: z.record(z.string(), z.unknown()).optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
	name: z.enum(filesPipelineStageNameValues),
	reason: z.string().min(1).optional(),
	status: z.enum(filesProcessingStageStatusValues),
	variants: z.array(filesGeneratedVariantSchema).optional(),
});

export const filesPipelineRunResultSchema = z.object({
	attempts: z.number().int().positive(),
	error: z.record(z.string(), z.unknown()).optional(),
	metadata: z.record(z.string(), z.unknown()),
	stageResults: z.array(filesProcessingStageResultSchema),
	status: z.enum(filesPipelineRunStatusValues),
	variants: z.array(filesGeneratedVariantSchema),
});

export type FilesProcessingVariantDefinition = z.infer<
	typeof filesProcessingVariantDefinitionSchema
>;
export type FilesGeneratedVariant = z.infer<typeof filesGeneratedVariantSchema>;
export type FilesDetectedMetadata = z.infer<typeof filesDetectedMetadataSchema>;
export type FilesProcessingStageResult = z.infer<typeof filesProcessingStageResultSchema>;
export type FilesPipelineRunResult = z.infer<typeof filesPipelineRunResultSchema>;
