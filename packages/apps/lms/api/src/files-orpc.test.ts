import type { DbInstance } from "@de100/apps-lms-db";
import { describe, expect, it } from "vitest";

import type { Context } from "./context";
import { createLmsFilesOrpcHandlers, lmsDirectOrpcUploadMaxBytes } from "./files-orpc";

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

describe("createLmsFilesOrpcHandlers", () => {
	it("uses the LMS direct upload threshold for mode decisions", () => {
		const handlers = createLmsFilesOrpcHandlers({ context: createContext() });

		expect(
			handlers.resolveUploadMode({
				contentType: "image/png",
				fileSize: lmsDirectOrpcUploadMaxBytes,
				routeSlug: "avatar",
			}),
		).toMatchObject({
			mode: "orpc-direct",
			protocol: "orpc-direct",
		});

		expect(
			handlers.resolveUploadMode({
				contentType: "video/mp4",
				fileSize: lmsDirectOrpcUploadMaxBytes + 1,
				routeSlug: "lesson-video",
			}),
		).toMatchObject({
			mode: "upload-target",
			protocol: "tus",
		});
	});
});
