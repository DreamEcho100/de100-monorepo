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

	return {
		request: Object.assign(new Request(options?.url ?? "https://lms.local/dashboard"), {
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
		}),
	} as const;
}

const originalMediaStorageDriver = process.env.APP_LMS_MEDIA_STORAGE_DRIVER;
const originalMediaLocalRoot = process.env.APP_LMS_MEDIA_LOCAL_ROOT;

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

	it("reads bucket bindings and names from the request runtime", () => {
		const publicBucket = createBucket();
		const privateBucket = createBucket();
		const event = createEvent({
			publicBucket,
			publicBucketName: "public-media",
			privateBucket,
			privateBucketName: "private-media",
		});

		expect(getMediaBucket(event, "public")).toBe(publicBucket);
		expect(getMediaBucket(event, "private")).toBe(privateBucket);
		expect(getMediaBucketName(event, "public")).toBe("public-media");
		expect(getMediaBucketName(event, "private")).toBe("private-media");
	});

	it("throws when an r2 request is missing the requested bucket binding", () => {
		const publicBucket = createBucket();
		const event = createEvent({
			publicBucket,
			publicBucketName: "public-media",
		});

		expect(getMediaBucket(event, "public")).toBe(publicBucket);
		expect(() => getMediaBucket(event, "private")).toThrow(MediaBindingsUnavailableError);
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
