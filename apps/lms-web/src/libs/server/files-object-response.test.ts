import { describe, expect, it } from "vitest";

import { createFilesObjectResponse, selectReadyFilesVariant } from "./files-object-response";

describe("createFilesObjectResponse", () => {
	it("serves byte ranges for file objects", async () => {
		const response = await createFilesObjectResponse(
			new Request("https://app.test/api/files/public/file.txt", {
				headers: {
					range: "bytes=2-5",
				},
			}),
			{
				body: "0123456789",
				httpMetadata: {
					contentType: "text/plain",
				},
				size: 10,
			},
			"public",
		);

		expect(response.status).toBe(206);
		expect(response.headers.get("content-range")).toBe("bytes 2-5/10");
		expect(response.headers.get("content-length")).toBe("4");
		expect(await response.text()).toBe("2345");
	});

	it("rejects unsatisfiable ranges", async () => {
		const response = await createFilesObjectResponse(
			new Request("https://app.test/api/files/public/file.txt", {
				headers: {
					range: "bytes=20-30",
				},
			}),
			{
				body: "0123456789",
				size: 10,
			},
			"public",
		);

		expect(response.status).toBe(416);
		expect(response.headers.get("content-range")).toBe("bytes */10");
	});

	it("selects only ready, live variants by kind", () => {
		const baseVariant = {
			bucketName: null,
			contentType: "image/webp",
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			fileId: "file_1",
			height: 200,
			id: "variant_1",
			key: "variants/file_1/thumb.webp",
			kind: "thumbnail",
			metadata: null,
			size: 1200,
			updatedAt: new Date("2026-01-01T00:00:00.000Z"),
			width: 200,
		};

		expect(
			selectReadyFilesVariant(
				[
					{
						...baseVariant,
						deletedAt: null,
						id: "draft_variant",
						status: "draft",
					},
					{
						...baseVariant,
						deletedAt: new Date("2026-01-02T00:00:00.000Z"),
						id: "deleted_variant",
						status: "ready",
					},
					{
						...baseVariant,
						deletedAt: null,
						id: "ready_variant",
						status: "ready",
					},
				],
				"thumbnail",
			)?.id,
		).toBe("ready_variant");

		expect(selectReadyFilesVariant([], "thumbnail")).toBeNull();
	});
});
