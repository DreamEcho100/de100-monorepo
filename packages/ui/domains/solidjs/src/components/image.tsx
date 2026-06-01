import { Image as UnpicImage } from "@unpic/solid";
import { createEffect, createMemo, createSignal, Show, splitProps } from "solid-js";

import type { ImageEventHandler, ImageProps } from "../image/contracts";
import {
	imageLayoutToUnpicProps,
	resolveImageAccessibilityPolicy,
	resolveImageFallbackSource,
	resolveImageLayoutPolicy,
	resolveImageLoadingPolicy,
	resolveImagePlaceholderPolicy,
	resolveImageWrapperStyle,
} from "../image/image-utils";
import { cn } from "#libs/utils";

const Image = (props: ImageProps) => {
	const [local, others] = splitProps(props, [
		"alt",
		"aspectRatio",
		"blurDataUrl",
		"class",
		"decoding",
		"decorative",
		"fallbackSrc",
		"fetchpriority",
		"height",
		"imgClass",
		"layout",
		"loading",
		"onError",
		"onLoad",
		"placeholder",
		"placeholderColor",
		"priority",
		"role",
		"src",
		"style",
		"width",
	]);
	const [currentSrc, setCurrentSrc] = createSignal(local.src);
	const [loaded, setLoaded] = createSignal(false);

	createEffect(() => {
		setCurrentSrc(local.src);
		setLoaded(false);
	});

	const layoutPolicy = createMemo(() =>
		resolveImageLayoutPolicy({
			aspectRatio: local.aspectRatio,
			height: local.height,
			layout: local.layout,
			width: local.width,
		} as ImageProps),
	);
	const loadingPolicy = createMemo(() =>
		resolveImageLoadingPolicy({
			decoding: local.decoding,
			fetchpriority: local.fetchpriority,
			loading: local.loading,
			priority: local.priority,
		}),
	);
	const placeholderPolicy = createMemo(() =>
		resolveImagePlaceholderPolicy({
			blurDataUrl: local.blurDataUrl,
			placeholder: local.placeholder,
			placeholderColor: local.placeholderColor,
		}),
	);
	const accessibilityPolicy = createMemo(() =>
		resolveImageAccessibilityPolicy({
			alt: local.alt,
			decorative: local.decorative,
			role: local.role,
		}),
	);

	const callImageHandler = (handler: ImageEventHandler | undefined, event: Event) => {
		handler?.(
			event as Event & {
				currentTarget: HTMLImageElement;
				target: Element;
			},
		);
	};

	const onImageLoad = (event: Event) => {
		setLoaded(true);
		callImageHandler(local.onLoad, event);
	};

	const onImageError = (event: Event) => {
		if (local.fallbackSrc && currentSrc() !== local.fallbackSrc) {
			setCurrentSrc(resolveImageFallbackSource(currentSrc(), local.fallbackSrc));
			setLoaded(false);
		}

		callImageHandler(local.onError, event);
	};

	return (
		<span
			class={cn("relative block overflow-hidden", local.class)}
			data-fallback-active={currentSrc() === local.fallbackSrc ? "" : undefined}
			data-placeholder={placeholderPolicy().mode}
			data-slot="image-root"
			style={resolveImageWrapperStyle(layoutPolicy(), local.style)}
		>
			<UnpicImage
				{...others}
				{...imageLayoutToUnpicProps(layoutPolicy())}
				alt={accessibilityPolicy().alt}
				background={placeholderPolicy().background}
				class={cn("block h-full w-full", local.imgClass)}
				data-slot="image"
				decoding={loadingPolicy().decoding}
				fetchpriority={loadingPolicy().fetchpriority}
				loading={loadingPolicy().loading}
				onError={onImageError}
				onLoad={onImageLoad}
				priority={loadingPolicy().priority}
				role={accessibilityPolicy().role}
				src={currentSrc()}
			/>

			<Show when={!loaded() && placeholderPolicy().renderSkeleton}>
				<span
					aria-hidden="true"
					class="pointer-events-none absolute inset-0 z-skeleton animate-pulse"
					data-slot="image-placeholder"
				/>
			</Show>
		</span>
	);
};

export { Image };
