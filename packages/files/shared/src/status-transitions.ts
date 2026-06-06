import type { FileStatus } from "./constants";
import { fileStatusValues } from "./constants";

const allowedFileStatusTransitions: Record<FileStatus, FileStatus[]> = {
	deleted: [],
	draft: ["uploading", "stored", "processing", "ready", "failed", "deleted"],
	failed: ["draft", "uploading", "processing", "deleted"],
	processing: ["ready", "failed", "deleted"],
	ready: ["processing", "failed", "deleted"],
	stored: ["processing", "ready", "failed", "deleted"],
	uploading: ["stored", "failed", "deleted"],
};

export function getAllowedFileStatusTransitions(status: FileStatus): FileStatus[] {
	return [...allowedFileStatusTransitions[status]];
}

export function canTransitionFileStatus(from: FileStatus, to: FileStatus): boolean {
	if (from === to) {
		return true;
	}

	return allowedFileStatusTransitions[from].includes(to);
}

export function assertFileStatus(value: string): FileStatus {
	if (fileStatusValues.includes(value as FileStatus)) {
		return value as FileStatus;
	}

	throw new Error(`Unsupported file status: ${value}`);
}
