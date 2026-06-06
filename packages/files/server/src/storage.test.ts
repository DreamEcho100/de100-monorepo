import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const awsS3Mocks = vi.hoisted(() => ({
	getSignedUrl: vi.fn(),
	send: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => {
	class MockCommand {
		input: unknown;

		constructor(input: unknown) {
			this.input = input;
		}
	}

	return {
		CreateMultipartUploadCommand: MockCommand,
		DeleteObjectCommand: MockCommand,
		GetObjectCommand: MockCommand,
		PutObjectCommand: MockCommand,
		S3Client: class {
			send = awsS3Mocks.send;
		},
	};
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
	getSignedUrl: awsS3Mocks.getSignedUrl,
}));

import type { FilesStorageProvider } from "./storage";
import {
	createFileObjectResponse,
	createServerRoutedUploadTarget,
	createStorageProvider,
} from "./storage";

beforeEach(() => {
	awsS3Mocks.getSignedUrl.mockReset();
	awsS3Mocks.getSignedUrl.mockResolvedValue("https://uploads.example.test/presigned-put");
	awsS3Mocks.send.mockReset();
});

describe("local files storage provider", () => {
	it("stores, reads, and deletes objects", async () => {
		const root = await mkdtemp(join(tmpdir(), "de100-files-"));
		const provider = createStorageProvider({
			config: {
				root,
				type: "local",
			},
		});

		try {
			await provider.putObject({
				httpMetadata: { contentType: "text/plain" },
				key: "user_1/hello.txt",
				value: "hello",
				visibility: "private",
			});

			const object = await provider.getObject({
				key: "user_1/hello.txt",
				visibility: "private",
			});

			expect(object?.size).toBe(5);
			expect(object?.httpMetadata?.contentType).toBe("text/plain");

			await provider.deleteObject({
				key: "user_1/hello.txt",
				visibility: "private",
			});
			await expect(
				provider.getObject({
					key: "user_1/hello.txt",
					visibility: "private",
				}),
			).resolves.toBeNull();
		} finally {
			await rm(root, { force: true, recursive: true });
		}
	});

	it("creates server-routed XHR and Tus upload targets", async () => {
		const root = await mkdtemp(join(tmpdir(), "de100-files-"));
		const provider = createStorageProvider({
			config: {
				root,
				type: "local",
			},
			uploadRouteBasePath: "/api/files",
		});

		try {
			const xhrTarget = await provider.createUploadTarget({
				contentType: "text/plain",
				expiresInSeconds: 60,
				key: "user_1/hello.txt",
				method: "POST",
				protocol: "xhr",
				visibility: "private",
			});
			const tusTarget = await provider.createUploadTarget({
				contentType: "video/mp4",
				expiresInSeconds: 60,
				key: "user_1/video.mp4",
				method: "POST",
				protocol: "tus",
				visibility: "private",
			});

			expect(xhrTarget?.uploadUrl).toBe(
				"/api/files/upload/xhr?key=user_1%2Fhello.txt&visibility=private",
			);
			expect(xhrTarget?.headers).toEqual({ "content-type": "text/plain" });
			expect(tusTarget?.uploadUrl).toBe(
				"/api/files/upload/tus?key=user_1%2Fvideo.mp4&visibility=private",
			);
		} finally {
			await rm(root, { force: true, recursive: true });
		}
	});
});

describe("files storage provider factory", () => {
	it("requires an injected custom provider for custom storage config", () => {
		expect(() =>
			createStorageProvider({
				config: {
					providerId: "tenant-storage",
					type: "custom",
				},
			}),
		).toThrow("was not injected");
	});

	it("uses the injected custom provider", async () => {
		const customProvider: FilesStorageProvider = {
			async createUploadTarget() {
				return {
					expiresAt: null,
					fields: { token: "custom" },
					headers: null,
					method: "POST",
					uploadUrl: "https://uploads.example.test/custom",
				};
			},
			async deleteObject() {},
			getBucketName: () => "custom-bucket",
			async getObject() {
				return null;
			},
			getPublicUrl: () => null,
			id: "custom",
			async putObject() {},
		};

		const provider = createStorageProvider({
			config: {
				providerId: "tenant-storage",
				type: "custom",
			},
			customProvider,
		});

		await expect(
			provider.createUploadTarget({
				contentType: "application/octet-stream",
				expiresInSeconds: 60,
				key: "object.bin",
				method: "POST",
				protocol: "custom",
				visibility: "private",
			}),
		).resolves.toMatchObject({
			fields: { token: "custom" },
			uploadUrl: "https://uploads.example.test/custom",
		});
	});
});

describe("S3-compatible files storage provider", () => {
	const config = {
		accessKeyId: "key",
		buckets: {
			privateBucket: "private-files",
			publicBucket: "public-files",
		},
		endpoint: "https://s3.example.test",
		forcePathStyle: true,
		profile: "custom-s3",
		region: "auto",
		secretAccessKey: "secret",
		type: "s3",
	} as const;

	it("creates presigned PUT upload targets", async () => {
		const provider = createStorageProvider({ config });

		await expect(
			provider.createUploadTarget({
				contentType: "image/png",
				expiresInSeconds: 120,
				key: "avatars/user.png",
				method: "PUT",
				protocol: "s3-put",
				visibility: "public",
			}),
		).resolves.toMatchObject({
			fields: null,
			headers: { "content-type": "image/png" },
			method: "PUT",
			uploadUrl: "https://uploads.example.test/presigned-put",
		});
		expect(awsS3Mocks.getSignedUrl).toHaveBeenCalledOnce();
	});

	it("creates multipart upload targets with upload IDs", async () => {
		awsS3Mocks.send.mockResolvedValue({ UploadId: "multipart-1" });
		const provider = createStorageProvider({ config });

		await expect(
			provider.createUploadTarget({
				contentType: "video/mp4",
				expiresInSeconds: 120,
				key: "videos/lesson.mp4",
				method: "POST",
				protocol: "s3-multipart",
				visibility: "private",
			}),
		).resolves.toMatchObject({
			fields: {
				bucket: "private-files",
				key: "videos/lesson.mp4",
				uploadId: "multipart-1",
			},
			method: "POST",
			uploadUrl: "/api/files/upload/s3-multipart?key=videos%2Flesson.mp4&visibility=private",
		});
		expect(awsS3Mocks.send).toHaveBeenCalledOnce();
	});
});

describe("upload target helpers", () => {
	it("creates deterministic server-routed upload URLs", () => {
		const target = createServerRoutedUploadTarget(
			{
				contentType: "image/png",
				expiresInSeconds: 30,
				key: "/avatars/user.png",
				method: "PUT",
				protocol: "xhr",
				visibility: "public",
			},
			{ basePath: "api/files/" },
		);

		expect(target.method).toBe("PUT");
		expect(target.headers).toEqual({ "content-type": "image/png" });
		expect(target.fields).toBeNull();
		expect(target.uploadUrl).toBe(
			"/api/files/upload/xhr?key=%2Favatars%2Fuser.png&visibility=public",
		);
		expect(target.expiresAt).toBeInstanceOf(Date);
	});
});

describe("file object responses", () => {
	it("applies metadata and public cache defaults", async () => {
		const response = createFileObjectResponse(
			{
				body: "hello",
				httpEtag: '"abc"',
				httpMetadata: {
					cacheControl: "public, max-age=60",
					contentDisposition: "inline",
					contentType: "text/plain",
				},
				size: 5,
			},
			"public",
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("text/plain");
		expect(response.headers.get("content-disposition")).toBe("inline");
		expect(response.headers.get("cache-control")).toBe("public, max-age=60");
		expect(response.headers.get("content-length")).toBe("5");
		expect(response.headers.get("etag")).toBe('"abc"');
		expect(await response.text()).toBe("hello");
	});

	it("forces private responses to no-store", () => {
		const response = createFileObjectResponse(
			{
				body: null,
				httpMetadata: {
					cacheControl: "public, max-age=31536000",
				},
			},
			"private",
		);

		expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
	});
});
