import type { FileRecord } from "@de100/files-shared";
import { describe, expect, it } from "vitest";

import {
	canReadFileByDefault,
	canReadFilesSubjectWithEntitlements,
	canReadFileWithEntitlements,
} from "./entitlements";

const context = {
	app: {},
	auth: { role: "user", userId: "user_1" },
	request: new Request("https://example.com"),
};

describe("files entitlement helpers", () => {
	it("allows public ready files and owner private files by default", () => {
		expect(canReadFileByDefault(createFile({ visibility: "public" }), context)).toBe(true);
		expect(canReadFileByDefault(createFile({ visibility: "private" }), context)).toBe(true);
		expect(
			canReadFileByDefault(createFile({ userId: "other", visibility: "private" }), context),
		).toBe(false);
	});

	it("uses an injected file entitlement adapter when defaults deny access", async () => {
		await expect(
			canReadFileWithEntitlements({
				adapter: { canReadFile: () => true },
				context,
				file: createFile({ userId: "other", visibility: "private" }),
			}),
		).resolves.toBe(true);
	});

	it("allows preview subjects and delegates private subjects", async () => {
		await expect(
			canReadFilesSubjectWithEntitlements({
				context,
				subject: {
					id: "subject_1",
					preview: true,
					type: "video-lesson",
				},
			}),
		).resolves.toBe(true);
		await expect(
			canReadFilesSubjectWithEntitlements({
				adapter: { canReadFile: () => false, canReadSubject: () => true },
				context,
				subject: {
					id: "subject_1",
					preview: false,
					type: "video-lesson",
				},
			}),
		).resolves.toBe(true);
	});
});

function createFile(overrides: Partial<FileRecord> = {}): FileRecord {
	return {
		accessUrl: null,
		bucketName: "private-files",
		contentType: "video/mp4",
		createdAt: new Date("2026-06-07T00:00:00Z"),
		deletedAt: null,
		fileName: "lesson.mp4",
		id: "file_1",
		key: "users/user_1/lesson.mp4",
		kind: "video",
		metadata: null,
		size: 1024,
		status: "ready",
		updatedAt: new Date("2026-06-07T00:00:00Z"),
		userId: "user_1",
		visibility: "private",
		...overrides,
	};
}
