import type { FilesArtifactGroupRecord, FilesArtifactRecord } from "@de100/files-shared";
import { describe, expect, it } from "vitest";

import {
	createArtifactRelativePath,
	createFilesHlsPlaybackSource,
	findFilesHlsPlaybackArtifact,
} from "./hls-playback-source";

const now = new Date("2026-06-07T08:00:00.000Z");

describe("HLS playback source helpers", () => {
	it("creates token-scoped master and caption URLs from ready artifacts", () => {
		const source = createFilesHlsPlaybackSource({
			artifactGroup: createArtifactGroup(),
			artifacts: [
				createArtifact({
					id: "master",
					key: "files/file_1/artifacts/group_1/rev-1/master.m3u8",
					kind: "hls-master-manifest",
					sortOrder: 0,
				}),
				createArtifact({
					id: "caption",
					key: "files/file_1/artifacts/group_1/rev-1/captions/en.vtt",
					kind: "caption",
					metadata: {
						default: true,
						kind: "subtitles",
						label: "English",
						language: "en",
					},
					sortOrder: 4,
				}),
			],
			session: {
				id: "session_1",
				token: "signed token",
			},
		});

		expect(source).toMatchObject({
			masterArtifactId: "master",
			masterUrl: "/api/files/playback/hls/signed%20token/master.m3u8",
			sessionId: "session_1",
		});
		expect(source?.captionTracks).toEqual([
			{
				default: true,
				kind: "subtitles",
				label: "English",
				language: "en",
				src: "/api/files/playback/hls/signed%20token/captions/en.vtt",
			},
		]);
	});

	it("finds ready playback artifacts by relative request path", () => {
		const artifactGroup = createArtifactGroup();
		const artifact = createArtifact({
			key: "files/file_1/artifacts/group_1/rev-1/720p/segment-0.ts",
			kind: "hls-segment",
		});

		expect(createArtifactRelativePath(artifactGroup, artifact)).toBe("720p/segment-0.ts");
		expect(
			findFilesHlsPlaybackArtifact({
				artifactGroup,
				artifacts: [artifact],
				path: "/720p/segment-0.ts",
			})?.id,
		).toBe(artifact.id);
	});

	it("rejects unsafe playback paths", () => {
		expect(
			findFilesHlsPlaybackArtifact({
				artifactGroup: createArtifactGroup(),
				artifacts: [],
				path: "../secret",
			}),
		).toBeNull();
	});
});

function createArtifactGroup(): FilesArtifactGroupRecord {
	return {
		bucketName: "private-files",
		createdAt: now,
		deletedAt: null,
		fileId: "file_1",
		id: "group_1",
		kind: "hls",
		metadata: null,
		revision: 1,
		status: "ready",
		storagePrefix: "files/file_1/artifacts/group_1/rev-1",
		updatedAt: now,
		visibility: "private",
	};
}

function createArtifact(input: Partial<FilesArtifactRecord>): FilesArtifactRecord {
	return {
		bucketName: "private-files",
		contentType: input.kind === "caption" ? "text/vtt" : "application/vnd.apple.mpegurl",
		createdAt: now,
		deletedAt: null,
		durationMs: null,
		fileId: "file_1",
		groupId: "group_1",
		height: null,
		id: "artifact_1",
		key: "files/file_1/artifacts/group_1/rev-1/master.m3u8",
		kind: "hls-master-manifest",
		metadata: null,
		renditionLabel: null,
		size: 100,
		sortOrder: 0,
		status: "ready",
		updatedAt: now,
		width: null,
		...input,
	};
}
