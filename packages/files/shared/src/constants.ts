export const fileKindValues = ["image", "video", "audio", "document", "file"] as const;
export type FileKind = (typeof fileKindValues)[number];

export const fileVisibilityValues = ["public", "private"] as const;
export type FileVisibility = (typeof fileVisibilityValues)[number];

export const fileStatusValues = [
	"draft",
	"uploading",
	"stored",
	"processing",
	"ready",
	"failed",
	"deleted",
] as const;
export type FileStatus = (typeof fileStatusValues)[number];

export const uploadSessionStatusValues = [
	"active",
	"paused",
	"completing",
	"completed",
	"aborted",
	"failed",
	"expired",
] as const;
export type UploadSessionStatus = (typeof uploadSessionStatusValues)[number];

export const processingJobStatusValues = [
	"queued",
	"running",
	"succeeded",
	"failed",
	"canceled",
] as const;
export type ProcessingJobStatus = (typeof processingJobStatusValues)[number];

export const filesApiApproachValues = ["hybrid", "http-native"] as const;
export type FilesApiApproach = (typeof filesApiApproachValues)[number];

export const filesUploadProtocolValues = [
	"orpc-direct",
	"xhr",
	"tus",
	"s3-put",
	"s3-multipart",
	"custom",
] as const;
export type FilesUploadProtocol = (typeof filesUploadProtocolValues)[number];

export const filesUploadTargetProtocolValues = [
	"xhr",
	"tus",
	"s3-put",
	"s3-multipart",
	"custom",
] as const;
export type FilesUploadTargetProtocol = (typeof filesUploadTargetProtocolValues)[number];

export const filesUploadProtocolPreferenceValues = [
	"auto",
	...filesUploadTargetProtocolValues,
] as const;
export type FilesUploadProtocolPreference = (typeof filesUploadProtocolPreferenceValues)[number];

export const filesDeliveryStrategyValues = [
	"orpc-blob",
	"public-url",
	"signed-url",
	"private-http-route",
	"provider-url",
	"range-http",
] as const;
export type FilesDeliveryStrategy = (typeof filesDeliveryStrategyValues)[number];

export const filesUploadIntegrationValues = ["companion", "transloadit"] as const;
export type FilesUploadIntegration = (typeof filesUploadIntegrationValues)[number];

export const filesProcessingModeValues = [
	"none",
	"local-pipeline",
	"transloadit-assembly",
	"custom",
] as const;
export type FilesProcessingMode = (typeof filesProcessingModeValues)[number];

export const filesStorageBackendValues = [
	"local-fs",
	"minio-s3",
	"r2-s3",
	"s3-compatible",
] as const;
export type FilesStorageBackend = (typeof filesStorageBackendValues)[number];

export const filesUppyPluginValues = [
	"audio",
	"aws-s3",
	"companion-client",
	"compressor",
	"core",
	"dashboard",
	"drag-drop",
	"drop-target",
	"file-input",
	"golden-retriever",
	"image-editor",
	"informer",
	"progress-bar",
	"remote-sources",
	"screen-capture",
	"status-bar",
	"thumbnail-generator",
	"transloadit",
	"tus",
	"webcam",
	"xhr-upload",
] as const;
export type FilesUppyPlugin = (typeof filesUppyPluginValues)[number];
