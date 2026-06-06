import { mkdir, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
	cleanupFilesTempPath,
	createFilesTempDirectory,
	createFilesTempFile,
	withFilesTempDirectory,
	writeFilesTempFile,
} from "./temp-files";

describe("files temp utilities", () => {
	it("creates and cleans up temp directories", async () => {
		const directory = await createFilesTempDirectory();

		await expect(stat(directory.path)).resolves.toMatchObject({
			isDirectory: expect.any(Function),
		});
		await directory.cleanup();
		await expect(stat(directory.path)).rejects.toMatchObject({ code: "ENOENT" });
	});

	it("creates, writes, and cleans up temp files", async () => {
		const parent = join(tmpdir(), "de100-files-temp-test");
		await mkdir(parent, { recursive: true });
		const file = await createFilesTempFile({
			directory: parent,
			prefix: "case-",
			suffix: ".txt",
		});

		await writeFilesTempFile(file.path, "hello");
		await expect(readFile(file.path, "utf8")).resolves.toBe("hello");
		await file.cleanup();
		await expect(stat(file.path)).rejects.toMatchObject({ code: "ENOENT" });
		await cleanupFilesTempPath(parent);
	});

	it("cleans up directories after scoped work completes", async () => {
		let scopedPath = "";

		const result = await withFilesTempDirectory({}, async (directory) => {
			scopedPath = directory.path;
			await expect(stat(directory.path)).resolves.toMatchObject({
				isDirectory: expect.any(Function),
			});
			return "done";
		});

		expect(result).toBe("done");
		await expect(stat(scopedPath)).rejects.toMatchObject({ code: "ENOENT" });
	});
});
