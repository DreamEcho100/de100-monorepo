import type { FilesArtifactRecord } from "@de100/files-shared";
import { parseFilesHlsAes128KeyUri } from "@de100/files-shared";

const defaultHlsPlaybackBasePath = "/api/files/playback/hls";
const hlsKeyRouteSegment = "keys";

export type FilesHlsAes128KeyArtifactMetadata = {
	algorithm: "AES-128";
	ivHex: string;
	keyId: string;
	keyUri: string;
};

export function createFilesHlsAes128KeyUrl(input: {
	basePath?: string;
	keyId: string;
	token: string;
}) {
	return `${normalizePlaybackBasePath(input.basePath ?? defaultHlsPlaybackBasePath)}/${encodeURIComponent(input.token)}/${hlsKeyRouteSegment}/${encodeURIComponent(input.keyId)}`;
}

export function createFilesHlsAes128KeyRequestPath(keyId: string) {
	return `${hlsKeyRouteSegment}/${encodeURIComponent(keyId)}`;
}

export function readFilesHlsAes128KeyRequestPath(path: string) {
	const normalized = path.replace(/^\/+|\/+$/g, "");
	const [segment, encodedKeyId, ...rest] = normalized.split("/");
	if (segment !== hlsKeyRouteSegment || !encodedKeyId || rest.length > 0) {
		return null;
	}

	try {
		const keyId = decodeURIComponent(encodedKeyId);
		return isSafeKeyId(keyId) ? keyId : null;
	} catch {
		return null;
	}
}

export function rewriteFilesHlsAes128ManifestKeyUris(input: {
	basePath?: string;
	manifest: string;
	token: string;
}) {
	return input.manifest.replace(/URI="([^"]+)"/gu, (match, rawUri: string) => {
		const keyId = parseFilesHlsAes128KeyUri(rawUri);
		if (!keyId) {
			return match;
		}

		return `URI="${createFilesHlsAes128KeyUrl({
			basePath: input.basePath,
			keyId,
			token: input.token,
		})}"`;
	});
}

export function findFilesHlsAes128KeyArtifact(input: {
	artifacts: readonly FilesArtifactRecord[];
	keyId: string;
}) {
	return (
		input.artifacts.find((artifact) => {
			if (
				artifact.kind !== "hls-key" ||
				artifact.status !== "ready" ||
				artifact.deletedAt !== null
			) {
				return false;
			}

			return readFilesHlsAes128KeyArtifactMetadata(artifact.metadata)?.keyId === input.keyId;
		}) ?? null
	);
}

export function readFilesHlsAes128KeyArtifactMetadata(
	metadata: Record<string, unknown> | null,
): FilesHlsAes128KeyArtifactMetadata | null {
	if (!metadata) {
		return null;
	}

	const algorithm = metadata.algorithm;
	const ivHex = metadata.ivHex;
	const keyId = metadata.keyId;
	const keyUri = metadata.keyUri;
	if (
		algorithm !== "AES-128" ||
		typeof ivHex !== "string" ||
		!isHex(ivHex, 16) ||
		typeof keyId !== "string" ||
		!isSafeKeyId(keyId) ||
		typeof keyUri !== "string" ||
		!parseFilesHlsAes128KeyUri(keyUri)
	) {
		return null;
	}

	return {
		algorithm,
		ivHex: ivHex.toLowerCase(),
		keyId,
		keyUri,
	};
}

export function isFilesHlsManifestArtifact(
	artifact: Pick<FilesArtifactRecord, "contentType" | "kind">,
) {
	return (
		artifact.kind === "hls-master-manifest" ||
		artifact.kind === "hls-rendition-manifest" ||
		artifact.contentType === "application/vnd.apple.mpegurl"
	);
}

function normalizePlaybackBasePath(basePath: string) {
	return `/${basePath.replace(/^\/+|\/+$/g, "")}`;
}

function isSafeKeyId(keyId: string) {
	return keyId.length > 0 && !keyId.includes("/") && !keyId.includes("..");
}

function isHex(value: string, byteLength: number) {
	return new RegExp(`^[0-9a-f]{${byteLength * 2}}$`, "iu").test(value);
}
