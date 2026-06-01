import { describe, expect, it } from "vitest";

import { resolveUploaderConfig } from "./contracts";
import { uploaderSupportedFileKinds } from "./defaults";

describe("uploader contracts", () => {
	it("applies defaults for unresolved config values", () => {
		const resolved = resolveUploaderConfig();

		expect(resolved.restrictions.allowedFileKinds).toEqual([...uploaderSupportedFileKinds]);
		expect(resolved.restrictions.maxFileBytes).toBe(50 * 1024 * 1024);
		expect(resolved.transport.mode).toBe("auto");
		expect(resolved.transport.auto.tusMinBytes).toBe(10 * 1024 * 1024);
		expect(resolved.persistence.driver).toBe("indexeddb");
		expect(resolved.a11y.liveRegionMode).toBe("polite");
	});

	it("respects explicit overrides", () => {
		const resolved = resolveUploaderConfig({
			capture: {
				allowCamera: false,
			},
			restrictions: {
				allowedFileKinds: ["image", "video"],
				maxFileBytes: 1024,
				maxFiles: 2,
			},
			transport: {
				auto: {
					tusMinBytes: 2048,
				},
				mode: "xhr",
			},
		});

		expect(resolved.capture.allowCamera).toBe(false);
		expect(resolved.restrictions.allowedFileKinds).toEqual(["image", "video"]);
		expect(resolved.restrictions.maxFileBytes).toBe(1024);
		expect(resolved.transport.mode).toBe("xhr");
		expect(resolved.transport.auto.tusMinBytes).toBe(2048);
	});

	it("throws on unsupported kinds and invalid numeric limits", () => {
		expect(() =>
			resolveUploaderConfig({
				restrictions: {
					allowedFileKinds: ["image", "invalid-kind" as "image"],
				},
			}),
		).toThrow("Unsupported file kind");

		expect(() =>
			resolveUploaderConfig({
				restrictions: {
					maxFiles: 0,
				},
			}),
		).toThrow("restrictions.maxFiles");
	});
});
