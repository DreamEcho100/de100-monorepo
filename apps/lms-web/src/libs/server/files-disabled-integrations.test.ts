import { describe, expect, it } from "vitest";

import {
	createDisabledFilesIntegrationResponse,
	createUnknownFilesIntegrationResponse,
	isDisabledFilesIntegration,
} from "./files-disabled-integrations";

describe("files disabled integration contracts", () => {
	it("recognizes currently disabled provider integrations", () => {
		expect(isDisabledFilesIntegration("s3-multipart")).toBe(true);
		expect(isDisabledFilesIntegration("companion")).toBe(true);
		expect(isDisabledFilesIntegration("transloadit")).toBe(true);
		expect(isDisabledFilesIntegration("xhr")).toBe(false);
	});

	it("returns an explicit not-configured response", async () => {
		const response = createDisabledFilesIntegrationResponse("s3-multipart");
		const body = await response.json();

		expect(response.status).toBe(501);
		expect(body).toEqual({
			enabled: false,
			integration: "s3-multipart",
			message: "Files s3-multipart integration is not enabled for this deployment.",
			reason: "not-configured",
		});
	});

	it("returns a separate response for unknown integrations", async () => {
		const response = createUnknownFilesIntegrationResponse("unknown");
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.reason).toBe("unknown-integration");
	});
});
