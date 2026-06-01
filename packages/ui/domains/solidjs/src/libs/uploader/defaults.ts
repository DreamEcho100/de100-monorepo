export const uploaderSupportedFileKinds = ["image", "document", "video", "audio", "file"] as const;

export const uploaderTransportModes = ["xhr", "tus", "auto"] as const;

export const uploaderNetworkQualities = [
	"offline",
	"slow-2g",
	"2g",
	"3g",
	"4g",
	"unknown",
] as const;

export const uploaderDefaultRestrictions = {
	allowedFileKinds: [...uploaderSupportedFileKinds],
	allowedMimeTypes: ["*/*"],
	maxFileBytes: 50 * 1024 * 1024,
	maxFiles: 10,
} as const;

export const uploaderTransportDefaults = {
	auto: {
		minNetworkQuality: "3g",
		preferTusWhenOnCellular: false,
		tusMinBytes: 10 * 1024 * 1024,
	},
	mode: "auto",
} as const;

export const uploaderPersistenceDefaults = {
	driver: "indexeddb",
	enabled: true,
	maxAgeMs: 1000 * 60 * 60 * 24,
	queueKey: "de100.uploader.queue",
} as const;

export const uploaderCaptureDefaults = {
	allowCamera: true,
	allowClipboard: true,
	allowedClipboardMimeTypes: ["image/*"],
} as const;

export const uploaderI18nDefaults = {
	browseCta: "Browse files",
	dropzoneHint: "Drop files here or browse to upload.",
	invalidTypeError: "This file type is not allowed.",
	overFileLimitError: "This file is larger than the allowed limit.",
	uploadErrorPrefix: "Upload failed:",
	uploadSuccess: "Upload complete.",
} as const;

export const uploaderA11yDefaults = {
	dropzoneLabel: "File upload dropzone",
	itemProgressTemplate: "{fileName} upload {progress}% complete",
	liveRegionMode: "polite",
	regionLabel: "File uploader",
} as const;
