import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	createMediaAccessUrl,
	createMediaObjectResponse,
	createStorageKey,
	getConfiguredMediaBucket,
	getMediaBucket,
	getMediaBucketName,
	getMediaStorageProvider,
	getPublicMediaDirectUrl,
	MediaBindingsUnavailableError,
} from "./media-storage";

type TestBucket = {
	delete: ReturnType<typeof vi.fn>;
	get: ReturnType<typeof vi.fn>;
	put: ReturnType<typeof vi.fn>;
};

function createBucket(): TestBucket {
	return {
		delete: vi.fn(),
		get: vi.fn(),
		put: vi.fn(),
	};
}

function createEvent(options?: {
	privateBucket?: TestBucket;
	privateBucketName?: string;
	publicBucket?: TestBucket;
	publicBucketName?: string;
	publicDevDomain?: string;
	url?: string;
}) {
	const privateBucket = options?.privateBucket;
	const publicBucket = options?.publicBucket;
	const request = {
		headers: new Headers(),
		runtime: {
			cloudflare: {
				env: {
					PRIVATE_MEDIA_BUCKET: privateBucket,
					PRIVATE_MEDIA_BUCKET_NAME: options?.privateBucketName,
					PUBLIC_MEDIA_BUCKET: publicBucket,
					PUBLIC_MEDIA_BUCKET_NAME: options?.publicBucketName,
					PUBLIC_MEDIA_DEV_DOMAIN: options?.publicDevDomain,
				},
			},
		},
		url: options?.url ?? "https://lms.local/dashboard",
	} as unknown as Request;

	return {
		request,
	} as const;
}

const originalMediaStorageDriver = process.env.APP_LMS_MEDIA_STORAGE_DRIVER;
const originalMediaLocalRoot = process.env.APP_LMS_MEDIA_LOCAL_ROOT;
const originalMediaS3AccessKeyId = process.env.APP_LMS_MEDIA_S3_ACCESS_KEY_ID;
const originalMediaS3Endpoint = process.env.APP_LMS_MEDIA_S3_ENDPOINT;
const originalMediaS3ForcePathStyle = process.env.APP_LMS_MEDIA_S3_FORCE_PATH_STYLE;
const originalMediaS3PrivateBucket = process.env.APP_LMS_MEDIA_S3_PRIVATE_BUCKET;
const originalMediaS3PublicBucket = process.env.APP_LMS_MEDIA_S3_PUBLIC_BUCKET;
const originalMediaS3Region = process.env.APP_LMS_MEDIA_S3_REGION;
const originalMediaS3SecretAccessKey = process.env.APP_LMS_MEDIA_S3_SECRET_ACCESS_KEY;

