import type { UploaderRecordVisibility } from "../adapters";
import type { UploaderPersistenceConfig } from "../contracts";

const STORE_NAME = "uploads";

export type UploaderQueueRecord = {
	addedAt: number;
	blob: Blob;
	fileId: string;
	fileName: string;
	fileSize: number;
	fileType: string;
	lastModified: number;
	visibility: UploaderRecordVisibility;
};

export type UploaderQueueStore = {
	clear: () => Promise<void>;
	getAll: () => Promise<UploaderQueueRecord[]>;
	put: (record: UploaderQueueRecord) => Promise<void>;
	remove: (fileId: string) => Promise<void>;
};

class MemoryUploaderQueueStore implements UploaderQueueStore {
	readonly #records = new Map<string, UploaderQueueRecord>();

	async clear() {
		this.#records.clear();
	}

	async getAll() {
		return [...this.#records.values()].sort((a, b) => a.addedAt - b.addedAt);
	}

	async put(record: UploaderQueueRecord) {
		this.#records.set(record.fileId, record);
	}

	async remove(fileId: string) {
		this.#records.delete(fileId);
	}
}

function requestToPromise<T>(request: IDBRequest<T>) {
	return new Promise<T>((resolve, reject) => {
		request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
		request.onsuccess = () => resolve(request.result);
	});
}

function transactionDoneToPromise(transaction: IDBTransaction) {
	return new Promise<void>((resolve, reject) => {
		transaction.onerror = () =>
			reject(transaction.error ?? new Error("IndexedDB transaction failed."));
		transaction.onabort = () =>
			reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
		transaction.oncomplete = () => resolve();
	});
}

function openQueueDatabase(databaseName: string) {
	return new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(databaseName, 1);

		request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: "fileId" });
			}
		};
		request.onsuccess = () => resolve(request.result);
	});
}

class IndexedDbUploaderQueueStore implements UploaderQueueStore {
	readonly #databasePromise: Promise<IDBDatabase>;

	constructor(databaseName: string) {
		this.#databasePromise = openQueueDatabase(databaseName);
	}

	async clear() {
		const db = await this.#databasePromise;
		const transaction = db.transaction(STORE_NAME, "readwrite");
		const store = transaction.objectStore(STORE_NAME);
		store.clear();
		await transactionDoneToPromise(transaction);
	}

	async getAll() {
		const db = await this.#databasePromise;
		const transaction = db.transaction(STORE_NAME, "readonly");
		const store = transaction.objectStore(STORE_NAME);
		const allRecords = await requestToPromise(store.getAll());
		await transactionDoneToPromise(transaction);

		return allRecords.sort((a, b) => a.addedAt - b.addedAt);
	}

	async put(record: UploaderQueueRecord) {
		const db = await this.#databasePromise;
		const transaction = db.transaction(STORE_NAME, "readwrite");
		const store = transaction.objectStore(STORE_NAME);
		store.put(record);
		await transactionDoneToPromise(transaction);
	}

	async remove(fileId: string) {
		const db = await this.#databasePromise;
		const transaction = db.transaction(STORE_NAME, "readwrite");
		const store = transaction.objectStore(STORE_NAME);
		store.delete(fileId);
		await transactionDoneToPromise(transaction);
	}
}

function canUseIndexedDb() {
	return typeof indexedDB !== "undefined";
}

export function createUploaderQueueStore(config: UploaderPersistenceConfig): UploaderQueueStore {
	if (config.driver !== "indexeddb" || !canUseIndexedDb()) {
		return new MemoryUploaderQueueStore();
	}

	return new IndexedDbUploaderQueueStore(config.queueKey);
}

export function fileToQueueRecord(
	fileId: string,
	file: File,
	visibility: UploaderRecordVisibility,
): UploaderQueueRecord {
	return {
		addedAt: Date.now(),
		blob: file,
		fileId,
		fileName: file.name,
		fileSize: file.size,
		fileType: file.type || "application/octet-stream",
		lastModified: file.lastModified,
		visibility,
	};
}

export function queueRecordToFile(record: UploaderQueueRecord): File {
	if (typeof File !== "undefined") {
		return new File([record.blob], record.fileName, {
			lastModified: record.lastModified,
			type: record.fileType,
		});
	}

	const fallbackBlob = record.blob.slice(0, record.blob.size, record.fileType) as Blob & {
		lastModified?: number;
		name?: string;
	};

	Object.defineProperty(fallbackBlob, "lastModified", {
		configurable: true,
		value: record.lastModified,
	});
	Object.defineProperty(fallbackBlob, "name", {
		configurable: true,
		value: record.fileName,
	});

	return fallbackBlob as unknown as File;
}
