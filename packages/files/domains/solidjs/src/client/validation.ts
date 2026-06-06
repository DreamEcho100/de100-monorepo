import type { FileKind } from "@de100/files-shared";
import { inferFileKindFromContentType } from "@de100/files-shared";

export type FileUploaderRestrictions = {
	accept?: string;
	allowedFileKinds?: FileKind[];
	maxFileBytes?: number;
	maxFiles?: number;
};

export type FileUploaderValidationMessages = {
	invalidFileKind: string;
	invalidFileType: string;
	overFileCount: string;
	overFileSize: string;
};

export type FileUploaderRejectedFile = {
	file: File;
	message: string;
	reason: keyof FileUploaderValidationMessages;
};

export type FileUploaderValidationResult = {
	accepted: File[];
	rejected: FileUploaderRejectedFile[];
};

export const defaultFileUploaderValidationMessages: FileUploaderValidationMessages = {
	invalidFileKind: "This file kind is not allowed.",
	invalidFileType: "This file type is not allowed.",
	overFileCount: "Too many files selected.",
	overFileSize: "This file is too large.",
};

export function validateFilesForUpload(input: {
	currentFileCount: number;
	files: File[];
	messages?: Partial<FileUploaderValidationMessages>;
	restrictions?: FileUploaderRestrictions;
}): FileUploaderValidationResult {
	const messages = {
		...defaultFileUploaderValidationMessages,
		...input.messages,
	};
	const accepted: File[] = [];
	const rejected: FileUploaderRejectedFile[] = [];

	for (const file of input.files) {
		const maxFiles = input.restrictions?.maxFiles;
		if (maxFiles && input.currentFileCount + accepted.length >= maxFiles) {
			rejected.push({
				file,
				message: messages.overFileCount,
				reason: "overFileCount",
			});
			continue;
		}

		if (input.restrictions?.maxFileBytes && file.size > input.restrictions.maxFileBytes) {
			rejected.push({
				file,
				message: messages.overFileSize,
				reason: "overFileSize",
			});
			continue;
		}

		if (
			input.restrictions?.allowedFileKinds &&
			!input.restrictions.allowedFileKinds.includes(inferFileKindFromContentType(file.type))
		) {
			rejected.push({
				file,
				message: messages.invalidFileKind,
				reason: "invalidFileKind",
			});
			continue;
		}

		if (input.restrictions?.accept && !fileMatchesAccept(file, input.restrictions.accept)) {
			rejected.push({
				file,
				message: messages.invalidFileType,
				reason: "invalidFileType",
			});
			continue;
		}

		accepted.push(file);
	}

	return {
		accepted,
		rejected,
	};
}

export function fileMatchesAccept(file: File, accept: string) {
	const tokens = accept
		.split(",")
		.map((token) => token.trim().toLowerCase())
		.filter(Boolean);

	if (tokens.length === 0) {
		return true;
	}

	const fileName = file.name.toLowerCase();
	const fileType = file.type.toLowerCase();

	return tokens.some((token) => {
		if (token.startsWith(".")) {
			return fileName.endsWith(token);
		}

		if (token.endsWith("/*")) {
			return fileType.startsWith(token.slice(0, -1));
		}

		return fileType === token;
	});
}
