import type { JSX } from "solid-js";

import type {
	ArtDirectedImageSource,
	ImageAccessibilityInput,
	ImageLayoutMode,
	ImageLayoutPolicyInput,
	ImageLoadingPolicyInput,
	ImagePlaceholderInput,
	ResolvedImageAccessibilityPolicy,
	ResolvedImageLayoutPolicy,
	ResolvedImageLoadingPolicy,
	ResolvedImagePlaceholderPolicy,
} from "./contracts";

function positiveNumber(value: number | undefined, field: string) {
	if (value === undefined) {
		return undefined;
	}

	if (!Number.isFinite(value) || value <= 0) {
		throw new Error(`${field} must be a positive number.`);
	}

	return value;
}

function hasOwnDimensions(input: Partial<ImageLayoutPolicyInput>) {
	return input.width !== undefined || input.height !== undefined || input.aspectRatio !== undefined;
}

export function resolveImageLayoutPolicy(input: ImageLayoutPolicyInput): ResolvedImageLayoutPolicy {
	const width = positiveNumber(input.width, "width");
	const height = positiveNumber(input.height, "height");
	const aspectRatio = positiveNumber(input.aspectRatio, "aspectRatio");

	if (width !== undefined || height !== undefined) {
		if (width === undefined || height === undefined) {
			throw new Error("Images must provide both width and height, or provide aspectRatio only.");
		}

		if (aspectRatio !== undefined) {
			throw new Error("Images must use width and height, or aspectRatio, not both.");
		}

		return {
			aspectRatio: width / height,
			height,
			layout: input.layout === "fixed" ? "fixed" : "constrained",
			width,
		};
	}

	if (aspectRatio === undefined) {
		throw new Error("Images must provide width and height, or aspectRatio.");
	}

	if (input.layout && input.layout !== "fullWidth") {
		throw new Error("Aspect-ratio-only images must use the fullWidth layout.");
	}

	return {
		aspectRatio,
		layout: "fullWidth",
	};
}

export function resolveInheritedImageLayoutPolicy(
	source: Partial<ImageLayoutPolicyInput>,
	fallback: ImageLayoutPolicyInput,
): ResolvedImageLayoutPolicy {
	if (!hasOwnDimensions(source)) {
		return resolveImageLayoutPolicy({
			aspectRatio: fallback.aspectRatio,
			height: fallback.height,
			layout: source.layout ?? fallback.layout,
			width: fallback.width,
		} as ImageLayoutPolicyInput);
	}

	return resolveImageLayoutPolicy({
		aspectRatio: source.aspectRatio,
		height: source.height,
		layout: source.layout ?? fallback.layout,
		width: source.width,
	} as ImageLayoutPolicyInput);
}

export function resolveImageLoadingPolicy(
	input: ImageLoadingPolicyInput = {},
): ResolvedImageLoadingPolicy {
	const priority = input.priority === true;

	if (priority) {
		return {
			decoding: input.decoding ?? "async",
			fetchpriority: input.fetchpriority ?? "high",
			loading: "eager",
			priority,
		};
	}

	return {
		decoding: input.decoding ?? "async",
		fetchpriority: input.fetchpriority ?? undefined,
		loading: input.loading ?? "lazy",
		priority,
	};
}

export function resolveImagePlaceholderPolicy(
	input: ImagePlaceholderInput = {},
): ResolvedImagePlaceholderPolicy {
	const mode = input.placeholder ?? "none";

	if (mode === "none") {
		return {
			mode,
			renderSkeleton: false,
		};
	}

	if (mode === "dominant-color") {
		return {
			background: input.placeholderColor,
			mode,
			renderSkeleton: !input.placeholderColor,
		};
	}

	if (mode === "blur") {
		return {
			background: input.blurDataUrl ?? input.placeholderColor,
			mode,
			renderSkeleton: !input.blurDataUrl && !input.placeholderColor,
		};
	}

	return {
		background: input.placeholderColor,
		mode,
		renderSkeleton: true,
	};
}

export function resolveImageAccessibilityPolicy(
	input: ImageAccessibilityInput,
): ResolvedImageAccessibilityPolicy {
	if (input.decorative) {
		return {
			alt: "",
			role: "presentation",
		};
	}

	if (!input.alt || input.alt.trim().length === 0) {
		throw new Error("Image alt text is required unless decorative is true.");
	}

	return {
		alt: input.alt,
		role: input.role,
	};
}

export function resolveImageFallbackSource(currentSrc: string, fallbackSrc?: string) {
	if (!fallbackSrc || currentSrc === fallbackSrc) {
		return currentSrc;
	}

	return fallbackSrc;
}

export function resolveImageWrapperStyle(
	layout: ResolvedImageLayoutPolicy,
	style?: JSX.CSSProperties,
): JSX.CSSProperties {
	const layoutStyle: JSX.CSSProperties = {
		"aspect-ratio": `${layout.aspectRatio}`,
	};

	if (layout.layout === "fixed") {
		layoutStyle.height = `${layout.height}px`;
		layoutStyle.width = `${layout.width}px`;
	}

	if (layout.layout === "constrained") {
		layoutStyle["max-width"] = `${layout.width}px`;
		layoutStyle.width = "100%";
	}

	if (layout.layout === "fullWidth") {
		layoutStyle.width = "100%";
	}

	return {
		...style,
		...layoutStyle,
	};
}

export function assertValidArtDirectedSources(sources: ArtDirectedImageSource[]) {
	if (sources.length === 0) {
		throw new Error("ArtDirectedImage requires at least one source.");
	}

	for (const source of sources) {
		if (source.src.trim().length === 0) {
			throw new Error("ArtDirectedImage source src cannot be empty.");
		}

		if (source.media.trim().length === 0) {
			throw new Error("ArtDirectedImage source media cannot be empty.");
		}
	}
}

export function imageLayoutToUnpicProps(layout: ResolvedImageLayoutPolicy) {
	if (layout.layout === "fullWidth") {
		return {
			aspectRatio: layout.aspectRatio,
			layout: layout.layout,
		} as const;
	}

	return {
		height: layout.height,
		layout: layout.layout as Exclude<ImageLayoutMode, "fullWidth">,
		width: layout.width,
	} as const;
}
