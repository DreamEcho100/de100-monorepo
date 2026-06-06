import { describe, expect, it } from "vitest";

import { createFilesProcessingDependencyRegistry } from "./processing-dependencies";

describe("files processing dependency registry", () => {
	it("returns injected optional dependencies without loading packages", async () => {
		const sharpModule = { resize: () => undefined };
		const registry = createFilesProcessingDependencyRegistry({
			dependencies: {
				sharp: sharpModule,
			},
		});

		await expect(registry.load("sharp")).resolves.toEqual({
			dependency: "sharp",
			module: sharpModule,
			status: "available",
		});
	});

	it("returns unavailable when optional package loading fails", async () => {
		const registry = createFilesProcessingDependencyRegistry({
			loaders: {
				"file-type": async () => {
					throw new Error("Cannot find package 'file-type'");
				},
			},
		});

		await expect(registry.load("file-type")).resolves.toMatchObject({
			dependency: "file-type",
			reason: "Cannot find package 'file-type'",
			status: "unavailable",
		});
	});

	it("keeps executable adapters disabled until the app injects them", async () => {
		const registry = createFilesProcessingDependencyRegistry();

		await expect(registry.load("ffmpeg")).resolves.toEqual({
			dependency: "ffmpeg",
			reason: "ffmpeg requires an app-injected executable or adapter.",
			status: "unavailable",
		});
	});
});
