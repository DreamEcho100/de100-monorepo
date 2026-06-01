import { createMemo, createSignal, onCleanup, onMount } from "solid-js";

import type { UploaderRecordVisibility } from "./adapters";
import type { UploaderConfigInput, UploaderPersistenceConfig } from "./contracts";
import { resolveUploaderConfig } from "./contracts";
import type { UploaderItemState } from "./events";
import { applyUploaderEvent, createUploaderItemState } from "./events";
import type { UploaderQueueStore } from "./persistence/indexeddb-queue";
import { createUploaderQueueStore } from "./persistence/indexeddb-queue";
import type {
	CreateUploaderRuntimeOptions,
	UploaderRuntime,
	UploaderUploadResult,
} from "./uppy-factory";
import { createUploaderRuntime } from "./uppy-factory";

export type UploaderTrackedItem = UploaderItemState & {
	fileName: string;
	fileType: string;
	lastError: string | null;
	progress: number;
	visibility: UploaderRecordVisibility;
};

export type UploaderControllerSnapshot = {
	initialized: boolean;
	isUploading: boolean;
	items: UploaderTrackedItem[];
	lastAnnouncement: string | null;
	lastError: string | null;
};

export type UploaderController = {
	addFiles: (files: File[], visibility?: UploaderRecordVisibility) => Promise<void>;
	cancelFile: (fileId: string) => Promise<void>;
	clearCompleted: () => void;
	destroy: () => Promise<void>;
	getSnapshot: () => UploaderControllerSnapshot;
	initialize: () => Promise<void>;
	mountDashboard: (target: HTMLElement) => Promise<void>;
	mountDropzone: (target: HTMLElement) => Promise<void>;
	pauseFile: (fileId: string) => Promise<void>;
	resumeFile: (fileId: string) => Promise<void>;
	retryFile: (fileId: string) => Promise<UploaderUploadResult | undefined>;
	subscribe: (listener: (snapshot: UploaderControllerSnapshot) => void) => () => void;
	uploadAll: () => Promise<UploaderUploadResult[]>;
	uploadFile: (fileId: string) => Promise<UploaderUploadResult | undefined>;
};

export type UploaderControllerDependencies = {
	createQueueStore?: (config: UploaderPersistenceConfig) => UploaderQueueStore;
	createRuntime?: (options: CreateUploaderRuntimeOptions) => Promise<UploaderRuntime>;
	now?: () => Date;
};

type RuntimeFileMetadata = {
	fileName: string;
	fileType: string;
	visibility: UploaderRecordVisibility;
};

function announcementForEvent(
	eventType: "file-added" | "upload-canceled" | "upload-failed" | "upload-succeeded",
	fileName: string,
	i18n: {
		uploadErrorPrefix: string;
		uploadSuccess: string;
	},
	errorMessage?: string,
) {
	if (eventType === "file-added") {
		return `${fileName} queued.`;
	}

	if (eventType === "upload-succeeded") {
		return i18n.uploadSuccess;
	}

	if (eventType === "upload-canceled") {
		return `${fileName} canceled.`;
	}

	return `${i18n.uploadErrorPrefix} ${errorMessage ?? "Upload failed."}`;
}

function toSnapshot(
	initialized: boolean,
	isUploading: boolean,
	lastAnnouncement: string | null,
	lastError: string | null,
	orderedIds: string[],
	itemsById: Map<string, UploaderItemState>,
	metadataById: Map<string, RuntimeFileMetadata>,
): UploaderControllerSnapshot {
	const items: UploaderTrackedItem[] = [];

	for (const fileId of orderedIds) {
		const item = itemsById.get(fileId);
		if (!item) {
			continue;
		}

		const metadata = metadataById.get(fileId);
		const progress = item.totalBytes > 0 ? item.bytesUploaded / item.totalBytes : 0;
		items.push({
			...item,
			fileName: metadata?.fileName ?? fileId,
			fileType: metadata?.fileType ?? "",
			lastError: item.errorMessage,
			progress,
			visibility: metadata?.visibility ?? "private",
		});
	}

	return {
		initialized,
		isUploading,
		items,
		lastAnnouncement,
		lastError,
	};
}

