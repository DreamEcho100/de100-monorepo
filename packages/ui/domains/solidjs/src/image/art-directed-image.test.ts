import { renderToString } from "solid-js/web";
import { describe, expect, it } from "vitest";

import { ArtDirectedImage } from "../components/art-directed-image";
import { assertValidArtDirectedSources, resolveInheritedImageLayoutPolicy } from "./image-utils";

const shopifyImageSrc = "https://cdn.shopify.com/static/sample-images/bath_grande_crop_center.jpeg";

describe("art-directed image policy utilities", () => {
	it("validates source configuration", () => {
		expect(() => assertValidArtDirectedSources([])).toThrow(
			"ArtDirectedImage requires at least one source",
		);
		expect(() => assertValidArtDirectedSources([{ media: "", src: shopifyImageSrc }])).toThrow(
			"ArtDirectedImage source media cannot be empty",
		);
		expect(() => assertValidArtDirectedSources([{ media: "(min-width: 768px)", src: "" }])).toThrow(
			"ArtDirectedImage source src cannot be empty",
		);
	});

	it("allows sources to inherit the fallback image layout policy", () => {
		expect(resolveInheritedImageLayoutPolicy({}, { height: 600, width: 800 })).toEqual({
			aspectRatio: 800 / 600,
			height: 600,
			layout: "constrained",
			width: 800,
		});

		expect(
			resolveInheritedImageLayoutPolicy({ aspectRatio: 1 }, { height: 600, width: 800 }),
		).toEqual({
			aspectRatio: 1,
			layout: "fullWidth",
		});
	});
});

describe("ArtDirectedImage", () => {
	it("renders picture sources and fallback image output", () => {
		const markup = renderToString(() =>
			ArtDirectedImage({
				alt: "Course hero",
				height: 600,
				sources: [
					{
						media: "(min-width: 1024px)",
						src: shopifyImageSrc,
						type: "image/webp",
					},
					{
						aspectRatio: 1,
						media: "(max-width: 767px)",
						src: shopifyImageSrc,
					},
				],
				src: shopifyImageSrc,
				width: 800,
			}),
		);

		expect(markup).toContain("<picture");
		expect(markup).toContain('data-slot="art-directed-image"');
		expect(markup).toContain('media="(min-width: 1024px)"');
		expect(markup).toContain('type="image/webp"');
		expect(markup).toContain('media="(max-width: 767px)"');
		expect(markup).toContain("<source");
		expect(markup).toContain("<img");
		expect(markup).toContain("srcset=");
		expect(markup).toContain('alt="Course hero"');
	});

	it("keeps fallback source state available for load-error recovery", () => {
		const markup = renderToString(() =>
			ArtDirectedImage({
				alt: "Course hero",
				aspectRatio: 16 / 9,
				fallbackSrc: "/images/fallback.png",
				placeholder: "blur",
				placeholderColor: "#111111",
				sources: [
					{
						media: "(min-width: 768px)",
						src: shopifyImageSrc,
					},
				],
				src: shopifyImageSrc,
			}),
		);

		expect(markup).toContain('data-placeholder="blur"');
		expect(markup).toContain("background:#111111");
		expect(markup).not.toContain('data-fallback-active=""');
	});
});
