import { describe, expect, it } from "vitest";

import { isNetworkQualityAtLeast, selectUploadTransport } from "./transport-policy";

describe("uploader transport policy", () => {
	it("respects explicit transport mode selection", () => {
		const xhrDecision = selectUploadTransport(
			"xhr",
			{
				fileBytes: 1_000,
				networkQuality: "4g",
				supportsTus: true,
				supportsXhr: true,
			},
			{
				minNetworkQuality: "3g",
				preferTusWhenOnCellular: false,
				tusMinBytes: 10_000,
			},
		);

		expect(xhrDecision.transport).toBe("xhr");

		const tusDecision = selectUploadTransport(
			"tus",
			{
				fileBytes: 1_000,
				networkQuality: "4g",
				supportsTus: true,
				supportsXhr: true,
			},
			{
				minNetworkQuality: "3g",
				preferTusWhenOnCellular: false,
				tusMinBytes: 10_000,
			},
		);

		expect(tusDecision.transport).toBe("tus");
	});

	it("selects tus in auto mode for large files on sufficient networks", () => {
		const decision = selectUploadTransport(
			"auto",
			{
				fileBytes: 25 * 1024 * 1024,
				networkQuality: "4g",
				supportsTus: true,
				supportsXhr: true,
			},
			{
				minNetworkQuality: "3g",
				preferTusWhenOnCellular: true,
				tusMinBytes: 10 * 1024 * 1024,
			},
		);

		expect(decision.transport).toBe("tus");
	});

	it("falls back to xhr in auto mode for low-quality network or small files", () => {
		const smallFileDecision = selectUploadTransport(
			"auto",
			{
				fileBytes: 2 * 1024 * 1024,
				networkQuality: "4g",
				supportsTus: true,
				supportsXhr: true,
			},
			{
				minNetworkQuality: "3g",
				preferTusWhenOnCellular: true,
				tusMinBytes: 10 * 1024 * 1024,
			},
		);

		expect(smallFileDecision.transport).toBe("xhr");

		const slowNetworkDecision = selectUploadTransport(
			"auto",
			{
				fileBytes: 25 * 1024 * 1024,
				networkQuality: "2g",
				supportsTus: true,
				supportsXhr: true,
			},
			{
				minNetworkQuality: "3g",
				preferTusWhenOnCellular: true,
				tusMinBytes: 10 * 1024 * 1024,
			},
		);

		expect(slowNetworkDecision.transport).toBe("xhr");
	});

	it("compares network quality thresholds correctly", () => {
		expect(isNetworkQualityAtLeast("4g", "3g")).toBe(true);
		expect(isNetworkQualityAtLeast("2g", "3g")).toBe(false);
		expect(isNetworkQualityAtLeast("unknown", "2g")).toBe(true);
	});
});
