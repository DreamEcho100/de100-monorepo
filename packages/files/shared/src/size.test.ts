import { describe, expect, it } from "vitest";

import { formatBytes, parseFileSizeToBytes } from "./size";

describe("file size helpers", () => {
	it("parses readable file sizes", () => {
		expect(parseFileSizeToBytes("1KB")).toBe(1024);
		expect(parseFileSizeToBytes("1.5 MB")).toBe(1.5 * 1024 * 1024);
	});

	it("formats bytes", () => {
		expect(formatBytes(1024)).toBe("1KB");
		expect(formatBytes(1536)).toBe("1.5KB");
	});
});
