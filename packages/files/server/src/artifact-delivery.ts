import type {
	FilesArtifactGroupKind,
	FilesArtifactGroupRecord,
	FilesArtifactKind,
	FilesArtifactRecord,
	FileVisibility,
} from "@de100/files-shared";

import type { FileObject } from "./storage";
import { createFileObjectResponse } from "./storage";

export type SelectReadyArtifactGroupInput = {
	kind?: FilesArtifactGroupKind;
	revision?: number;
};

export type SelectReadyArtifactInput = {
	kind: FilesArtifactKind;
	renditionLabel?: string | null;
};

export type CreateArtifactResponseInput = {
	cacheControl?: string;
	contentType: string;
	object: FileObject;
	visibility: FileVisibility;
};

export function selectReadyArtifactGroup(
	groups: readonly FilesArtifactGroupRecord[],
	input: SelectReadyArtifactGroupInput = {},
) {
	const candidates = groups.filter(
		(group) =>
			group.status === "ready" &&
			group.deletedAt === null &&
			(input.kind === undefined || group.kind === input.kind) &&
			(input.revision === undefined || group.revision === input.revision),
	);
	candidates.sort(
		(left, right) =>
			right.revision - left.revision || right.createdAt.getTime() - left.createdAt.getTime(),
	);

	return candidates.at(0) ?? null;
}

export function selectReadyArtifact(
	artifacts: readonly FilesArtifactRecord[],
	input: SelectReadyArtifactInput,
) {
	const candidates = artifacts.filter(
		(artifact) =>
			artifact.status === "ready" &&
			artifact.deletedAt === null &&
			artifact.kind === input.kind &&
			(input.renditionLabel === undefined || artifact.renditionLabel === input.renditionLabel),
	);
	candidates.sort((left, right) => left.sortOrder - right.sortOrder);

	return candidates.at(0) ?? null;
}

export function createHlsManifestResponse(input: Omit<CreateArtifactResponseInput, "contentType">) {
	return createArtifactResponse({
		...input,
		contentType: "application/vnd.apple.mpegurl",
	});
}

export function createHlsSegmentResponse(
	input: Omit<CreateArtifactResponseInput, "contentType"> & {
		format?: "fmp4-cmaf" | "mpeg-ts";
	},
) {
	return createArtifactResponse({
		...input,
		contentType: input.format === "fmp4-cmaf" ? "video/mp4" : "video/mp2t",
	});
}

export function createArtifactResponse(input: CreateArtifactResponseInput) {
	return createFileObjectResponse(
		{
			...input.object,
			httpMetadata: {
				...input.object.httpMetadata,
				cacheControl: input.cacheControl ?? input.object.httpMetadata?.cacheControl,
				contentType: input.contentType,
			},
		},
		input.visibility,
	);
}
