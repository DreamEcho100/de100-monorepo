import { describe, expect, it } from "vitest";

import { normalizeFileRouteConfig, normalizeFileRouteOptions } from "./route-config";

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
		});
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
