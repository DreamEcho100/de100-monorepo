import { describe, expect, it } from "vitest";

import {
	createFilesImagePlaceholderPlan,
	createFilesImageProcessingPlan,
	getFilesImageOutputContentType,
	normalizeFilesImageProcessingPreset,
} from "./index";

describe("image processing planning", () => {
	it("sorts responsive sizes and rejects formats outside outputFormats", () => {
		expect(() =>
			normalizeFilesImageProcessingPreset({
				outputFormats: ["webp"],
				responsiveSizes: [{ format: "jpeg", label: "wide", width: 1280 }],
			}),
		).toThrow("output format");

		const preset = normalizeFilesImageProcessingPreset({
			outputFormats: ["webp", "jpeg", "webp"],
			responsiveSizes: [
				{ format: "jpeg", label: "medium", width: 768 },
				{ format: "webp", label: "small", width: 320 },
			],
		});

		expect(preset.outputFormats).toEqual(["webp", "jpeg"]);
		expect(preset.responsiveSizes.map((size) => size.label)).toEqual(["small", "medium"]);
	});

	it("plans source-aware responsive images, thumbnails, and placeholders", () => {
		const plan = createFilesImageProcessingPlan({
			preset: {
				exif: true,
				outputFormats: ["webp", "jpeg"],
				placeholder: "dominant-color",
				responsiveSizes: [
					{ format: "webp", label: "small", width: 320 },
					{ format: "jpeg", label: "large", width: 1600 },
				],
				thumbnail: { height: 180, width: 320 },
			},
			sourceMetadata: { height: 1000, width: 1000 },
			storagePrefix: "files/image-1/",
		});

		expect(plan.exif).toBe(true);
		expect(plan.placeholder).toEqual({
			key: "files/image-1/placeholder.json",
			mode: "dominant-color",
			requiredAdapterCapabilities: ["image-metadata", "image-variant"],
		});
		expect(plan.variants).toEqual([
			{
				contentType: "image/webp",
				format: "webp",
				height: 320,
				key: "files/image-1/small.webp",
				kind: "responsive-image",
				label: "small",
				width: 320,
			},
			{
				contentType: "image/webp",
				format: "webp",
				height: 180,
				key: "files/image-1/thumbnail.webp",
				kind: "thumbnail",
				label: "thumbnail",
				width: 320,
			},
		]);
	});

	it("keeps placeholder none dependency-free", () => {
		expect(createFilesImagePlaceholderPlan({ mode: "none", storagePrefix: "files/a" })).toEqual({
			mode: "none",
			requiredAdapterCapabilities: [],
		});
		expect(getFilesImageOutputContentType("avif")).toBe("image/avif");
	});
});
