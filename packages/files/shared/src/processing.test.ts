import { describe, expect, it } from "vitest";

import {
	filesGeneratedVariantSchema,
	filesPipelineRunResultSchema,
	filesProcessingDependencyValues,
	filesProcessingVariantDefinitionSchema,
} from "./processing";

describe("files processing contracts", () => {
	it("parses variant definitions and generated variants", () => {
		expect(
			filesProcessingVariantDefinitionSchema.parse({
				fit: "cover",
				height: 128,
				kind: "thumbnail",
				requiredForKinds: ["image", "video"],
				width: 128,
			}),
		).toMatchObject({
			kind: "thumbnail",
			width: 128,
		});

		expect(
			filesGeneratedVariantSchema.parse({
				contentType: "image/webp",
				key: "variants/file_1/thumbnail.webp",
				kind: "thumbnail",
				size: 512,
			}),
		).toMatchObject({
			status: "ready",
		});
	});

	it("keeps optional processing dependencies explicit", () => {
		expect(filesProcessingDependencyValues).toEqual([
			"file-type",
			"sharp",
			"exifr",
			"music-metadata",
			"ffmpeg",
			"ffprobe",
		]);
	});

	it("parses aggregate pipeline run results", () => {
		expect(
			filesPipelineRunResultSchema.parse({
				attempts: 1,
				metadata: { width: 320 },
				stageResults: [
					{
						durationMs: 2,
						metadata: { width: 320 },
						name: "metadata",
						status: "succeeded",
					},
				],
				status: "succeeded",
				variants: [],
			}),
		).toMatchObject({
			attempts: 1,
			status: "succeeded",
		});
	});
});
