import { describe, expect, it } from "vitest";

import {
	serializeLmsFileArtifactGroupRecord,
	serializeLmsFileArtifactRecord,
	serializeLmsFilePlaybackEventRecord,
	serializeLmsFilePlaybackSessionRecord,
	serializeLmsFileRecord,
	serializeLmsFileVariantRecord,
	serializeLmsProcessingJobRecord,
	serializeLmsUploadPartRecord,
	serializeLmsUploadSessionRecord,
} from "./files-repositories";

const now = new Date("2026-06-02T08:00:00.000Z");

describe("LMS files repository serializers", () => {
	it("serializes file rows to the platform file record contract", () => {
		const record = serializeLmsFileRecord({
			bucketName: "private-files",
			contentType: "image/png",
			createdAt: now,
			deletedAt: null,
			fileName: "avatar.png",
			id: "file_1",
			key: "users/user_1/avatar.png",
			kind: "image",
			metadata: { width: 120 },
			size: 1200,
			status: "ready",
			updatedAt: now,
			userId: "user_1",
			visibility: "private",
		});

		expect(record).toEqual({
			accessUrl: null,
			bucketName: "private-files",
			contentType: "image/png",
			createdAt: now,
			deletedAt: null,
			fileName: "avatar.png",
			id: "file_1",
			key: "users/user_1/avatar.png",
			kind: "image",
			metadata: { width: 120 },
			size: 1200,
			status: "ready",
			updatedAt: now,
			userId: "user_1",
			visibility: "private",
		});
	});

	it("serializes upload sessions, parts, variants, and jobs", () => {
		expect(
			serializeLmsUploadSessionRecord({
				createdAt: now,
				expiresAt: now,
				fileId: "file_1",
				id: "session_1",
				protocol: "s3-multipart",
				status: "active",
				updatedAt: now,
				userId: "user_1",
			}),
		).toMatchObject({
			fileId: "file_1",
			id: "session_1",
			protocol: "s3-multipart",
		});

		expect(
			serializeLmsUploadPartRecord({
				checksum: "sha256:value",
				createdAt: now,
				etag: "etag-1",
				fileId: "file_1",
				id: "part_1",
				partNumber: 1,
				sessionId: "session_1",
				size: 1024,
				updatedAt: now,
			}),
		).toMatchObject({
			etag: "etag-1",
			partNumber: 1,
			sessionId: "session_1",
		});

		expect(
			serializeLmsFileVariantRecord({
				bucketName: "public-files",
				contentType: "image/webp",
				createdAt: now,
				deletedAt: null,
				fileId: "file_1",
				height: 200,
				id: "variant_1",
				key: "variants/avatar.webp",
				kind: "thumbnail",
				metadata: null,
				size: 512,
				status: "ready",
				updatedAt: now,
				width: 200,
			}),
		).toMatchObject({
			fileId: "file_1",
			kind: "thumbnail",
			width: 200,
		});

		expect(
			serializeLmsProcessingJobRecord({
				attempts: 0,
				createdAt: now,
				error: null,
				fileId: "file_1",
				id: "job_1",
				input: null,
				kind: "thumbnail",
				output: null,
				runAfter: null,
				status: "queued",
				updatedAt: now,
			}),
		).toMatchObject({
			fileId: "file_1",
			id: "job_1",
			status: "queued",
		});
	});

	it("serializes artifact groups, artifacts, playback sessions, and QoE events", () => {
		expect(
			serializeLmsFileArtifactGroupRecord({
				bucketName: "private-files",
				createdAt: now,
				deletedAt: null,
				fileId: "file_1",
				id: "group_1",
				kind: "hls",
				metadata: { preset: "balanced" },
				revision: 1,
				status: "ready",
				storagePrefix: "files/file_1/artifacts/group_1/rev-1",
				updatedAt: now,
				visibility: "private",
			}),
		).toMatchObject({
			fileId: "file_1",
			kind: "hls",
			revision: 1,
		});

		expect(
			serializeLmsFileArtifactRecord({
				bucketName: "private-files",
				contentType: "application/vnd.apple.mpegurl",
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
				size: 512,
				sortOrder: 0,
				status: "ready",
				updatedAt: now,
				width: null,
			}),
		).toMatchObject({
			groupId: "group_1",
			kind: "hls-master-manifest",
			sortOrder: 0,
		});

		expect(
			serializeLmsFilePlaybackSessionRecord({
				artifactGroupId: "group_1",
				createdAt: now,
				expiresAt: now,
				fileId: "file_1",
				id: "playback_1",
				issuedAt: now,
				metadata: null,
				protectionMode: "signed-session",
				status: "active",
				subjectUserId: "user_1",
				token: "token_1234567890123456",
				updatedAt: now,
			}),
		).toMatchObject({
			artifactGroupId: "group_1",
			protectionMode: "signed-session",
			subjectId: "user_1",
		});

		expect(
			serializeLmsFilePlaybackEventRecord({
				artifactGroupId: "group_1",
				bufferedSeconds: 12,
				createdAt: now,
				durationSeconds: 120,
				eventKind: "buffering",
				fileId: "file_1",
				id: "event_1",
				metadata: { reason: "network" },
				occurredAt: now,
				playbackSessionId: "playback_1",
				positionSeconds: 30,
				renditionLabel: "720p",
				subjectUserId: "user_1",
			}),
		).toMatchObject({
			eventKind: "buffering",
			positionSeconds: 30,
			subjectId: "user_1",
		});
	});
});
