import { describe, expect, it } from "vitest";

import {
	assertFileStatus,
	canTransitionFileStatus,
	getAllowedFileStatusTransitions,
} from "./status-transitions";

describe("file status transitions", () => {
	it("allows normal upload and processing transitions", () => {
		expect(canTransitionFileStatus("draft", "uploading")).toBe(true);
		expect(canTransitionFileStatus("uploading", "stored")).toBe(true);
		expect(canTransitionFileStatus("stored", "processing")).toBe(true);
		expect(canTransitionFileStatus("processing", "ready")).toBe(true);
	});

	it("treats deleted as terminal", () => {
		expect(getAllowedFileStatusTransitions("deleted")).toEqual([]);
		expect(canTransitionFileStatus("deleted", "ready")).toBe(false);
	});

	it("asserts supported statuses", () => {
		expect(assertFileStatus("ready")).toBe("ready");
		expect(() => assertFileStatus("unknown")).toThrow("Unsupported file status");
	});
});
