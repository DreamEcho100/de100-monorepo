import type { UploaderRecordVisibility } from "@de100/ui-domains-solidjs/uploader/adapters.ts";
import { inferUploaderFileKind } from "@de100/ui-domains-solidjs/uploader/provider-bridge.ts";
import type {
	CreateUploaderRuntimeOptions,
	UploaderAddFileResult,
	UploaderRuntime,
	UploaderRuntimeFile,
	UploaderUploadResult,
} from "@de100/ui-domains-solidjs/uploader/uppy-factory.ts";

type MediaUploaderRuntimeFactoryInput = {
	uploadFile: (input: { file: File; visibility: UploaderRecordVisibility }) => Promise<void>;
};

type RuntimeQueuedFile = {
	file: File;
	id: string;
	paused: boolean;
	visibility: UploaderRecordVisibility;
};

const fallbackRandom = () => Math.random().toString(16).slice(2);

const createUploaderFileId = () =>
	typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
		? crypto.randomUUID()
		: `uploader-${fallbackRandom()}`;

const isMimeTypeAllowed = (fileType: string, allowedMimeTypes: string[]) => {
	if (allowedMimeTypes.includes("*/*")) {
		return true;
	}

	return allowedMimeTypes.some((allowedType) => {
		if (allowedType.endsWith("/*")) {
			const [prefix] = allowedType.split("/");
			return typeof prefix === "string" ? fileType.startsWith(`${prefix}/`) : false;
		}

		return allowedType === fileType;
	});
};

const normalizeRuntimeError = (error: unknown) =>
	error instanceof Error ? error.message : "Upload failed.";

export function createMediaUploaderRuntimeFactory(input: MediaUploaderRuntimeFactoryInput) {
	return async function createMediaUploaderRuntime(
		options: CreateUploaderRuntimeOptions,
	): Promise<UploaderRuntime> {
		const filesById = new Map<string, RuntimeQueuedFile>();
		const canceledFileIds = new Set<string>();
		const uploadingFileIds = new Set<string>();

		const listFiles = (): UploaderRuntimeFile[] =>
			Array.from(filesById.values()).map((queuedFile) => ({
				fileId: queuedFile.id,
				fileName: queuedFile.file.name,
				fileSize: queuedFile.file.size,
				fileType: queuedFile.file.type,
				visibility: queuedFile.visibility,
			}));

		const addFiles = async (
			files: File[],
			visibility: UploaderRecordVisibility,
		): Promise<UploaderAddFileResult[]> => {
			const results: UploaderAddFileResult[] = [];
			const maxFiles = options.config.restrictions.maxFiles;

			for (const file of files) {
				if (filesById.size >= maxFiles) {
					results.push({
						error: options.config.i18n.overFileLimitError,
						file,
						ok: false,
					});
					continue;
				}

				const inferredKind = inferUploaderFileKind(file.name, file.type);
				if (!options.config.restrictions.allowedFileKinds.includes(inferredKind)) {
					results.push({
						error: options.config.i18n.invalidTypeError,
						file,
						ok: false,
					});
					continue;
				}

				if (
					file.type &&
					!isMimeTypeAllowed(file.type, options.config.restrictions.allowedMimeTypes)
				) {
					results.push({
						error: options.config.i18n.invalidTypeError,
						file,
						ok: false,
					});
					continue;
				}

				if (file.size > options.config.restrictions.maxFileBytes) {
					results.push({
						error: options.config.i18n.overFileLimitError,
						file,
						ok: false,
					});
					continue;
				}

				const fileId = createUploaderFileId();
				filesById.set(fileId, {
					file,
					id: fileId,
					paused: false,
					visibility,
				});
				options.onEvent({
					fileId,
					fileName: file.name,
					mimeType: file.type,
					totalBytes: file.size,
					type: "file-added",
					visibility,
				});

				results.push({
					file,
					fileId,
					ok: true,
				});
			}

			return results;
		};

		const uploadFile = async (fileId: string): Promise<UploaderUploadResult> => {
			const queuedFile = filesById.get(fileId);
			if (!queuedFile) {
				return {
					error: "Queued file is missing.",
					fileId,
					ok: false,
				};
			}

			if (queuedFile.paused) {
				return {
					error: "Upload paused.",
					fileId,
					ok: false,
				};
			}

			uploadingFileIds.add(fileId);
			options.onEvent({ fileId, type: "upload-started" });
			options.onEvent({
				bytesUploaded: Math.min(queuedFile.file.size, Math.floor(queuedFile.file.size * 0.2)),
				fileId,
				type: "upload-progress",
			});

			try {
				await input.uploadFile({
					file: queuedFile.file,
					visibility: queuedFile.visibility,
				});

				if (canceledFileIds.has(fileId)) {
					options.onEvent({ fileId, type: "upload-canceled" });
					options.onEvent({ fileId, type: "upload-complete" });
					filesById.delete(fileId);
					canceledFileIds.delete(fileId);
					return {
						error: "Upload canceled.",
						fileId,
						ok: false,
					};
				}

				options.onEvent({
					bytesUploaded: queuedFile.file.size,
					fileId,
					type: "upload-progress",
				});
				options.onEvent({ fileId, type: "upload-succeeded" });
				options.onEvent({ fileId, type: "upload-complete" });
				filesById.delete(fileId);

				return {
					fileId,
					ok: true,
				};
			} catch (error) {
				const message = normalizeRuntimeError(error);
				options.onEvent({
					errorMessage: message,
					fileId,
					recoverable: true,
					type: "upload-failed",
				});
				options.onEvent({ fileId, type: "upload-complete" });
				options.onRuntimeError?.(message);

				return {
					error: message,
					fileId,
					ok: false,
				};
			} finally {
				uploadingFileIds.delete(fileId);
			}
		};

		const uploadAll = async (): Promise<UploaderUploadResult[]> => {
			const results: UploaderUploadResult[] = [];
			for (const fileId of filesById.keys()) {
				const result = await uploadFile(fileId);
				results.push(result);
			}
			return results;
		};

		return {
			addFiles,
			cancelFile: async (fileId) => {
				const queuedFile = filesById.get(fileId);
				if (!queuedFile) {
					return;
				}

				canceledFileIds.add(fileId);
				if (!uploadingFileIds.has(fileId)) {
					options.onEvent({ fileId, type: "upload-canceled" });
					options.onEvent({ fileId, type: "upload-complete" });
					filesById.delete(fileId);
					canceledFileIds.delete(fileId);
				}
			},
			destroy: () => {
				filesById.clear();
				canceledFileIds.clear();
				uploadingFileIds.clear();
			},
			listFiles,
			mountDashboard: async () => {},
			mountDropzone: async () => {},
			pauseFile: (fileId) => {
				const queuedFile = filesById.get(fileId);
				if (queuedFile) {
					queuedFile.paused = true;
				}
			},
			resumeFile: async (fileId) => {
				const queuedFile = filesById.get(fileId);
				if (queuedFile) {
					queuedFile.paused = false;
					await uploadFile(fileId);
				}
			},
			retryFile: async (fileId) => {
				options.onEvent({ fileId, type: "retry-requested" });
				const queuedFile = filesById.get(fileId);
				if (queuedFile) {
					queuedFile.paused = false;
				}
				return uploadFile(fileId);
			},
			uploadAll,
			uploadFile,
		};
	};
}
