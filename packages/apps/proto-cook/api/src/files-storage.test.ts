import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const awsMocks = vi.hoisted(() => ({
	getSignedUrl: vi.fn(),
	send: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => ({
	CreateMultipartUploadCommand: class CreateMultipartUploadCommand {
		constructor(public readonly input: unknown) {}
	},
	PutObjectCommand: class PutObjectCommand {
		constructor(public readonly input: unknown) {}
	},
	S3Client: vi.fn(() => ({
		send: awsMocks.send,
	})),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
	getSignedUrl: awsMocks.getSignedUrl,
}));

import { createFilesStorageUploadTarget, getFilesStorageBackend } from "./files-storage";

const request = new Request("https://app.test/en/files") as unknown as Request;

function stubS3Env(provider: "minio" | "r2") {
	vi.stubEnv("APP_PROTO_COOK_FILES_STORAGE_DRIVER", "s3");
	vi.stubEnv("APP_PROTO_COOK_FILES_S3_PROVIDER", provider);
	vi.stubEnv("APP_PROTO_COOK_FILES_S3_ENDPOINT", "http://127.0.0.1:9000");
	vi.stubEnv("APP_PROTO_COOK_FILES_S3_REGION", provider === "r2" ? "auto" : "us-east-1");
	vi.stubEnv("APP_PROTO_COOK_FILES_S3_ACCESS_KEY_ID", "access_key");
	vi.stubEnv("APP_PROTO_COOK_FILES_S3_SECRET_ACCESS_KEY", "secret_key");
	vi.stubEnv("APP_PROTO_COOK_FILES_S3_PUBLIC_BUCKET", "proto-cook-public-files");
	vi.stubEnv("APP_PROTO_COOK_FILES_S3_PRIVATE_BUCKET", "proto-cook-private-files");
	vi.stubEnv("APP_PROTO_COOK_FILES_S3_FORCE_PATH_STYLE", "true");
}

describe("Proto Cook files storage upload targets", () => {
	beforeEach(() => {
		awsMocks.getSignedUrl.mockResolvedValue("https://storage.test/signed-put");
		awsMocks.send.mockResolvedValue({ UploadId: "multipart_1" });
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.clearAllMocks();
	});

	it("maps local and S3-compatible env profiles to planner backends", () => {
		vi.stubEnv("APP_PROTO_COOK_FILES_STORAGE_DRIVER", "local");
		expect(getFilesStorageBackend(request)).toBe("local-fs");

		stubS3Env("minio");
		expect(getFilesStorageBackend(request)).toBe("minio-s3");

		stubS3Env("r2");
		expect(getFilesStorageBackend(request)).toBe("r2-s3");
	});

	it("creates local server upload targets for XHR and Tus", async () => {
		vi.stubEnv("APP_PROTO_COOK_FILES_STORAGE_DRIVER", "local");

		await expect(
			createFilesStorageUploadTarget(request, {
				contentType: "video/mp4",
				expiresInSeconds: 3600,
				key: "user/video.mp4",
				protocol: "tus",
				sessionId: "session_1",
				targetId: "target_1",
				visibility: "private",
			}),
		).resolves.toMatchObject({
			method: "POST",
			protocol: "tus",
			uploadUrl: "https://app.test/api/files/upload/tus/session_1",
		});
	});

	it("creates presigned single-part S3 upload targets", async () => {
		stubS3Env("minio");

		await expect(
			createFilesStorageUploadTarget(request, {
				contentType: "image/png",
				expiresInSeconds: 3600,
				key: "user/avatar.png",
				protocol: "s3-put",
				sessionId: "session_1",
				targetId: "target_1",
				visibility: "public",
			}),
		).resolves.toMatchObject({
			method: "PUT",
			protocol: "s3-put",
			uploadUrl: "https://storage.test/signed-put",
		});
		expect(awsMocks.getSignedUrl).toHaveBeenCalledOnce();
	});

	it("creates multipart S3 upload targets with provider upload ids", async () => {
		stubS3Env("r2");

		await expect(
			createFilesStorageUploadTarget(request, {
				contentType: "video/mp4",
				expiresInSeconds: 3600,
				key: "user/lesson.mp4",
				protocol: "s3-multipart",
				sessionId: "session_1",
				targetId: "target_1",
				visibility: "private",
			}),
		).resolves.toMatchObject({
			fields: {
				bucket: "proto-cook-private-files",
				key: "user/lesson.mp4",
				uploadId: "multipart_1",
			},
			method: "POST",
			protocol: "s3-multipart",
			uploadUrl: "https://app.test/api/files/upload/s3-multipart/session_1",
		});
		expect(awsMocks.send).toHaveBeenCalledOnce();
	});
});
