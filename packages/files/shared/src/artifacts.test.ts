import { describe, expect, it } from "vitest";

import {
	filesArtifactRecordSchema,
	filesBalancedCourseHlsPreset,
	filesCreateArtifactGroupInputSchema,
	filesHlsPresetSchema,
	filesSignedHlsPlaybackSessionSchema,
} from "./artifacts";

describe("files artifact contracts", () => {
	it("accepts a balanced course HLS preset with source-aware rendition skipping", () => {
		expect(filesBalancedCourseHlsPreset.renditions.map((rendition) => rendition.label)).toEqual([
			"480p",
			"720p",
			"1080p",
		]);
		expect(filesBalancedCourseHlsPreset.segmentFormat).toBe("mpeg-ts");
		expect(filesBalancedCourseHlsPreset.skipRenditionsAboveSource).toBe(true);
	});

	it("rejects empty HLS rendition ladders", () => {
		expect(
			filesHlsPresetSchema.safeParse({
				renditions: [],
			}).success,
		).toBe(false);
	});

	it("models HLS as grouped artifacts instead of one variant record", () => {
		const group = filesCreateArtifactGroupInputSchema.parse({
			fileId: "file_1",
			kind: "hls",
			storagePrefix: "files/file_1/artifacts/group_1/rev_1",
			visibility: "private",
		});
		const artifact = filesArtifactRecordSchema.parse({
			bucketName: "private-files",
			contentType: "application/vnd.apple.mpegurl",
			createdAt: new Date("2026-06-07T00:00:00Z"),
			deletedAt: null,
			durationMs: null,
			fileId: "file_1",
			groupId: "group_1",
			height: null,
			id: "artifact_1",
			key: "files/file_1/artifacts/group_1/rev_1/master.m3u8",
			kind: "hls-master-manifest",
			metadata: null,
			renditionLabel: null,
			size: 512,
			sortOrder: 0,
			status: "ready",
			updatedAt: new Date("2026-06-07T00:00:00Z"),
			width: null,
		});

		expect(group.status).toBe("draft");
		expect(artifact.kind).toBe("hls-master-manifest");
	});

	it("requires playback session tokens to be non-trivial", () => {
		expect(
			filesSignedHlsPlaybackSessionSchema.safeParse({
				artifactGroupId: "group_1",
				expiresAt: new Date("2026-06-07T00:10:00Z"),
				fileId: "file_1",
				id: "playback_1",
				issuedAt: new Date("2026-06-07T00:00:00Z"),
				metadata: null,
				protectionMode: "signed-session",
				status: "active",
				subjectId: "user_1",
				token: "short",
			}).success,
		).toBe(false);
	});
});
