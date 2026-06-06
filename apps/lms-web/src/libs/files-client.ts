import type {
	FilesClient,
	FilesDirectUploadInput,
	FilesUploadFileInput,
	FilesUploadOptions,
	FilesUploadResult,
} from "@de100/files-client";
import { brandFileRouteSlug, inferFileKindFromContentType } from "@de100/files-shared";

import { client as orpcClient } from "~/libs/apis/orpc";

export function createOrpcFilesClient(): FilesClient {
	const resolveUploadMode: FilesClient["resolveUploadMode"] = (input) =>
		orpcClient.files.resolveUploadMode({
			...input,
			routeSlug: String(input.routeSlug),
		});

	const uploadDirect = (input: FilesDirectUploadInput) =>
		orpcClient.files.uploadDirect({
			...input,
			routeSlug: String(input.routeSlug),
		});

	const createUploadTarget: FilesClient["createUploadTarget"] = (input) =>
		orpcClient.files.createUploadTarget(input);

	const completeUpload: FilesClient["completeUpload"] = (input) =>
		orpcClient.files.completeUpload(input);

	return {
		abortUpload: (input) => orpcClient.files.abortUpload(input),
		completeUpload,
		createUploadTarget,
		downloadDirect: async (input) => {
			const result = await orpcClient.files.downloadDirect(input);
			return result ? { ...result, file: result.file as Blob } : null;
		},
		getConfig: () => orpcClient.files.config(),
		issueSignedAccess: (input) => orpcClient.files.issueSignedAccess(input),
		route: (slug) => brandFileRouteSlug(slug),
		resolveUploadMode,
		uploadDirect,
		uploadFile: (input) =>
			uploadFileWithOrpcClient({
				completeUpload,
				createUploadTarget,
				input,
				resolveUploadMode,
				uploadDirect,
			}),
		watchProcessing: async function* (input) {
			yield* await orpcClient.files.watchProcessing(input);
		},
		watchUpload: async function* (input) {
			yield* await orpcClient.files.watchUpload(input);
		},
	};
}

async function uploadFileWithOrpcClient(input: {
	completeUpload: FilesClient["completeUpload"];
	createUploadTarget: FilesClient["createUploadTarget"];
	input: FilesUploadOptions;
	resolveUploadMode: FilesClient["resolveUploadMode"];
	uploadDirect: FilesClient["uploadDirect"];
}): Promise<FilesUploadResult> {
	const upload = input.input;
	upload.onUploadBegin?.(upload.file);

	const mode = await input.resolveUploadMode({
		contentType: upload.file.type || "application/octet-stream",
		fileSize: upload.file.size,
		kind: inferFileKindFromContentType(upload.file.type),
		requiresResumable: upload.requiresResumable,
		routeSlug: upload.routeSlug,
	});

	if (mode.mode === "orpc-direct") {
		const record = await input.uploadDirect(toDirectUploadInput(upload));
		upload.onUploadProgress?.({
			file: upload.file,
			loaded: upload.file.size,
			progress: 100,
			total: upload.file.size,
		});

		return {
			mode: "orpc-direct",
			record,
		};
	}

	const target = await input.createUploadTarget({
		contentType: upload.file.type || "application/octet-stream",
		fileName: upload.file.name,
		fileSize: upload.file.size,
		metadata: upload.metadata,
		protocol: mode.protocol === "orpc-direct" ? "auto" : mode.protocol,
		routeSlug: String(upload.routeSlug),
		visibility: upload.visibility ?? "private",
	});

	return {
		mode: "upload-target",
		target,
	};
}

function toDirectUploadInput(input: FilesUploadFileInput): FilesDirectUploadInput {
	return {
		file: input.file,
		kind: inferFileKindFromContentType(input.file.type),
		metadata: input.metadata,
		requiresResumable: input.requiresResumable,
		routeSlug: input.routeSlug,
		visibility: input.visibility ?? "private",
	};
}
