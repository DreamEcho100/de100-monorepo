import type { UppyFile } from "@uppy/core";

import type {
	UploaderProviderAdapter,
	UploaderRecordRef,
	UploaderRecordVisibility,
} from "./adapters";
import type { ResolvedUploaderConfig, UploaderCandidateFile } from "./contracts";
import type { UploaderEvent } from "./events";
import type { UploaderQueueStore } from "./persistence/indexeddb-queue";
import { fileToQueueRecord, queueRecordToFile } from "./persistence/indexeddb-queue";
import {
	buildProviderUploadRequest,
	cancelProviderUpload,
	confirmProviderUpload,
	createProviderUploadTarget,
	toUploaderCandidateFile,
} from "./provider-bridge";
import type { NetworkQuality } from "./transport-policy";
import { selectUploadTransport } from "./transport-policy";

export type UploaderAddFileResult = {
	error?: string;
	file: File;
	fileId?: string;
	ok: boolean;
};

export type UploaderUploadResult = {
	error?: string;
	fileId: string;
	ok: boolean;
	record?: UploaderRecordRef;
};

export type UploaderRuntimeFile = {
	fileId: string;
	fileName: string;
	fileSize: number;
	fileType: string;
	visibility: UploaderRecordVisibility;
};

export type UploaderRuntime = {
	addFiles: (
		files: File[],
		visibility: UploaderRecordVisibility,
	) => Promise<UploaderAddFileResult[]>;
	cancelFile: (fileId: string) => Promise<void>;
	destroy: () => void;
	listFiles: () => UploaderRuntimeFile[];
	mountDashboard: (target: HTMLElement) => Promise<void>;
	mountDropzone: (target: HTMLElement) => Promise<void>;
	pauseFile: (fileId: string) => void;
	resumeFile: (fileId: string) => Promise<void>;
	retryFile: (fileId: string) => Promise<UploaderUploadResult>;
	uploadAll: () => Promise<UploaderUploadResult[]>;
	uploadFile: (fileId: string) => Promise<UploaderUploadResult>;
};

export type CreateUploaderRuntimeOptions = {
	config: ResolvedUploaderConfig;
	onEvent: (event: UploaderEvent) => void;
	onRuntimeError?: (error: string) => void;
	queueStore?: UploaderQueueStore;
};

type RuntimeFileMetadata = {
	fileName: string;
	fileType: string;
	visibility: UploaderRecordVisibility;
};

const MAX_AUTO_RETRIES = 2;

function readNavigatorConnection() {
	if (typeof navigator === "undefined") {
		return {
			effectiveType: "unknown",
			type: "unknown",
		};
	}

	const maybeConnection = (
		navigator as Navigator & {
			connection?: {
				effectiveType?: string;
				type?: string;
			};
		}
	).connection;

	return {
		effectiveType: maybeConnection?.effectiveType ?? "unknown",
		type: maybeConnection?.type ?? "unknown",
	};
}

function toNetworkQuality(effectiveType: string): NetworkQuality {
	if (
		effectiveType === "2g" ||
		effectiveType === "3g" ||
		effectiveType === "4g" ||
		effectiveType === "slow-2g"
	) {
		return effectiveType;
	}

	if (effectiveType === "offline") {
		return "offline";
	}

	return "unknown";
}

function isCellularConnection(connectionType: string) {
	return connectionType === "cellular";
}

function isMimeTypeAllowed(fileType: string, allowedMimeTypes: string[]) {
	if (allowedMimeTypes.includes("*/*")) {
		return true;
	}

	return allowedMimeTypes.some((allowed) => {
		if (allowed.endsWith("/*")) {
			const [prefix] = allowed.split("/");
			return fileType.startsWith(`${prefix}/`);
		}

		return allowed === fileType;
	});
}

function isRecoverableUploadError(message: string) {
	const lower = message.toLowerCase();
	if (lower.includes("abort")) {
		return true;
	}

	if (lower.includes("network")) {
		return true;
	}

	if (/\b5\d\d\b/.test(message)) {
		return true;
	}

	return !/\b4\d\d\b/.test(message);
}

