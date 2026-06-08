import type { FilesArtifactRecord } from "@de100/files-shared";
import { describe, expect, it } from "vitest";

import {
	createFilesHlsAes128KeyRequestPath,
	createFilesHlsAes128KeyUrl,
	findFilesHlsAes128KeyArtifact,
	isFilesHlsManifestArtifact,
	readFilesHlsAes128KeyRequestPath,
	rewriteFilesHlsAes128ManifestKeyUris,
} from "./hls-protection";

const now = new Date("2026-06-08T08:00:00.000Z");

describe("HLS protection helpers", () => {
	it("creates signed key URLs and parses key request paths", () => {
		expect(createFilesHlsAes128KeyUrl({ keyId: "key 1", token: "token 1" })).toBe(
			"/api/files/playback/hls/token%201/keys/key%201",
		);
		expect(createFilesHlsAes128KeyRequestPath("key 1")).toBe("keys/key%201");
		expect(readFilesHlsAes128KeyRequestPath("/keys/key%201")).toBe("key 1");
		expect(readFilesHlsAes128KeyRequestPath("/keys/../secret")).toBeNull();
		expect(readFilesHlsAes128KeyRequestPath("/720p/index.m3u8")).toBeNull();
	});

	it("rewrites package key URI placeholders in manifests", () => {
		const manifest = [
			"#EXTM3U",
			'#EXT-X-KEY:METHOD=AES-128,URI="de100-hls-key://key_1",IV=0x00000000000000000000000000000001',
			"segment-00001.ts",
			'#EXT-X-KEY:METHOD=AES-128,URI="https://cdn.example.test/key.bin"',
			"",
		].join("\n");

		expect(rewriteFilesHlsAes128ManifestKeyUris({ manifest, token: "token_1" })).toContain(
			'URI="/api/files/playback/hls/token_1/keys/key_1"',
		);
		expect(rewriteFilesHlsAes128ManifestKeyUris({ manifest, token: "token_1" })).toContain(
			'URI="https://cdn.example.test/key.bin"',
		);
	});

	it("finds ready HLS key artifacts through validated metadata", () => {
		const keyArtifact = createArtifact({
			kind: "hls-key",
			metadata: {
				algorithm: "AES-128",
				ivHex: "0".repeat(32),
				keyId: "key_1",
				keyUri: "de100-hls-key://key_1",
			},
		});

		expect(findFilesHlsAes128KeyArtifact({ artifacts: [keyArtifact], keyId: "key_1" })).toBe(
			keyArtifact,
		);
		expect(
			findFilesHlsAes128KeyArtifact({
				artifacts: [
					createArtifact({
						kind: "hls-key",
						metadata: { keyId: "key_1" },
					}),
				],
				keyId: "key_1",
			}),
		).toBeNull();
		expect(isFilesHlsManifestArtifact(createArtifact({ kind: "hls-rendition-manifest" }))).toBe(
			true,
		);
	});
});

function createArtifact(input: Partial<FilesArtifactRecord>): FilesArtifactRecord {
	return {
		bucketName: "private-files",
		contentType:
			input.kind === "hls-key" ? "application/octet-stream" : "application/vnd.apple.mpegurl",
		createdAt: now,
		deletedAt: null,
		durationMs: null,
		fileId: "file_1",
		groupId: "group_1",
		height: null,
		id: "artifact_1",
		key: "files/file_1/artifacts/group_1/rev-1/keys/key_1.key",
		kind: "hls-key",
		metadata: null,
		renditionLabel: null,
		size: 16,
		sortOrder: 0,
		status: "ready",
		updatedAt: now,
		width: null,
		...input,
	};
}
