import type { DbInstance } from "@de100/apps-proto-cook-db";
import { describe, expect, it } from "vitest";

import type { Context } from "./context";
import {
	createProtoCookFilesOrpcHandlers,
	protoCookDirectOrpcUploadMaxBytes,
	resolveProtoCookFilesUploadMode,
} from "./files-orpc";

const request = new Request("https://app.test/api/rpc/files");

function createContext(): Context & { db: DbInstance } {
	return {
		auth: null,
		db: {} as DbInstance,
		request: request as Context["request"],
		session: {
			session: {
				createdAt: new Date("2026-06-02T08:00:00.000Z"),
				expiresAt: new Date("2026-06-03T08:00:00.000Z"),
				id: "session_1",
				token: "token",
				updatedAt: new Date("2026-06-02T08:00:00.000Z"),
				userId: "user_1",
			},
			user: {
				createdAt: new Date("2026-06-02T08:00:00.000Z"),
				email: "user@example.test",
				emailVerified: true,
				id: "user_1",
				name: "User",
				updatedAt: new Date("2026-06-02T08:00:00.000Z"),
			},
		},
	};
}

describe("createProtoCookFilesOrpcHandlers", () => {
	it("uses the Proto Cook direct upload threshold for mode decisions", () => {
		const handlers = createProtoCookFilesOrpcHandlers({ context: createContext() });

		expect(
			handlers.resolveUploadMode({
				contentType: "image/png",
				fileSize: protoCookDirectOrpcUploadMaxBytes,
				routeSlug: "avatar",
			}),
		).toMatchObject({
			mode: "orpc-direct",
			protocol: "orpc-direct",
		});

		expect(
			handlers.resolveUploadMode({
				contentType: "video/mp4",
				fileSize: protoCookDirectOrpcUploadMaxBytes + 1,
				routeSlug: "lesson-video",
			}),
		).toMatchObject({
			mode: "upload-target",
			protocol: "tus",
		});
	});

	it("uses Proto Cook route config to pick MinIO/R2 multipart for course videos", () => {
		for (const storageBackend of ["minio-s3", "r2-s3"] as const) {
			expect(
				resolveProtoCookFilesUploadMode({
					contentType: "video/mp4",
					fileSize: 8 * 1024 * 1024,
					routeSlug: "lesson-video",
					storageBackend,
				}),
			).toMatchObject({
				mode: "upload-target",
				protocol: "s3-multipart",
				reason: "s3-compatible-multipart",
				storageBackend,
			});
		}
	});

	it("keeps local avatar uploads on direct oRPC while local course videos use resumable targets", () => {
		expect(
			resolveProtoCookFilesUploadMode({
				contentType: "image/png",
				fileSize: 1024,
				routeSlug: "avatar",
				storageBackend: "local-fs",
			}),
		).toMatchObject({
			mode: "orpc-direct",
			protocol: "orpc-direct",
		});

		expect(
			resolveProtoCookFilesUploadMode({
				contentType: "video/mp4",
				fileSize: 8 * 1024 * 1024,
				routeSlug: "lesson-video",
				storageBackend: "local-fs",
			}),
		).toMatchObject({
			deliveryStrategy: "range-http",
			mode: "upload-target",
			protocol: "tus",
			reason: "resumable-required",
		});
	});

	it("lets explicit lab/admin protocol overrides win", () => {
		expect(
			resolveProtoCookFilesUploadMode({
				contentType: "video/mp4",
				fileSize: 8 * 1024 * 1024,
				requestedProtocol: "xhr",
				routeSlug: "lesson-video",
				storageBackend: "minio-s3",
			}),
		).toMatchObject({
			mode: "upload-target",
			protocol: "xhr",
			reason: "direct-disabled",
		});
	});
});
