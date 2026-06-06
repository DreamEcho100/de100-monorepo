import { describe, expect, it } from "vitest";

import { issueFilesSignedAccessToken, verifyFilesSignedAccessToken } from "./signed-access";

const secret = "12345678901234567890123456789012";

describe("files signed access", () => {
	it("issues and verifies signed access tokens", async () => {
		const issued = await issueFilesSignedAccessToken({
			expiresInSeconds: 60,
			fileId: "file_1",
			secret,
			userId: "user_1",
		});

		await expect(
			verifyFilesSignedAccessToken({ secret, token: issued.token }),
		).resolves.toMatchObject({
			fileId: "file_1",
			purpose: "files-access",
			userId: "user_1",
		});
	});
});
