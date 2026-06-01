import { renderToString } from "solid-js/web";
import { describe, expect, it } from "vitest";

import { Image } from "../components/image";
import {
	resolveImageAccessibilityPolicy,
	resolveImageFallbackSource,
	resolveImageLayoutPolicy,
	resolveImageLoadingPolicy,
	resolveImagePlaceholderPolicy,
} from "./image-utils";

const shopifyImageSrc = "https://cdn.shopify.com/static/sample-images/bath_grande_crop_center.jpeg";

describe("image policy utilities", () => {
	it("requires width and height or an aspect ratio", () => {
		expect(resolveImageLayoutPolicy({ height: 600, width: 800 })).toEqual({
			aspectRatio: 800 / 600,
			height: 600,
			layout: "constrained",
			width: 800,
		});

		expect(resolveImageLayoutPolicy({ aspectRatio: 16 / 9 })).toEqual({
			aspectRatio: 16 / 9,
			layout: "fullWidth",
		});

		expect(() => resolveImageLayoutPolicy({ width: 800 } as never)).toThrow(
			"Images must provide both width and height",
		);
		expect(() =>
			resolveImageLayoutPolicy({ aspectRatio: 16 / 9, layout: "fixed" } as never),
		).toThrow("Aspect-ratio-only images must use the fullWidth layout");
	});

	it("applies lazy loading by default and eager loading for priority images", () => {
		expect(resolveImageLoadingPolicy()).toEqual({
			decoding: "async",
			fetchpriority: undefined,
			loading: "lazy",
			priority: false,
		});
		expect(resolveImageLoadingPolicy({ priority: true })).toEqual({
			decoding: "async",
			fetchpriority: "high",
			loading: "eager",
			priority: true,
		});
	});

	it("resolves placeholder and fallback policies deterministically", () => {
		expect(
			resolveImagePlaceholderPolicy({
				placeholder: "dominant-color",
				placeholderColor: "#101010",
			}),
		).toEqual({
			background: "#101010",
			mode: "dominant-color",
			renderSkeleton: false,
		});

		expect(resolveImagePlaceholderPolicy({ placeholder: "blur" })).toEqual({
			background: undefined,
			mode: "blur",
			renderSkeleton: true,
		});

		expect(resolveImageFallbackSource("/image.png", "/fallback.png")).toBe("/fallback.png");
		expect(resolveImageFallbackSource("/fallback.png", "/fallback.png")).toBe("/fallback.png");
	});

	it("requires explicit decorative intent for empty alt text", () => {
		expect(resolveImageAccessibilityPolicy({ alt: "Course cover" })).toEqual({
			alt: "Course cover",
			role: undefined,
		});
		expect(resolveImageAccessibilityPolicy({ decorative: true })).toEqual({
			alt: "",
			role: "presentation",
		});
		expect(() => resolveImageAccessibilityPolicy({ alt: "" })).toThrow(
			"Image alt text is required unless decorative is true",
		);
	});
});

describe("Image", () => {
	it("renders a responsive Unpic image with safe defaults", () => {
		const markup = renderToString(() =>
			Image({
				alt: "A tiled bath",
				height: 600,
				src: shopifyImageSrc,
				width: 800,
			}),
		);

		expect(markup).toContain('data-slot="image-root"');
		expect(markup).toContain('data-slot="image"');
		expect(markup).toContain('loading="lazy"');
		expect(markup).toContain('decoding="async"');
		expect(markup).toContain('sizes="(min-width: 800px) 800px, 100vw"');
		expect(markup).toContain("srcset=");
		expect(markup).toContain("aspect-ratio:1.3333333333333333");
	});

	it("renders priority and placeholder state", () => {
		const markup = renderToString(() =>
			Image({
				alt: "Hero cover",
				aspectRatio: 16 / 9,
				placeholder: "skeleton",
				priority: true,
				src: shopifyImageSrc,
			}),
		);

		expect(markup).toContain('loading="eager"');
		expect(markup).toContain('fetchpriority="high"');
		expect(markup).toContain('data-placeholder="skeleton"');
		expect(markup).toContain('data-slot="image-placeholder"');
		expect(markup).toContain("aspect-ratio:1.7777777777777777");
	});

	it("renders decorative images only when requested explicitly", () => {
		const markup = renderToString(() =>
			Image({
				aspectRatio: 1,
				decorative: true,
				src: shopifyImageSrc,
			}),
		);

		expect(markup).toContain('alt=""');
		expect(markup).toContain('role="presentation"');
		expect(() =>
			renderToString(() =>
				Image({
					aspectRatio: 1,
					src: shopifyImageSrc,
				}),
			),
		).toThrow("Image alt text is required unless decorative is true");
	});
});
