import { describe, expect, it } from "vitest";

import { storageProviderConfigSchema } from "./provider-config";

describe("storageProviderConfigSchema", () => {
	it("parses local provider config", () => {
		expect(
			storageProviderConfigSchema.parse({
				root: "./.local/files",
				type: "local",
			}),
		).toEqual({
			root: "./.local/files",
			type: "local",
		});
	});

	it("parses S3-compatible provider profiles", () => {
		expect(
			storageProviderConfigSchema.parse({
				buckets: {
					privateBucket: "private-files",
					publicBucket: "public-files",
				},
				forcePathStyle: true,
				profile: "r2",
				region: "auto",
				type: "s3",
			}),
		).toMatchObject({
			profile: "r2",
			type: "s3",
		});
	});
});
