import { describe, expect, it } from "vitest";

import {
	createUploadTargetInputSchema,
	createUploadTargetOutputSchema,
	fileRecordSchema,
	filesPlatformConfigSchema,
	filesUploadIntegrationSchema,
	filesUploadProtocolSchema,
} from "./schemas";

describe("files schemas", () => {
	it("parses file records", () => {
		expect(
			fileRecordSchema.parse({
				accessUrl: "/api/files/private/user_1/file.png",
				bucketName: "private-files",
				contentType: "image/png",
				createdAt: new Date("2026-06-02T00:00:00Z"),
				deletedAt: null,
				fileName: "file.png",
				id: "file_1",
				key: "user_1/file.png",
				kind: "image",
				metadata: { width: 100 },
				size: 10,
				status: "ready",
				updatedAt: new Date("2026-06-02T00:00:00Z"),
				userId: "user_1",
				visibility: "private",
			}),
		).toMatchObject({
			id: "file_1",
			status: "ready",
		});
	});

	it("parses upload target input and output contracts", () => {
		expect(
			createUploadTargetInputSchema.parse({
				contentType: "text/plain",
				fileName: "notes.txt",
				fileSize: 100,
				protocol: "xhr",
				routeSlug: "documentAsset",
			}),
		).toMatchObject({
			visibility: "private",
		});

		expect(
			createUploadTargetOutputSchema.parse({
				expiresAt: null,
				fields: null,
				headers: null,
				method: "PUT",
				protocol: "xhr",
				sessionId: "session_1",
				targetId: "target_1",
				uploadUrl: "/api/files/upload/session_1",
			}),
		).toMatchObject({
			method: "PUT",
			protocol: "xhr",
		});
	});

	it("separates upload protocols from integrations", () => {
		expect(filesUploadProtocolSchema.safeParse("xhr").success).toBe(true);
		expect(filesUploadProtocolSchema.safeParse("companion").success).toBe(false);
		expect(filesUploadProtocolSchema.safeParse("transloadit").success).toBe(false);
		expect(filesUploadIntegrationSchema.safeParse("companion").success).toBe(true);
		expect(filesUploadIntegrationSchema.safeParse("transloadit").success).toBe(true);
	});

	it("parses platform config", () => {
		expect(
			filesPlatformConfigSchema.parse({
				storage: {
					root: "./.local/files",
					type: "local",
				},
			}),
		).toMatchObject({
			storage: {
				type: "local",
			},
		});
	});
});
