import type {
	FilesClient,
	FilesUploaderAggregateProgress,
	FilesUploaderItem,
	FilesUploaderQueueStore,
	FilesUploaderRuntime,
} from "@de100/files-client";
import { createFilesClient, createFilesUploaderRuntime } from "@de100/files-client";
import type { FileRouteSlug } from "@de100/files-shared";
import { createSignal } from "solid-js";

import type {
	FileUploaderRejectedFile,
	FileUploaderRestrictions,
	FileUploaderValidationMessages,
	FileUploaderValidationResult,
} from "./validation";
import { validateFilesForUpload } from "./validation";

export type FileUploaderItem = FilesUploaderItem;

export type FileUploaderControllerOptions = {
	client?: FilesClient;
	createId?: () => string;
	metadata?: Record<string, unknown>;
	onUploadComplete?: (item: FileUploaderItem) => Promise<void> | void;
	queueStore?: FilesUploaderQueueStore;
	restrictions?: FileUploaderRestrictions;
	routeSlug: FileRouteSlug | string;
	runtime?: FilesUploaderRuntime;
	validationMessages?: Partial<FileUploaderValidationMessages>;
	visibility?: "private" | "public" | (() => "private" | "public");
};

export type FileUploaderController = {
	addFiles(files: File[]): FileUploaderValidationResult;
	aggregateProgress(): FilesUploaderAggregateProgress;
	cancelFile(id: string): Promise<void>;
	clearCompleted(): Promise<void>;
	items: () => FileUploaderItem[];
	pauseFile(id: string): Promise<void>;
	rejections: () => FileUploaderRejectedFile[];
	resumeFile(id: string): Promise<void>;
	retryFile(id: string): Promise<void>;
	uploadAll(): Promise<void>;
	uploadFile(id: string): Promise<void>;
};

const defaultCreateId = () =>
	typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
		? crypto.randomUUID()
		: `file-${Math.random().toString(16).slice(2)}`;

export function createFileUploaderController(
	options: FileUploaderControllerOptions,
): FileUploaderController {
	const client = options.client ?? createFilesClient();
	const [items, setItems] = createSignal<FileUploaderItem[]>([]);
	const [rejections, setRejections] = createSignal<FileUploaderRejectedFile[]>([]);
	const notifiedCompletedItemIds = new Set<string>();
	const runtime =
		options.runtime ??
		createFilesUploaderRuntime({
			client,
			createId: options.createId ?? defaultCreateId,
			onChange: setItems,
			queueStore: options.queueStore,
		});
	const sync = () => setItems(runtime.items());

	return {
		addFiles(files) {
			const result = validateFilesForUpload({
				currentFileCount: runtime.items().length,
				files,
				messages: options.validationMessages,
				restrictions: options.restrictions,
			});
			setRejections(result.rejected);
			if (result.accepted.length > 0) {
				runtime.addFiles(result.accepted, {
					metadata: options.metadata,
					routeSlug: options.routeSlug,
					visibility: readVisibility(options.visibility),
				});
				sync();
			}

			return result;
		},
		aggregateProgress() {
			return runtime.aggregateProgress();
		},
		async cancelFile(id) {
			await runtime.cancelFile(id);
			sync();
		},
		async clearCompleted() {
			await runtime.clearCompleted();
			sync();
		},
		items,
		async pauseFile(id) {
			await runtime.pauseFile(id);
			sync();
		},
		rejections,
		async resumeFile(id) {
			await runtime.resumeFile(id);
			sync();
			await notifyUploadComplete(
				runtime.items(),
				notifiedCompletedItemIds,
				options.onUploadComplete,
			);
		},
		async retryFile(id) {
			await runtime.retryFile(id);
			sync();
			await notifyUploadComplete(
				runtime.items(),
				notifiedCompletedItemIds,
				options.onUploadComplete,
			);
		},
		async uploadAll() {
			await runtime.uploadAll();
			sync();
			await notifyUploadComplete(
				runtime.items(),
				notifiedCompletedItemIds,
				options.onUploadComplete,
			);
		},
		async uploadFile(id) {
			await runtime.uploadFile(id);
			sync();
			await notifyUploadComplete(
				runtime.items(),
				notifiedCompletedItemIds,
				options.onUploadComplete,
			);
		},
	};
}

function readVisibility(visibility: FileUploaderControllerOptions["visibility"]) {
	return typeof visibility === "function" ? visibility() : visibility;
}

async function notifyUploadComplete(
	items: FileUploaderItem[],
	notifiedCompletedItemIds: Set<string>,
	onUploadComplete?: FileUploaderControllerOptions["onUploadComplete"],
) {
	if (!onUploadComplete) {
		return;
	}

	for (const item of items) {
		if (item.status !== "completed" || !item.record || notifiedCompletedItemIds.has(item.id)) {
			continue;
		}

		notifiedCompletedItemIds.add(item.id);
		await onUploadComplete(item);
	}
}
