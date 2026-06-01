import type { ImageProps as UnpicSolidImageProps } from "@unpic/solid";
import type { JSX } from "solid-js";

type PropValue<T, K extends PropertyKey> = T extends unknown
	? K extends keyof T
		? T[K]
		: never
	: never;

export type ImageLayoutMode = "constrained" | "fixed" | "fullWidth";

export type ImageSizePolicy =
	| {
			aspectRatio?: never;
			height: number;
			width: number;
	  }
	| {
			aspectRatio: number;
			height?: never;
			width?: never;
	  };

export type ImageLayoutPolicyInput = ImageSizePolicy & {
	layout?: ImageLayoutMode;
};

export type ResolvedImageLayoutPolicy =
	| {
			aspectRatio: number;
			height: number;
			layout: "constrained" | "fixed";
			width: number;
	  }
	| {
			aspectRatio: number;
			height?: never;
			layout: "fullWidth";
			width?: never;
	  };

export type ImagePlaceholderMode = "blur" | "dominant-color" | "none" | "skeleton";

export type ImagePlaceholderInput = {
	blurDataUrl?: string;
	placeholder?: ImagePlaceholderMode;
	placeholderColor?: string;
};

export type ResolvedImagePlaceholderPolicy = {
	background?: string;
	mode: ImagePlaceholderMode;
	renderSkeleton: boolean;
};

export type ImageLoadingPolicyInput = {
	decoding?: "async" | "auto" | "sync";
	fetchpriority?: "high" | "low" | null;
	loading?: "eager" | "lazy";
	priority?: boolean;
};

export type ResolvedImageLoadingPolicy = {
	decoding: "async" | "auto" | "sync";
	fetchpriority?: "high" | "low";
	loading: "eager" | "lazy";
	priority: boolean;
};

export type ImageAccessibilityInput = {
	alt?: string;
	decorative?: boolean;
	role?: JSX.ImgHTMLAttributes<HTMLImageElement>["role"];
};

export type ResolvedImageAccessibilityPolicy = {
	alt: string;
	role?: JSX.ImgHTMLAttributes<HTMLImageElement>["role"];
};

export type ImageProviderProps = {
	breakpoints?: PropValue<UnpicSolidImageProps, "breakpoints">;
	cdn?: PropValue<UnpicSolidImageProps, "cdn">;
	fallback?: PropValue<UnpicSolidImageProps, "fallback">;
	objectFit?: PropValue<UnpicSolidImageProps, "objectFit">;
	operations?: PropValue<UnpicSolidImageProps, "operations">;
	options?: PropValue<UnpicSolidImageProps, "options">;
	sizes?: PropValue<UnpicSolidImageProps, "sizes">;
	unstyled?: PropValue<UnpicSolidImageProps, "unstyled">;
};

export type ImageNativeAttributes = Omit<
	JSX.ImgHTMLAttributes<HTMLImageElement>,
	| "alt"
	| "class"
	| "decoding"
	| "height"
	| "loading"
	| "onError"
	| "onLoad"
	| "role"
	| "src"
	| "srcset"
	| "style"
	| "width"
>;

export type ImageEventHandler = (
	event: Event & {
		currentTarget: HTMLImageElement;
		target: Element;
	},
) => void;

export type ImageProps = ImageNativeAttributes &
	ImageLayoutPolicyInput &
	ImagePlaceholderInput &
	ImageLoadingPolicyInput &
	ImageProviderProps & {
		alt?: string;
		class?: string;
		decorative?: boolean;
		fallbackSrc?: string;
		imgClass?: string;
		onError?: ImageEventHandler;
		onLoad?: ImageEventHandler;
		role?: JSX.ImgHTMLAttributes<HTMLImageElement>["role"];
		src: string;
		style?: JSX.CSSProperties;
	};

export type ArtDirectedImageSource = Partial<ImageLayoutPolicyInput> &
	ImageProviderProps & {
		media: string;
		src: string;
		type?: string;
	};

export type ArtDirectedImageProps = ImageProps & {
	sources: ArtDirectedImageSource[];
};
