import type { UploaderProviderAdapter } from "./adapters";
import {
	uploaderA11yDefaults,
	uploaderCaptureDefaults,
	uploaderDefaultRestrictions,
	uploaderI18nDefaults,
	uploaderPersistenceDefaults,
	uploaderSupportedFileKinds,
	uploaderTransportDefaults,
} from "./defaults";
import type { UploaderAutoTransportConfig, UploadTransportMode } from "./transport-policy";

export type UploaderFileKind = (typeof uploaderSupportedFileKinds)[number];

export type UploaderRestrictions = {
	allowedFileKinds: UploaderFileKind[];
	allowedMimeTypes: string[];
	maxFileBytes: number;
	maxFiles: number;
};

export type UploaderTransportConfig = {
	auto: UploaderAutoTransportConfig;
	mode: UploadTransportMode;
};

export type UploaderPersistenceDriver = "indexeddb" | "memory";

export type UploaderPersistenceConfig = {
	driver: UploaderPersistenceDriver;
	enabled: boolean;
	maxAgeMs: number;
	queueKey: string;
};

export type UploaderCaptureConfig = {
	allowCamera: boolean;
	allowClipboard: boolean;
	allowedClipboardMimeTypes: string[];
};

export type UploaderI18nConfig = {
	browseCta: string;
	dropzoneHint: string;
	invalidTypeError: string;
	overFileLimitError: string;
	uploadErrorPrefix: string;
	uploadSuccess: string;
};

export type UploaderA11yLiveRegionMode = "polite" | "assertive";

export type UploaderA11yConfig = {
	dropzoneLabel: string;
	itemProgressTemplate: string;
	liveRegionMode: UploaderA11yLiveRegionMode;
	regionLabel: string;
};

export type UploaderCandidateFile = {
	kind: UploaderFileKind;
	lastModified?: number;
	name: string;
	size: number;
	type: string;
};

export type UploaderEnhancementHooks = {
	beforeQueue?: (file: UploaderCandidateFile) => Promise<boolean> | boolean;
	compressImage?: (
		file: UploaderCandidateFile,
	) => Promise<UploaderCandidateFile | null> | UploaderCandidateFile | null;
	createChecksum?: (file: UploaderCandidateFile) => Promise<string | null> | string | null;
	createVideoThumbnail?: (file: UploaderCandidateFile) => Promise<string | null> | string | null;
	extractImageDimensions?: (
		file: UploaderCandidateFile,
	) => Promise<{ height: number; width: number } | null> | { height: number; width: number } | null;
	runVirusScan?: (
		file: UploaderCandidateFile,
	) => Promise<{ reason?: string; safe: boolean }> | { reason?: string; safe: boolean };
};

export type UploaderConfigInput = {
	a11y?: Partial<UploaderA11yConfig>;
	capture?: Partial<UploaderCaptureConfig>;
	enhancements?: UploaderEnhancementHooks;
	i18n?: Partial<UploaderI18nConfig>;
	persistence?: Partial<UploaderPersistenceConfig>;
	providerAdapter?: UploaderProviderAdapter;
	restrictions?: Partial<UploaderRestrictions>;
	transport?: {
		auto?: Partial<UploaderAutoTransportConfig>;
		mode?: UploadTransportMode;
	};
};

export type ResolvedUploaderConfig = {
	a11y: UploaderA11yConfig;
	capture: UploaderCaptureConfig;
	enhancements: UploaderEnhancementHooks;
	i18n: UploaderI18nConfig;
	persistence: UploaderPersistenceConfig;
	providerAdapter?: UploaderProviderAdapter;
	restrictions: UploaderRestrictions;
	transport: UploaderTransportConfig;
};

export function isSupportedUploaderFileKind(value: string): value is UploaderFileKind {
	return uploaderSupportedFileKinds.includes(value as UploaderFileKind);
}

function assertPositiveInteger(value: number, field: string) {
	if (!Number.isInteger(value) || value <= 0) {
		throw new Error(`${field} must be a positive integer.`);
	}
}

function assertNonEmpty(value: string, field: string) {
	if (value.trim().length === 0) {
		throw new Error(`${field} cannot be empty.`);
	}
}

