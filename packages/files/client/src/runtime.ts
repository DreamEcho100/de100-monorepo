import type { CreateUploadTargetOutput, FileRecord, FileRouteSlug } from "@de100/files-shared";

import type { FilesClient, FilesUploadProgress } from "./client";
import { createFilesClient } from "./client";
import type { FilesProtocolExecutorMap } from "./protocols";
import { createFilesDefaultProtocolExecutors, resolveFilesProtocolExecutor } from "./protocols";

export type FilesUploaderItemStatus =
	| "canceled"
	| "completed"
	| "failed"
	| "paused"
	| "queued"
	| "resolving"
	| "uploading";

export type FilesUploaderItem = {
	error: string | null;
	file: File;
	id: string;
	loaded: number;
	metadata?: Record<string, unknown>;
	progress: number;
	record: FileRecord | null;
	routeSlug: FileRouteSlug | string;
	status: FilesUploaderItemStatus;
	target: CreateUploadTargetOutput | null;
	total: number;
	visibility: "private" | "public";
};

export type FilesUploaderStoredItem = Omit<FilesUploaderItem, "file"> & {
	file: File | null;
};

export type FilesUploaderQueueStore = {
	deleteItem(id: string): Promise<void> | void;
	listItems(): Promise<FilesUploaderStoredItem[]> | FilesUploaderStoredItem[];
	saveItem(item: FilesUploaderStoredItem): Promise<void> | void;
};

export type FilesUploaderRuntimeOptions = {
	client?: FilesClient;
	createId?: () => string;
	onChange?: (items: FilesUploaderItem[]) => void;
	queueStore?: FilesUploaderQueueStore;
	protocolExecutors?: FilesProtocolExecutorMap;
};

export type FilesUploaderAddOptions = {
	metadata?: Record<string, unknown>;
	routeSlug: FileRouteSlug | string;
	visibility?: "private" | "public";
};

export type FilesUploaderAggregateProgress = {
	loaded: number;
	progress: number;
	total: number;
};

export type FilesUploaderRuntime = {
	addFiles(files: File[], options: FilesUploaderAddOptions): FilesUploaderItem[];
	aggregateProgress(): FilesUploaderAggregateProgress;
	cancelFile(id: string): Promise<void>;
	clearCompleted(): Promise<void>;
	items(): FilesUploaderItem[];
	pauseFile(id: string): Promise<void>;
	restore(): Promise<void>;
	resumeFile(id: string): Promise<FilesUploaderItem | null>;
	retryFile(id: string): Promise<FilesUploaderItem | null>;
	uploadAll(): Promise<FilesUploaderItem[]>;
	uploadFile(id: string): Promise<FilesUploaderItem | null>;
};

const defaultCreateId = () =>
	typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
		? crypto.randomUUID()
		: `file-${Math.random().toString(16).slice(2)}`;

