import { describe, expect, it } from "vitest";

import { createFilesRouteBuilder, createFilesRouter, extractFilesRouterConfig } from "./router";

describe("files router builder", () => {
	it("creates typed route definitions and extracts route config", async () => {
		const f = createFilesRouteBuilder;
		const router = createFilesRouter({
			imageAsset: f({ image: { maxFileSize: "4MB" } })
				.middleware(() => ({ ownerId: "user_1" }))
				.onUploadComplete(({ metadata }) => ({ ownerId: metadata.ownerId })),
		});

		expect(extractFilesRouterConfig(router)).toHaveLength(1);
		const route = router.imageAsset;
		expect(route).toBeDefined();
		await expect(
			Promise.resolve(
				route.onUploadComplete({
					context: {
						app: {},
						auth: { userId: "user_1" },
						request: new Request("https://app.test"),
					},
					file: {
						id: "file_1",
						key: "user_1/file.png",
						name: "file.png",
						size: 10,
						type: "image/png",
					},
					metadata: { ownerId: "user_1" },
				}),
			),
		).resolves.toEqual({ ownerId: "user_1" });
	});
});
