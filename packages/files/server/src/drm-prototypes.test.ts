import { describe, expect, it } from "vitest";

import {
	createDisabledFilesDrmPrototype,
	createFilesCloudflareStreamDrmPrototype,
	createFilesSelfOwnedR2ShakaDrmPrototype,
	summarizeFilesDrmPrototypeTradeoff,
} from "./drm-prototypes";

describe("DRM prototype descriptors", () => {
	it("keeps self-owned and managed DRM paths behind explicit prototype flags", () => {
		const selfOwned = createFilesSelfOwnedR2ShakaDrmPrototype({
			enabled: true,
			licenseServerUrl: "https://license.example.test/widevine",
			manifestUrl: "/api/files/playback/hls/token/master.m3u8",
			protectionSystems: ["widevine"],
		});
		const managed = createFilesCloudflareStreamDrmPrototype({
			enabled: true,
			playbackId: "stream_1",
			signedTokenUrl: "/api/files/drm/cloudflare-stream/token",
		});

		expect(selfOwned).toMatchObject({
			kind: "self-owned-r2-shaka",
			status: "prototype",
		});
		expect(managed).toMatchObject({
			kind: "cloudflare-stream-managed",
			status: "prototype",
		});
		expect(summarizeFilesDrmPrototypeTradeoff(selfOwned)).toMatchObject({
			providerLockIn: "low",
			recommendation: "prototype-only",
		});
		expect(summarizeFilesDrmPrototypeTradeoff(managed)).toMatchObject({
			providerLockIn: "high",
			recommendation: "prototype-only",
		});
	});

	it("creates disabled descriptors without provider details", () => {
		expect(createDisabledFilesDrmPrototype("self-owned-r2-shaka")).toEqual({
			kind: "self-owned-r2-shaka",
			licenseServerUrl: null,
			manifestUrl: null,
			protectionSystems: [],
			status: "disabled",
		});
		expect(createDisabledFilesDrmPrototype("cloudflare-stream-managed")).toEqual({
			kind: "cloudflare-stream-managed",
			playbackId: null,
			signedTokenUrl: null,
			status: "disabled",
		});
	});
});