describe("media-storage", () => {
	let localMediaRoot: string | null = null;

	beforeEach(() => {
		process.env.APP_LMS_MEDIA_STORAGE_DRIVER = "r2";
		vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
			"11111111-1111-4111-8111-111111111111",
		);
	});

	afterEach(async () => {
		if (localMediaRoot) {
			await rm(localMediaRoot, { force: true, recursive: true });
			localMediaRoot = null;
		}

		if (originalMediaStorageDriver == null) {
			delete process.env.APP_LMS_MEDIA_STORAGE_DRIVER;
		} else {
			process.env.APP_LMS_MEDIA_STORAGE_DRIVER = originalMediaStorageDriver;
		}

		if (originalMediaLocalRoot == null) {
			delete process.env.APP_LMS_MEDIA_LOCAL_ROOT;
		} else {
			process.env.APP_LMS_MEDIA_LOCAL_ROOT = originalMediaLocalRoot;
		}

		if (originalMediaS3AccessKeyId == null) {
			delete process.env.APP_LMS_MEDIA_S3_ACCESS_KEY_ID;
		} else {
			process.env.APP_LMS_MEDIA_S3_ACCESS_KEY_ID = originalMediaS3AccessKeyId;
		}

		if (originalMediaS3Endpoint == null) {
			delete process.env.APP_LMS_MEDIA_S3_ENDPOINT;
		} else {
			process.env.APP_LMS_MEDIA_S3_ENDPOINT = originalMediaS3Endpoint;
		}

		if (originalMediaS3ForcePathStyle == null) {
			delete process.env.APP_LMS_MEDIA_S3_FORCE_PATH_STYLE;
		} else {
			process.env.APP_LMS_MEDIA_S3_FORCE_PATH_STYLE = originalMediaS3ForcePathStyle;
		}

		if (originalMediaS3PrivateBucket == null) {
			delete process.env.APP_LMS_MEDIA_S3_PRIVATE_BUCKET;
		} else {
			process.env.APP_LMS_MEDIA_S3_PRIVATE_BUCKET = originalMediaS3PrivateBucket;
		}

		if (originalMediaS3PublicBucket == null) {
			delete process.env.APP_LMS_MEDIA_S3_PUBLIC_BUCKET;
		} else {
			process.env.APP_LMS_MEDIA_S3_PUBLIC_BUCKET = originalMediaS3PublicBucket;
		}

		if (originalMediaS3Region == null) {
			delete process.env.APP_LMS_MEDIA_S3_REGION;
		} else {
			process.env.APP_LMS_MEDIA_S3_REGION = originalMediaS3Region;
		}

		if (originalMediaS3SecretAccessKey == null) {
			delete process.env.APP_LMS_MEDIA_S3_SECRET_ACCESS_KEY;
		} else {
			process.env.APP_LMS_MEDIA_S3_SECRET_ACCESS_KEY = originalMediaS3SecretAccessKey;
		}

		vi.restoreAllMocks();
	});

	it("creates a namespaced storage key with sanitized filename", () => {
		const now = new Date();
		const expectedDatePath = [
			now.getUTCFullYear(),
			String(now.getUTCMonth() + 1).padStart(2, "0"),
			String(now.getUTCDate()).padStart(2, "0"),
		].join("/");

		const key = createStorageKey({
			fileName: ' Lecture Notes "Week 1" .PDF ',
			userId: "user_42",
			visibility: "private",
		});

		expect(key).toBe(
			`user_42/${expectedDatePath}/private-11111111-1111-4111-8111-111111111111-lecture-notes-week-1-.pdf`,
		);
	});

	it("reads bucket bindings and names from the request runtime", async () => {
		const publicBucket = createBucket();
		const privateBucket = createBucket();
		const event = createEvent({
			publicBucket,
			publicBucketName: "public-media",
			privateBucket,
			privateBucketName: "private-media",
		});
		const provider = getMediaStorageProvider(event);
		const publicAdapter = getMediaBucket(event, "public");
		const privateAdapter = getMediaBucket(event, "private");

		await publicAdapter.get("user_42/media/public/photo.png");
		await privateAdapter.get("user_42/media/private/notes.png");

		expect(publicBucket.get).toHaveBeenCalledWith("user_42/media/public/photo.png");
		expect(privateBucket.get).toHaveBeenCalledWith("user_42/media/private/notes.png");
		expect(getMediaBucketName(event, "public")).toBe("public-media");
		expect(getMediaBucketName(event, "private")).toBe("private-media");
		expect(provider.getBucketName("public")).toBe("public-media");
		expect(provider.getBucketName("private")).toBe("private-media");
	});

	it("throws when an r2 request is missing the requested bucket binding", async () => {
		const publicBucket = createBucket();
		const event = createEvent({
			publicBucket,
			publicBucketName: "public-media",
		});
		const publicAdapter = getMediaBucket(event, "public");
		const privateAdapter = getMediaBucket(event, "private");

		await publicAdapter.get("user_42/media/public/photo.png");
		expect(publicBucket.get).toHaveBeenCalledWith("user_42/media/public/photo.png");

		await expect(privateAdapter.get("user_42/media/private/photo.png")).rejects.toBeInstanceOf(
			MediaBindingsUnavailableError,
		);
	});

	it("builds public URLs from the active request and dev domain", () => {
		const publicBucket = createBucket();
		const event = createEvent({
			publicBucket,
			publicDevDomain: "public-media.example.dev",
			url: "https://app.example.dev/media",
		});

		expect(createMediaAccessUrl(event, "public", "user_42/asset.png")).toBe(
			"https://app.example.dev/api/media/public/user_42/asset.png",
		);
		expect(getPublicMediaDirectUrl(event, "user_42/asset.png")).toBe(
			"https://public-media.example.dev/user_42/asset.png",
		);
	});

	it("returns null for a direct public URL when no dev domain is bound", () => {
		const event = createEvent();

		expect(getPublicMediaDirectUrl(event, "user_42/asset.png")).toBeNull();
	});

	it("falls back to S3 bucket names and direct URL when runtime bindings are unavailable", () => {
		process.env.APP_LMS_MEDIA_STORAGE_DRIVER = "r2";
		process.env.APP_LMS_MEDIA_S3_ENDPOINT = "https://s3.example.test";
		process.env.APP_LMS_MEDIA_S3_PUBLIC_BUCKET = "public-media";
		process.env.APP_LMS_MEDIA_S3_PRIVATE_BUCKET = "private-media";
		process.env.APP_LMS_MEDIA_S3_FORCE_PATH_STYLE = "true";

		const event = createEvent();
		const provider = getMediaStorageProvider(event);

		expect(provider.driver).toBe("r2");
		expect(provider.getBucketName("public")).toBe("public-media");
		expect(provider.getBucketName("private")).toBe("private-media");
		expect(getMediaBucketName(event, "public")).toBe("public-media");
		expect(getMediaBucketName(event, "private")).toBe("private-media");
		expect(getPublicMediaDirectUrl(event, "user_42/asset.png")).toBe(
			"https://s3.example.test/public-media/user_42/asset.png",
		);
	});

	it("persists local object metadata for the configured local driver", async () => {
		process.env.APP_LMS_MEDIA_STORAGE_DRIVER = "local";
		localMediaRoot = await mkdtemp(join(tmpdir(), "lms-media-storage-"));
		process.env.APP_LMS_MEDIA_LOCAL_ROOT = localMediaRoot;

		const bucket = getConfiguredMediaBucket("private");
		const key = "user_42/seed/private/grading-notes.json";

		expect(bucket).not.toBeNull();
		if (!bucket) {
			throw new Error("Expected a configured local media bucket for the local driver.");
		}

		await bucket.put(key, '{"status":"ok"}', {
			httpMetadata: {
				contentDisposition: 'inline; filename="grading-notes.json"',
				contentType: "application/json",
			},
		});

		const object = await bucket.get(key);

		expect(object).not.toBeNull();
		if (!object) {
			throw new Error("Expected the local media object to be persisted.");
		}

		expect(object.httpMetadata).toMatchObject({
			contentDisposition: 'inline; filename="grading-notes.json"',
			contentType: "application/json",
		});

		const response = createMediaObjectResponse(object, "private");

		expect(response.headers.get("content-disposition")).toBe(
			'inline; filename="grading-notes.json"',
		);
		expect(response.headers.get("content-type")).toBe("application/json");
		expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
		expect(await new Response(response.body).text()).toBe('{"status":"ok"}');
	});

	it("applies default headers and public cache policy when streaming an object", async () => {
		const response = createMediaObjectResponse(
			{
				body: new ReadableStream<Uint8Array>(),
				httpEtag: '"etag-1"',
			},
			"public",
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("application/octet-stream");
		expect(response.headers.get("etag")).toBe('"etag-1"');
		expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
	});

	it("overrides cache headers for private media responses", () => {
		const response = createMediaObjectResponse(
			{
				body: new ReadableStream<Uint8Array>(),
				writeHttpMetadata(headers) {
					headers.set("content-type", "image/png");
					headers.set("cache-control", "public, max-age=60");
				},
			},
			"private",
		);

		expect(response.headers.get("content-type")).toBe("image/png");
		expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
	});
});