export function resolveUploaderConfig(input: UploaderConfigInput = {}): ResolvedUploaderConfig {
	const restrictions: UploaderRestrictions = {
		allowedFileKinds: [
			...(input.restrictions?.allowedFileKinds ?? uploaderDefaultRestrictions.allowedFileKinds),
		],
		allowedMimeTypes: [
			...(input.restrictions?.allowedMimeTypes ?? uploaderDefaultRestrictions.allowedMimeTypes),
		],
		maxFileBytes: input.restrictions?.maxFileBytes ?? uploaderDefaultRestrictions.maxFileBytes,
		maxFiles: input.restrictions?.maxFiles ?? uploaderDefaultRestrictions.maxFiles,
	};

	const transport: UploaderTransportConfig = {
		auto: {
			minNetworkQuality:
				input.transport?.auto?.minNetworkQuality ??
				uploaderTransportDefaults.auto.minNetworkQuality,
			preferTusWhenOnCellular:
				input.transport?.auto?.preferTusWhenOnCellular ??
				uploaderTransportDefaults.auto.preferTusWhenOnCellular,
			tusMinBytes: input.transport?.auto?.tusMinBytes ?? uploaderTransportDefaults.auto.tusMinBytes,
		},
		mode: input.transport?.mode ?? uploaderTransportDefaults.mode,
	};

	const persistence: UploaderPersistenceConfig = {
		driver: input.persistence?.driver ?? uploaderPersistenceDefaults.driver,
		enabled: input.persistence?.enabled ?? uploaderPersistenceDefaults.enabled,
		maxAgeMs: input.persistence?.maxAgeMs ?? uploaderPersistenceDefaults.maxAgeMs,
		queueKey: input.persistence?.queueKey ?? uploaderPersistenceDefaults.queueKey,
	};

	const capture: UploaderCaptureConfig = {
		allowCamera: input.capture?.allowCamera ?? uploaderCaptureDefaults.allowCamera,
		allowClipboard: input.capture?.allowClipboard ?? uploaderCaptureDefaults.allowClipboard,
		allowedClipboardMimeTypes: [
			...(input.capture?.allowedClipboardMimeTypes ??
				uploaderCaptureDefaults.allowedClipboardMimeTypes),
		],
	};

	const i18n: UploaderI18nConfig = {
		browseCta: input.i18n?.browseCta ?? uploaderI18nDefaults.browseCta,
		dropzoneHint: input.i18n?.dropzoneHint ?? uploaderI18nDefaults.dropzoneHint,
		invalidTypeError: input.i18n?.invalidTypeError ?? uploaderI18nDefaults.invalidTypeError,
		overFileLimitError: input.i18n?.overFileLimitError ?? uploaderI18nDefaults.overFileLimitError,
		uploadErrorPrefix: input.i18n?.uploadErrorPrefix ?? uploaderI18nDefaults.uploadErrorPrefix,
		uploadSuccess: input.i18n?.uploadSuccess ?? uploaderI18nDefaults.uploadSuccess,
	};

	const a11y: UploaderA11yConfig = {
		dropzoneLabel: input.a11y?.dropzoneLabel ?? uploaderA11yDefaults.dropzoneLabel,
		itemProgressTemplate:
			input.a11y?.itemProgressTemplate ?? uploaderA11yDefaults.itemProgressTemplate,
		liveRegionMode: input.a11y?.liveRegionMode ?? uploaderA11yDefaults.liveRegionMode,
		regionLabel: input.a11y?.regionLabel ?? uploaderA11yDefaults.regionLabel,
	};

	assertPositiveInteger(restrictions.maxFileBytes, "restrictions.maxFileBytes");
	assertPositiveInteger(restrictions.maxFiles, "restrictions.maxFiles");
	assertPositiveInteger(transport.auto.tusMinBytes, "transport.auto.tusMinBytes");
	assertPositiveInteger(persistence.maxAgeMs, "persistence.maxAgeMs");

	assertNonEmpty(persistence.queueKey, "persistence.queueKey");
	assertNonEmpty(i18n.dropzoneHint, "i18n.dropzoneHint");
	assertNonEmpty(i18n.uploadSuccess, "i18n.uploadSuccess");
	assertNonEmpty(a11y.regionLabel, "a11y.regionLabel");

	if (restrictions.allowedFileKinds.length === 0) {
		throw new Error("restrictions.allowedFileKinds cannot be empty.");
	}

	for (const kind of restrictions.allowedFileKinds) {
		if (!isSupportedUploaderFileKind(kind)) {
			throw new Error(`Unsupported file kind: ${kind}`);
		}
	}

	if (restrictions.allowedMimeTypes.length === 0) {
		throw new Error("restrictions.allowedMimeTypes cannot be empty.");
	}

	if (capture.allowedClipboardMimeTypes.length === 0) {
		throw new Error("capture.allowedClipboardMimeTypes cannot be empty.");
	}

	return {
		a11y,
		capture,
		enhancements: input.enhancements ?? {},
		i18n,
		persistence,
		providerAdapter: input.providerAdapter,
		restrictions,
		transport,
	};
}