export function createFilesUploaderRuntime(
	options: FilesUploaderRuntimeOptions = {},
): FilesUploaderRuntime {
	const client = options.client ?? createFilesClient();
	const createId = options.createId ?? defaultCreateId;
	const protocolExecutors = {
		...createFilesDefaultProtocolExecutors(),
		...options.protocolExecutors,
	};
	const abortControllers = new Map<string, AbortController>();
	const canceledUploads = new Set<string>();
	let queue: FilesUploaderItem[] = [];

	const persistItem = async (item: FilesUploaderItem) => {
		await options.queueStore?.saveItem(toStoredItem(item));
	};

	const notifyChange = () => {
		options.onChange?.([...queue]);
	};

	const updateItem = async (id: string, update: Partial<FilesUploaderItem>) => {
		const index = queue.findIndex((item) => item.id === id);
		if (index === -1) {
			return null;
		}

		const nextItem = {
			...queue[index],
			...update,
		} as FilesUploaderItem;
		queue = queue.map((item) => (item.id === id ? nextItem : item));
		notifyChange();
		await persistItem(nextItem);
		return nextItem;
	};

	return {
		addFiles(files, addOptions) {
			const items = files.map((file) => ({
				error: null,
				file,
				id: createId(),
				loaded: 0,
				metadata: addOptions.metadata,
				progress: 0,
				record: null,
				routeSlug: addOptions.routeSlug,
				status: "queued" as const,
				target: null,
				total: file.size,
				visibility: addOptions.visibility ?? "private",
			}));
			queue = [...queue, ...items];
			notifyChange();

			for (const item of items) {
				void persistItem(item);
			}

			return items;
		},
		aggregateProgress() {
			const total = queue.reduce((sum, item) => sum + item.total, 0);
			const loaded = queue.reduce((sum, item) => sum + item.loaded, 0);

			return {
				loaded,
				progress: total === 0 ? 0 : Math.round((loaded / total) * 100),
				total,
			};
		},
		async cancelFile(id) {
			canceledUploads.add(id);
			abortControllers.get(id)?.abort();
			abortControllers.delete(id);
			const item = queue.find((candidate) => candidate.id === id);
			if (item?.target?.sessionId) {
				await client.abortUpload({ sessionId: item.target.sessionId });
			}

			await updateItem(id, {
				status: "canceled",
			});
		},
		async clearCompleted() {
			const removedIds = queue
				.filter((item) => item.status === "completed" || item.status === "canceled")
				.map((item) => item.id);
			queue = queue.filter((item) => item.status !== "completed" && item.status !== "canceled");
			notifyChange();

			for (const id of removedIds) {
				await options.queueStore?.deleteItem(id);
			}
		},
		items() {
			return [...queue];
		},
		async pauseFile(id) {
			abortControllers.get(id)?.abort();
			abortControllers.delete(id);
			await updateItem(id, {
				status: "paused",
			});
		},
		async restore() {
			const storedItems = await options.queueStore?.listItems();
			queue = (storedItems ?? [])
				.filter((item): item is FilesUploaderItem => item.file !== null)
				.map((item) => ({
					...item,
					error: item.error ?? null,
					record: item.record ?? null,
					target: item.target ?? null,
				}));
			notifyChange();
		},
		resumeFile(id) {
			return this.uploadFile(id);
		},
		async retryFile(id) {
			const item = await updateItem(id, {
				error: null,
				loaded: 0,
				progress: 0,
				status: "queued",
			});
			return item ? this.uploadFile(id) : null;
		},
		async uploadAll() {
			const results: FilesUploaderItem[] = [];
			for (const item of queue) {
				if (item.status === "queued" || item.status === "failed" || item.status === "paused") {
					const uploaded = await this.uploadFile(item.id);
					if (uploaded) {
						results.push(uploaded);
					}
				}
			}

			return results;
		},
		async uploadFile(id) {
			const item = queue.find((candidate) => candidate.id === id);
			if (!item || item.status === "canceled") {
				return null;
			}

			canceledUploads.delete(id);
			const abortController = new AbortController();
			abortControllers.set(id, abortController);

			try {
				await updateItem(id, {
					error: null,
					status: "resolving",
				});

				const mode = await client.resolveUploadMode({
					contentType: item.file.type || "application/octet-stream",
					fileSize: item.file.size,
					routeSlug: item.routeSlug,
				});

				if (mode.mode === "orpc-direct") {
					await updateItem(id, {
						status: "uploading",
					});
					const record = await client.uploadDirect({
						file: item.file,
						metadata: item.metadata,
						routeSlug: item.routeSlug,
						visibility: item.visibility,
					});
					return updateItem(id, {
						loaded: item.file.size,
						progress: 100,
						record,
						status: "completed",
					});
				}

				const target = await client.createUploadTarget({
					contentType: item.file.type || "application/octet-stream",
					fileName: item.file.name,
					fileSize: item.file.size,
					metadata: item.metadata,
					protocol: mode.protocol === "orpc-direct" ? "auto" : mode.protocol,
					routeSlug: String(item.routeSlug),
					visibility: item.visibility,
				});
				await updateItem(id, {
					status: "uploading",
					target,
				});

				const executor = resolveFilesProtocolExecutor(target.protocol, protocolExecutors);
				await executor({
					file: item.file,
					onProgress: (progress: FilesUploadProgress) => {
						void updateItem(id, {
							loaded: progress.loaded,
							progress: progress.progress,
						});
					},
					signal: abortController.signal,
					target,
				});
				const completed = await client.completeUpload({
					fileId: String(target.fields?.fileId ?? target.targetId),
					sessionId: target.sessionId,
				});

				return updateItem(id, {
					loaded: item.file.size,
					progress: 100,
					record: completed,
					status: "completed",
				});
			} catch (error) {
				if (abortController.signal.aborted) {
					return updateItem(id, {
						status: canceledUploads.has(id) ? "canceled" : "paused",
					});
				}

				return updateItem(id, {
					error: error instanceof Error ? error.message : "Upload failed.",
					status: "failed",
				});
			} finally {
				abortControllers.delete(id);
			}
		},
	};
}

export function createMemoryFilesUploaderQueueStore(
	initialItems: FilesUploaderStoredItem[] = [],
): FilesUploaderQueueStore {
	const items = new Map(initialItems.map((item) => [item.id, item]));

	return {
		deleteItem(id) {
			items.delete(id);
		},
		listItems() {
			return [...items.values()];
		},
		saveItem(item) {
			items.set(item.id, item);
		},
	};
}

function toStoredItem(item: FilesUploaderItem): FilesUploaderStoredItem {
	return {
		...item,
	};
}