async function runEnhancementHooks(
	candidate: UploaderCandidateFile,
	config: ResolvedUploaderConfig,
): Promise<{
	candidate: UploaderCandidateFile;
	metadata: Record<string, boolean | number | string | null | undefined>;
}> {
	let nextCandidate = candidate;
	const metadata: Record<string, boolean | number | string | null | undefined> = {};

	if (config.enhancements.runVirusScan) {
		const scanResult = await config.enhancements.runVirusScan(nextCandidate);
		if (!scanResult.safe) {
			throw new Error(scanResult.reason ?? "Virus scan blocked this file.");
		}
	}

	if (config.enhancements.compressImage && nextCandidate.kind === "image") {
		const compressed = await config.enhancements.compressImage(nextCandidate);
		if (compressed) {
			nextCandidate = compressed;
			metadata.compressed = true;
		}
	}

	if (config.enhancements.extractImageDimensions && nextCandidate.kind === "image") {
		const dimensions = await config.enhancements.extractImageDimensions(nextCandidate);
		if (dimensions) {
			metadata.imageHeight = dimensions.height;
			metadata.imageWidth = dimensions.width;
		}
	}

	if (config.enhancements.createVideoThumbnail && nextCandidate.kind === "video") {
		metadata.videoThumbnail = await config.enhancements.createVideoThumbnail(nextCandidate);
	}

	if (config.enhancements.createChecksum) {
		metadata.checksum = await config.enhancements.createChecksum(nextCandidate);
	}

	return {
		candidate: nextCandidate,
		metadata,
	};
}