export function createUploaderController(
	input: UploaderConfigInput,
	dependencies: UploaderControllerDependencies = {},
): UploaderController {
	const resolved = resolveUploaderConfig(input);

	const createRuntime = dependencies.createRuntime ?? createUploaderRuntime;
	const createQueueStore = dependencies.createQueueStore ?? createUploaderQueueStore;
	const now = dependencies.now ?? (() => new Date());

	let initialized = false;
	let isUploading = false;
	let lastAnnouncement: string | null = null;
	let lastError: string | null = null;
	let runtime: UploaderRuntime | undefined;
	let queueStore: UploaderQueueStore | undefined;

	const itemsById = new Map<string, UploaderItemState>();
	const metadataById = new Map<string, RuntimeFileMetadata>();
	const orderedIds: string[] = [];
	const listeners = new Set<(snapshot: UploaderControllerSnapshot) => void>();

	const snapshot = () =>
		toSnapshot(
			initialized,
			isUploading,
			lastAnnouncement,
			lastError,
			orderedIds,
			itemsById,
			metadataById,
		);

	const notify = () => {
		const value = snapshot();
		for (const listener of listeners) {
			listener(value);
		}
	};

	const ensureOrdered = (fileId: string) => {
		if (!orderedIds.includes(fileId)) {
			orderedIds.push(fileId);
		}
	};

	const handleEvent: CreateUploaderRuntimeOptions["onEvent"] = (event) => {
		const existing =
			itemsById.get(event.fileId) ??
			createUploaderItemState(event.fileId, event.type === "file-added" ? event.totalBytes : 0);

		const next = applyUploaderEvent(existing, event, now());
		itemsById.set(event.fileId, next);
		ensureOrdered(event.fileId);

		if (event.type === "file-added") {
			metadataById.set(event.fileId, {
				fileName: event.fileName ?? existing.fileId,
				fileType: event.mimeType ?? "",
				visibility: event.visibility ?? "private",
			});

			lastAnnouncement = announcementForEvent(
				"file-added",
				event.fileName ?? existing.fileId,
				resolved.i18n,
			);
		}

		if (event.type === "upload-succeeded") {
			const fileName = metadataById.get(event.fileId)?.fileName ?? event.fileId;
			lastAnnouncement = announcementForEvent("upload-succeeded", fileName, resolved.i18n);
			lastError = null;
		}

		if (event.type === "upload-canceled") {
			const fileName = metadataById.get(event.fileId)?.fileName ?? event.fileId;
			lastAnnouncement = announcementForEvent("upload-canceled", fileName, resolved.i18n);
		}

		if (event.type === "upload-failed") {
			const fileName = metadataById.get(event.fileId)?.fileName ?? event.fileId;
			lastAnnouncement = announcementForEvent(
				"upload-failed",
				fileName,
				resolved.i18n,
				event.errorMessage,
			);
			lastError = event.errorMessage;
		}

		notify();
	};

	const ensureRuntime = async () => {
		if (runtime) {
			return runtime;
		}

		queueStore = resolved.persistence.enabled ? createQueueStore(resolved.persistence) : undefined;

		runtime = await createRuntime({
			config: resolved,
			onEvent: handleEvent,
			onRuntimeError: (error) => {
				lastError = error;
				notify();
			},
			queueStore,
		});

		for (const file of runtime.listFiles()) {
			metadataById.set(file.fileId, {
				fileName: file.fileName,
				fileType: file.fileType,
				visibility: file.visibility,
			});
			ensureOrdered(file.fileId);
		}

		initialized = true;
		notify();
		return runtime;
	};

	return {
		addFiles: async (files, visibility = "private") => {
			if (!files.length) {
				return;
			}

			const activeRuntime = await ensureRuntime();
			const results = await activeRuntime.addFiles(files, visibility);
			const errors = results.filter((result) => !result.ok).map((result) => result.error);
			if (errors.length) {
				lastError = errors.filter(Boolean).join(" ");
				notify();
			}
		},
		cancelFile: async (fileId) => {
			const activeRuntime = await ensureRuntime();
			await activeRuntime.cancelFile(fileId);
		},
		clearCompleted: () => {
			for (const [fileId, item] of itemsById.entries()) {
				if (item.status === "canceled" || item.status === "failed" || item.status === "succeeded") {
					itemsById.delete(fileId);
					metadataById.delete(fileId);
				}
			}

			for (let index = orderedIds.length - 1; index >= 0; index -= 1) {
				const orderedFileId = orderedIds[index];
				if (orderedFileId && !itemsById.has(orderedFileId)) {
					orderedIds.splice(index, 1);
				}
			}

			notify();
		},
		destroy: async () => {
			runtime?.destroy();
			runtime = undefined;
			queueStore = undefined;
			initialized = false;
			isUploading = false;
			notify();
		},
		getSnapshot: snapshot,
		initialize: async () => {
			await ensureRuntime();
		},
		mountDashboard: async (target) => {
			const activeRuntime = await ensureRuntime();
			await activeRuntime.mountDashboard(target);
		},
		mountDropzone: async (target) => {
			const activeRuntime = await ensureRuntime();
			await activeRuntime.mountDropzone(target);
		},
		pauseFile: async (fileId) => {
			const activeRuntime = await ensureRuntime();
			activeRuntime.pauseFile(fileId);
		},
		resumeFile: async (fileId) => {
			const activeRuntime = await ensureRuntime();
			await activeRuntime.resumeFile(fileId);
		},
		retryFile: async (fileId) => {
			const activeRuntime = await ensureRuntime();
			return activeRuntime.retryFile(fileId);
		},
		subscribe: (listener) => {
			listeners.add(listener);
			listener(snapshot());
			return () => {
				listeners.delete(listener);
			};
		},
		uploadAll: async () => {
			const activeRuntime = await ensureRuntime();
			isUploading = true;
			notify();
			try {
				return await activeRuntime.uploadAll();
			} finally {
				isUploading = false;
				notify();
			}
		},
		uploadFile: async (fileId) => {
			const activeRuntime = await ensureRuntime();
			isUploading = true;
			notify();
			try {
				return await activeRuntime.uploadFile(fileId);
			} finally {
				isUploading = false;
				notify();
			}
		},
	};
}

