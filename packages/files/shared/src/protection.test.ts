import { describe, expect, it } from "vitest";

import {
	createFilesHlsAes128KeyUri,
	filesDrmPrototypeDescriptorSchema,
	filesHlsAes128KeyReferenceSchema,
	normalizeFilesAes128Hex,
	parseFilesHlsAes128KeyUri,
} from "./protection";

describe("files protection contracts", () => {
	it("creates and parses safe HLS AES-128 key URIs", () => {
		const uri = createFilesHlsAes128KeyUri("key 1");

		expect(uri).toBe("de100-hls-key://key%201");
		expect(parseFilesHlsAes128KeyUri(uri)).toBe("key 1");
		expect(parseFilesHlsAes128KeyUri("https://example.test/key")).toBeNull();
		expect(() => createFilesHlsAes128KeyUri("../key")).toThrow("single safe path segment");
	});

	it("validates AES-128 key references and DRM prototype descriptors", () => {
		expect(
			filesHlsAes128KeyReferenceSchema.parse({
				algorithm: "AES-128",
				ivHex: "00000000000000000000000000000001",
				keyId: "key_1",
				keyUri: "de100-hls-key://key_1",
			}),
		).toMatchObject({ keyId: "key_1" });
		expect(normalizeFilesAes128Hex("A".repeat(32), 16)).toBe("a".repeat(32));
		expect(() => normalizeFilesAes128Hex("abc", 16)).toThrow("16 bytes");

		expect(
			filesDrmPrototypeDescriptorSchema.parse({
				kind: "self-owned-r2-shaka",
				licenseServerUrl: "https://license.example.test",
				manifestUrl: null,
				protectionSystems: ["widevine"],
				status: "prototype",
			}),
		).toMatchObject({ kind: "self-owned-r2-shaka" });
		expect(
			filesDrmPrototypeDescriptorSchema.parse({
				kind: "cloudflare-stream-managed",
				playbackId: null,
				signedTokenUrl: null,
				status: "disabled",
			}),
		).toMatchObject({ kind: "cloudflare-stream-managed" });
	});
});
