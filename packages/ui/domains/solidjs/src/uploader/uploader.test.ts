import { describe, expect, it } from "vitest";

import {
	buildUploaderRestrictionsText,
	extractFilesFromDataTransfer,
	extractFilesFromFileList,
	formatBytes,
	shouldOpenFilePickerFromKey,
} from "./uploader";

function toFileList(files: File[]) {
	return {
		item: (index: number) => files[index] ?? null,
		length: files.length,
	} as Pick<FileList, "item" | "length">;
}

describe("uploader interaction helpers", () => {
	it("accepts keyboard triggers for accessible file picker activation", () => {
		expect(shouldOpenFilePickerFromKey("Enter")).toBe(true);
		expect(shouldOpenFilePickerFromKey(" ")).toBe(true);
		expect(shouldOpenFilePickerFromKey("Escape")).toBe(false);
	});

	it("extracts files from pointer and drop sources", () => {
		const fileA = new File(["a"], "a.txt", { type: "text/plain" });
		const fileB = new File(["b"], "b.txt", { type: "text/plain" });
		const fileList = toFileList([fileA, fileB]);

		expect(extractFilesFromFileList(fileList)).toEqual([fileA, fileB]);
		expect(extractFilesFromDataTransfer({ files: fileList })).toEqual([fileA, fileB]);
		expect(extractFilesFromDataTransfer(null)).toEqual([]);
	});

	it("builds human-readable helper text for a11y and hints", () => {
		expect(formatBytes(999)).toBe("999 B");
		expect(formatBytes(1_024)).toBe("1.0 KB");
		expect(formatBytes(2_097_152)).toBe("2.0 MB");
		expect(buildUploaderRestrictionsText(5, 2_097_152)).toBe("Up to 5 files, 2.0 MB per file.");
	});
});