export function useUploader(
	input: UploaderConfigInput,
	dependencies: UploaderControllerDependencies = {},
) {
	const resolved = resolveUploaderConfig(input);
	const controller = createUploaderController(input, dependencies);
	const [snapshot, setSnapshot] = createSignal(controller.getSnapshot());

	onMount(() => {
		const unsubscribe = controller.subscribe((next) => {
			setSnapshot(next);
		});

		void controller.initialize();

		onCleanup(() => {
			unsubscribe();
		});
	});

	onCleanup(() => {
		void controller.destroy();
	});

	const state = createMemo(() => snapshot());

	return {
		a11y: () => resolved.a11y,
		addFiles: controller.addFiles,
		cancelFile: controller.cancelFile,
		capture: () => resolved.capture,
		clearCompleted: controller.clearCompleted,
		i18n: () => resolved.i18n,
		initialized: createMemo(() => state().initialized),
		isUploading: createMemo(() => state().isUploading),
		items: createMemo(() => state().items),
		lastAnnouncement: createMemo(() => state().lastAnnouncement),
		lastError: createMemo(() => state().lastError),
		mountDashboard: controller.mountDashboard,
		mountDropzone: controller.mountDropzone,
		pauseFile: controller.pauseFile,
		resumeFile: controller.resumeFile,
		restrictions: () => resolved.restrictions,
		retryFile: controller.retryFile,
		uploadAll: controller.uploadAll,
		uploadFile: controller.uploadFile,
	};
}
