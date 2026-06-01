import { Source as UnpicSource } from "@unpic/solid";
import { createMemo, createSignal, For, splitProps } from "solid-js";

import type {
	ArtDirectedImageProps,
	ArtDirectedImageSource,
	ImageEventHandler,
	ImageLayoutPolicyInput,
} from "../image/contracts";
import {
	assertValidArtDirectedSources,
	imageLayoutToUnpicProps,
	resolveInheritedImageLayoutPolicy,
} from "../image/image-utils";
import { Image } from "./image";

const ArtDirectedImage = (props: ArtDirectedImageProps) => {
	const [local, imageProps] = splitProps(props, ["fallbackSrc", "onError", "sources", "src"]);
	const [fallbackActive, setFallbackActive] = createSignal(false);

	const sources = createMemo(() => {
		assertValidArtDirectedSources(local.sources);
		return fallbackActive() ? [] : local.sources;
	});

	const baseLayoutInput = createMemo(
		() =>
			({
				aspectRatio: props.aspectRatio,
				height: props.height,
				layout: props.layout,
				width: props.width,
			}) as ImageLayoutPolicyInput,
	);

	const onImageError: ImageEventHandler = (event) => {
		if (local.fallbackSrc) {
			setFallbackActive(true);
		}

		local.onError?.(event);
	};

	const sourceProviderProps = (source: ArtDirectedImageSource) => ({
		breakpoints: source.breakpoints ?? props.breakpoints,
		cdn: source.cdn ?? props.cdn,
		fallback: source.fallback ?? props.fallback,
		objectFit: source.objectFit ?? props.objectFit,
		operations: source.operations ?? props.operations,
		options: source.options ?? props.options,
		sizes: source.sizes ?? props.sizes,
		unstyled: source.unstyled ?? props.unstyled,
	});

	return (
		<picture data-slot="art-directed-image">
			<For each={sources()}>
				{(source) => {
					const layout = createMemo(() =>
						resolveInheritedImageLayoutPolicy(source, baseLayoutInput()),
					);

					return (
						<UnpicSource
							{...sourceProviderProps(source)}
							{...imageLayoutToUnpicProps(layout())}
							media={source.media}
							src={source.src}
							type={source.type}
						/>
					);
				}}
			</For>

			<Image
				{...imageProps}
				fallbackSrc={local.fallbackSrc}
				onError={onImageError}
				src={fallbackActive() && local.fallbackSrc ? local.fallbackSrc : local.src}
			/>
		</picture>
	);
};

export { ArtDirectedImage };
