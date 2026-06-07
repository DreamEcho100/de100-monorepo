import { describe, expect, it } from "vitest";

import {
	normalizeFileRouteConfig,
	normalizeFileRouteOptions,
	selectFileRouteRule,
} from "./route-config";

describe("normalizeFileRouteConfig", () => {
	it("fills defaults and parses file sizes", () => {
		const config = normalizeFileRouteConfig({
			image: {
				maxFileCount: 4,
				maxFileSize: "8MB",
			},
		});

		expect(config.image).toMatchObject({
			access: "private",
			contentDisposition: "inline",
			maxFileCount: 4,
			maxFileSizeBytes: 8 * 1024 * 1024,
			minFileCount: 1,
			protocols: ["auto"],
			requiresResumable: false,
		});
	});

	it("selects route rules by kind, MIME type, and MIME wildcard", () => {
		const config = normalizeFileRouteConfig({
			"application/pdf": {
				maxFileSize: "16MB",
			},
			"video/*": {
				maxFileSize: "2GB",
				requiresResumable: true,
			},
			image: {
				maxFileSize: "8MB",
			},
		});

		expect(selectFileRouteRule(config, { kind: "image" })).toMatchObject({
			maxFileSizeBytes: 8 * 1024 * 1024,
		});
		expect(selectFileRouteRule(config, { contentType: "application/pdf" })).toMatchObject({
			maxFileSizeBytes: 16 * 1024 * 1024,
		});
		expect(selectFileRouteRule(config, { contentType: "video/mp4" })).toMatchObject({
			requiresResumable: true,
		});
		expect(selectFileRouteRule(config, { contentType: "application/json" })).toBeNull();
	});

	it("rejects invalid counts", () => {
		expect(() =>
			normalizeFileRouteConfig({
				video: {
					maxFileCount: 1,
					minFileCount: 2,
				},
			}),
		).toThrow("minFileCount for video cannot exceed maxFileCount");
	});
});

describe("normalizeFileRouteOptions", () => {
	it("parses presigned URL TTL values", () => {
		expect(normalizeFileRouteOptions({ presignedUrlTtl: "2h" })).toEqual({
			awaitServerData: true,
			presignedUrlTtlSeconds: 7200,
		});
	});
});