export async function createUploaderRuntime(
	options: CreateUploaderRuntimeOptions,
): Promise<UploaderRuntime> {
	const { default: Uppy } = await import("@uppy/core");

	const uppy = new Uppy({
		autoProceed: false,
		restrictions: {
			allowedFileTypes: options.config.restrictions.allowedMimeTypes,
			maxFileSize: options.config.restrictions.maxFileBytes,
			maxNumberOfFiles: options.config.restrictions.maxFiles,
		},
	}) as unknown as {
		addFile: (input: {
			data: File;
			id?: string;
			meta?: Record<string, unknown>;
			name: string;
			source?: string;
			type?: string;
		}) => string;
		destroy: () => void;
		getFile: (id: string) => UppyFile<Record<string, unknown>, Record<string, never>> | undefined;
		getFiles: () => Array<UppyFile<Record<string, unknown>, Record<string, never>>>;
		getPlugin: (
			id: string,
		) => { setOptions?: (options: Record<string, unknown>) => void } | undefined;
		removeFile: (id: string) => void;
		use: (plugin: unknown, options?: Record<string, unknown>) => void;
	};

	const activeTargets = new Map<string, string>();
	const activeUploads = new Map<string, { cancel: () => void }>();
	const pausedFiles = new Set<string>();
	const canceledFiles = new Set<string>();
	const retryAttempts = new Map<string, number>();
	const runtimeFiles = new Map<string, RuntimeFileMetadata>();

	const emit = (event: UploaderEvent) => {
		options.onEvent(event);
	};

	const getRequiredProviderAdapter = (): UploaderProviderAdapter => {
		if (!options.config.providerAdapter) {
			throw new Error("Uploader provider adapter is required for uploads.");
		}

		return options.config.providerAdapter;
	};

	const persistQueuedFile = async (
		fileId: string,
		file: File,
		visibility: UploaderRecordVisibility,
	) => {
		if (!options.queueStore || !options.config.persistence.enabled) {
			return;
		}

		await options.queueStore.put(fileToQueueRecord(fileId, file, visibility));
	};

	const removePersistedFile = async (fileId: string) => {
		if (!options.queueStore || !options.config.persistence.enabled) {
			return;
		}

		await options.queueStore.remove(fileId);
	};

	const restorePersistedFiles = async () => {
		if (!options.queueStore || !options.config.persistence.enabled) {
			return;
		}

		const records = await options.queueStore.getAll();

		for (const record of records) {
			try {
				const file = queueRecordToFile(record);
				const fileId = uppy.addFile({
					data: file,
					id: record.fileId,
					meta: { visibility: record.visibility },
					name: record.fileName,
					source: "de100-uploader-restore",
					type: record.fileType,
				});

				runtimeFiles.set(fileId, {
					fileName: record.fileName,
					fileType: record.fileType,
					visibility: record.visibility,
				});
				emit({
					fileId,
					fileName: record.fileName,
					mimeType: record.fileType,
					totalBytes: record.fileSize,
					type: "file-added",
					visibility: record.visibility,
				});
			} catch {
				await removePersistedFile(record.fileId);
			}
		}
	};

	const removeRuntimeFile = (fileId: string) => {
		if (uppy.getFile(fileId)) {
			uppy.removeFile(fileId);
		}

		runtimeFiles.delete(fileId);
		retryAttempts.delete(fileId);
		pausedFiles.delete(fileId);
		canceledFiles.delete(fileId);
		activeTargets.delete(fileId);
		activeUploads.delete(fileId);
	};

	const uploadFile = async (fileId: string): Promise<UploaderUploadResult> => {
		const file = uppy.getFile(fileId);
		if (!file || !(file.data instanceof Blob)) {
			return {
				error: "Queued file is missing.",
				fileId,
				ok: false,
			};
		}

		const adapter = getRequiredProviderAdapter();
		const runtimeFile = runtimeFiles.get(fileId);
		const visibility = runtimeFile?.visibility ?? "private";
		const browserFile = file.data as File;

		emit({ fileId, type: "upload-started" });

		try {
			const baseCandidate = toUploaderCandidateFile({
				lastModified: browserFile.lastModified,
				name: file.name,
				size: browserFile.size,
				type: file.type,
			});

			const enhanced = await runEnhancementHooks(baseCandidate, options.config);
			const connection = readNavigatorConnection();
			const transportDecision = selectUploadTransport(
				options.config.transport.mode,
				{
					fileBytes: browserFile.size,
					isCellularConnection: isCellularConnection(connection.type),
					networkQuality: toNetworkQuality(connection.effectiveType),
					supportsTus: true,
					supportsXhr: true,
				},
				options.config.transport.auto,
			);

			const target = await createProviderUploadTarget({
				adapter,
				candidate: enhanced.candidate,
				metadata: {
					autoTransportReason: transportDecision.reason,
					...enhanced.metadata,
				},
				transport: transportDecision.transport,
				visibility,
			});

			activeTargets.set(fileId, target.targetId);

			if (canceledFiles.has(fileId)) {
				throw new Error("Upload canceled.");
			}

			if (pausedFiles.has(fileId)) {
				throw new Error("Upload paused.");
			}

			if (typeof XMLHttpRequest === "undefined") {
				const request = buildProviderUploadRequest(target, browserFile, file.name);
				emit({
					bytesUploaded: Math.min(Math.floor(browserFile.size * 0.1), browserFile.size),
					fileId,
					type: "upload-progress",
				});

				const response = await fetch(request.url, {
					body: request.body,
					headers: request.headers,
					method: request.method,
				});

				if (!response.ok) {
					throw new Error(`Upload target responded with ${response.status}.`);
				}

				emit({
					bytesUploaded: browserFile.size,
					fileId,
					type: "upload-progress",
				});
			} else {
				const { default: UploadUppy } = await import("@uppy/core");
				const uploadUppy = new UploadUppy({
					autoProceed: false,
					restrictions: {
						allowedFileTypes: options.config.restrictions.allowedMimeTypes,
						maxFileSize: options.config.restrictions.maxFileBytes,
						maxNumberOfFiles: 1,
					},
				}) as unknown as {
					addFile: (input: {
						data: File;
						id?: string;
						meta?: Record<string, unknown>;
						name: string;
						type?: string;
					}) => string;
					cancelAll: () => void;
					destroy: () => void;
					on: (
						event: "upload-error" | "upload-progress",
						callback: (...args: unknown[]) => void,
					) => void;
					setFileMeta: (id: string, meta: Record<string, unknown>) => void;
					upload: () => Promise<{
						failed: Array<{ error?: Error }>;
						successful: Array<unknown>;
					}>;
					use: (plugin: unknown, options?: Record<string, unknown>) => void;
				};

				const uploadFileId = uploadUppy.addFile({
					data: browserFile,
					id: fileId,
					meta: {},
					name: browserFile.name,
					type: browserFile.type,
				});

				if (target.method === "POST" && target.fields) {
					uploadUppy.setFileMeta(uploadFileId, target.fields);
				}

				if (transportDecision.transport === "xhr") {
					const { default: XhrUpload } = await import("@uppy/xhr-upload");
					uploadUppy.use(XhrUpload, {
						bundle: false,
						endpoint: target.uploadUrl,
						fieldName: "file",
						formData: target.method === "POST",
						headers: target.headers ?? {},
						method: target.method,
					});
				} else {
					const { default: TusUpload } = await import("@uppy/tus");
					uploadUppy.use(TusUpload, {
						endpoint: target.uploadUrl,
						headers: target.headers ?? {},
					});
				}

				uploadUppy.on("upload-progress", (_uploadFile, progress) => {
					const maybeProgress = progress as { bytesUploaded?: number; bytesTotal?: number };
					emit({
						bytesUploaded: Math.min(
							maybeProgress.bytesUploaded ?? 0,
							maybeProgress.bytesTotal ?? browserFile.size,
						),
						fileId,
						type: "upload-progress",
					});
				});

				uploadUppy.on("upload-error", (_uploadFile, error) => {
					const maybeError = error as Error | undefined;
					emit({
						errorMessage: maybeError?.message ?? "Upload failed.",
						fileId,
						recoverable: true,
						type: "upload-failed",
					});
				});

				activeUploads.set(fileId, {
					cancel: () => {
						uploadUppy.cancelAll();
					},
				});

				try {
					const uploadResult = await uploadUppy.upload();
					if (uploadResult.failed.length > 0) {
						throw uploadResult.failed[0]?.error ?? new Error("Upload failed.");
					}
				} finally {
					uploadUppy.destroy();
				}
			}

			const record = await confirmProviderUpload(adapter, target.targetId);
			emit({ fileId, type: "upload-succeeded" });
			emit({ fileId, type: "upload-complete" });
			await removePersistedFile(fileId);
			removeRuntimeFile(fileId);

			return {
				fileId,
				ok: true,
				record,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : "Upload failed.";
			const isCanceled = canceledFiles.has(fileId);
			const isPaused = pausedFiles.has(fileId);
			const recoverable = isRecoverableUploadError(message);
			const targetId = activeTargets.get(fileId);

			if (isCanceled) {
				if (targetId) {
					await cancelProviderUpload(adapter, targetId, "Upload canceled.");
				}
				emit({ fileId, type: "upload-canceled" });
				emit({ fileId, type: "upload-complete" });
				await removePersistedFile(fileId);
				removeRuntimeFile(fileId);
				return {
					error: message,
					fileId,
					ok: false,
				};
			}

			emit({
				errorMessage: isPaused ? "Upload paused." : message,
				fileId,
				recoverable: isPaused ? true : recoverable,
				type: "upload-failed",
			});

			const retries = retryAttempts.get(fileId) ?? 0;
			if (!isPaused && recoverable && retries < MAX_AUTO_RETRIES) {
				retryAttempts.set(fileId, retries + 1);
				emit({ fileId, type: "retry-requested" });
				return uploadFile(fileId);
			}

			emit({ fileId, type: "upload-complete" });
			return {
				error: message,
				fileId,
				ok: false,
			};
		} finally {
			activeUploads.delete(fileId);
			activeTargets.delete(fileId);
		}
	};

	const addFiles = async (
		files: File[],
		visibility: UploaderRecordVisibility,
	): Promise<UploaderAddFileResult[]> => {
		const results: UploaderAddFileResult[] = [];

		for (const file of files) {
			const candidate = toUploaderCandidateFile({
				lastModified: file.lastModified,
				name: file.name,
				size: file.size,
				type: file.type,
			});

			if (!isMimeTypeAllowed(candidate.type, options.config.restrictions.allowedMimeTypes)) {
				results.push({
					error: options.config.i18n.invalidTypeError,
					file,
					ok: false,
				});
				continue;
			}

			if (candidate.size > options.config.restrictions.maxFileBytes) {
				results.push({
					error: options.config.i18n.overFileLimitError,
					file,
					ok: false,
				});
				continue;
			}

			if (options.config.enhancements.beforeQueue) {
				const allowed = await options.config.enhancements.beforeQueue(candidate);
				if (!allowed) {
					results.push({
						error: "File was rejected before queueing.",
						file,
						ok: false,
					});
					continue;
				}
			}

			try {
				const fileId = uppy.addFile({
					data: file,
					meta: { visibility },
					name: file.name,
					source: "de100-uploader",
					type: file.type,
				});

				runtimeFiles.set(fileId, {
					fileName: file.name,
					fileType: file.type,
					visibility,
				});
				retryAttempts.set(fileId, 0);

				emit({
					fileId,
					fileName: file.name,
					mimeType: file.type,
					totalBytes: file.size,
					type: "file-added",
					visibility,
				});

				await persistQueuedFile(fileId, file, visibility);
				results.push({ file, fileId, ok: true });
			} catch (error) {
				results.push({
					error: error instanceof Error ? error.message : "Failed to queue file.",
					file,
					ok: false,
				});
			}
		}

		const rejected = results.filter((result) => !result.ok).map((result) => result.error);
		if (rejected.length && options.onRuntimeError) {
			options.onRuntimeError(rejected.filter(Boolean).join(" "));
		}

		return results;
	};

	const uploadAll = async () => {
		const files = uppy.getFiles();
		const results: UploaderUploadResult[] = [];

		for (const file of files) {
			if (!file.id || pausedFiles.has(file.id) || canceledFiles.has(file.id)) {
				continue;
			}

			results.push(await uploadFile(file.id));
		}

		return results;
	};

	const retryFile = async (fileId: string) => {
		emit({ fileId, type: "retry-requested" });
		pausedFiles.delete(fileId);
		canceledFiles.delete(fileId);
		return uploadFile(fileId);
	};

	const pauseFile = (fileId: string) => {
		pausedFiles.add(fileId);
		activeUploads.get(fileId)?.cancel();
	};

	const resumeFile = async (fileId: string) => {
		if (!pausedFiles.has(fileId)) {
			return;
		}

		pausedFiles.delete(fileId);
		emit({ fileId, type: "retry-requested" });
		await uploadFile(fileId);
	};

	const cancelFile = async (fileId: string) => {
		canceledFiles.add(fileId);
		pausedFiles.delete(fileId);
		activeUploads.get(fileId)?.cancel();

		const adapter = options.config.providerAdapter;
		const targetId = activeTargets.get(fileId);
		if (adapter && targetId) {
			await cancelProviderUpload(adapter, targetId, "Upload canceled.");
		}

		if (!activeUploads.has(fileId)) {
			emit({ fileId, type: "upload-canceled" });
			emit({ fileId, type: "upload-complete" });
			await removePersistedFile(fileId);
			removeRuntimeFile(fileId);
		}
	};

	const mountDashboard = async (target: HTMLElement) => {
		const pluginId = "UploaderDashboard";
		const existing = uppy.getPlugin(pluginId);
		if (existing?.setOptions) {
			existing.setOptions({ target });
			return;
		}

		const { default: Dashboard } = await import("@uppy/dashboard");
		uppy.use(Dashboard, {
			hideUploadButton: true,
			id: pluginId,
			inline: true,
			note: options.config.i18n.dropzoneHint,
			proudlyDisplayPoweredByUppy: false,
			showProgressDetails: true,
			target,
		});

		if (options.config.capture.allowCamera && !uppy.getPlugin("UploaderWebcam")) {
			const { default: Webcam } = await import("@uppy/webcam");
			uppy.use(Webcam, {
				id: "UploaderWebcam",
				target: pluginId,
			});
		}
	};

	const mountDropzone = async (target: HTMLElement) => {
		const pluginId = "UploaderDragDrop";
		const existing = uppy.getPlugin(pluginId);
		if (existing?.setOptions) {
			existing.setOptions({ target });
			return;
		}

		const { default: DragDrop } = await import("@uppy/drag-drop");
		uppy.use(DragDrop, {
			id: pluginId,
			note: options.config.i18n.dropzoneHint,
			target,
		});
	};

	const listFiles = () =>
		uppy.getFiles().map((file) => {
			const runtimeFile = runtimeFiles.get(file.id);
			return {
				fileId: file.id,
				fileName: runtimeFile?.fileName ?? file.name,
				fileSize: file.size ?? 0,
				fileType: runtimeFile?.fileType ?? file.type,
				visibility: runtimeFile?.visibility ?? "private",
			};
		});

	await restorePersistedFiles();

	return {
		addFiles,
		cancelFile,
		destroy: () => {
			uppy.destroy();
		},
		listFiles,
		mountDashboard,
		mountDropzone,
		pauseFile,
		resumeFile,
		retryFile,
		uploadAll,
		uploadFile,
	};
}
