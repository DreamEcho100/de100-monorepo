import { describe, expect, it, vi } from "vitest";

import { createFilesClient } from "./client";

describe("createFilesClient", () => {
	it("requests upload targets through the configured control endpoint", async () => {
		const fetch = vi.fn(async () =>
			Response.json({
				expiresAt: null,
				fields: null,
				headers: null,
				method: "PUT",
				protocol: "xhr",
				sessionId: "session_1",
				targetId: "target_1",
				uploadUrl: "/api/files/upload/session_1",
			}),
		);
		const client = createFilesClient({
			baseUrl: "https://app.test/api/files",
			fetch: fetch as typeof globalThis.fetch,
		});

		await expect(
			client.createUploadTarget({
				contentType: "image/png",
				fileName: "avatar.png",
				fileSize: 10,
				protocol: "auto",
				routeSlug: "avatar",
				visibility: "private",
			}),
		).resolves.toMatchObject({
			sessionId: "session_1",
			targetId: "target_1",
		});

		expect(fetch).toHaveBeenCalledWith("https://app.test/api/files/targets", expect.any(Object));
	});
});
