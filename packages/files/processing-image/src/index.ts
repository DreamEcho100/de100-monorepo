import type { FilesGeneratedVariant } from "@de100/files-shared";

export const filesImageProcessingAddonName = "@de100/files-processing-image";

export const filesImageOutputFormatValues = ["avif", "jpeg", "png", "webp"] as const;
export type FilesImageOutputFormat = (typeof filesImageOutputFormatValues)[number];

export const filesImagePlaceholderModeValues = ["blur-data-url", "dominant-color", "none"] as const;
export type FilesImagePlaceholderMode = (typeof filesImagePlaceholderModeValues)[number];

export type FilesImageResponsiveSize = {
	format: FilesImageOutputFormat;
	height?: number;
	label: string;
	width: number;
};

export type FilesImageProcessingPreset = {
	exif?: boolean;
	outputFormats: FilesImageOutputFormat[];
	placeholder?: FilesImagePlaceholderMode;
	responsiveSizes: FilesImageResponsiveSize[];
	skipSizesAboveSource?: boolean;
	thumbnail?: { height: number; width: number };
};

export type FilesImageProcessingInput = {
	contentType: string;
	fileId: string;
	fileName: string;
	source: ArrayBuffer | Uint8Array;
	storagePrefix: string;
};

export type FilesImageProcessingOutput = {
	metadata: Record<string, unknown>;
	variants: FilesGeneratedVariant[];
};

export type FilesImageSourceMetadata = {
	height?: number;
	width?: number;
};

export type FilesImageVariantPlan = {
	contentType: string;
	format: FilesImageOutputFormat;
	height?: number;
	key: string;
	kind: "responsive-image" | "thumbnail";
	label: string;
	width: number;
};

export type FilesImagePlaceholderPlan =
	| {
			mode: "none";
			requiredAdapterCapabilities: [];
	  }
	| {
			key: string;
			mode: "blur-data-url" | "dominant-color";
			requiredAdapterCapabilities: ["image-metadata", "image-variant"];
	  };

export type FilesImageProcessingPlan = {
	exif: boolean;
	placeholder: FilesImagePlaceholderPlan;
	variants: FilesImageVariantPlan[];
};

export type FilesImageProcessorAdapter = {
	process(
		input: FilesImageProcessingInput,
		preset: FilesImageProcessingPreset,
	): Promise<FilesImageProcessingOutput>;
};

export function defineFilesImageProcessor<TAdapter extends FilesImageProcessorAdapter>(
	adapter: TAdapter,
) {
	return adapter;
}

export function getFilesImageOutputContentType(format: FilesImageOutputFormat): string {
	switch (format) {
		case "avif":
			return "image/avif";
		case "jpeg":
			return "image/jpeg";
		case "png":
			return "image/png";
		case "webp":
			return "image/webp";
		default: {
			const exhaustive: never = format;
			throw new Error(`Unsupported image output format: ${exhaustive}`);
		}
	}
}

export function normalizeFilesImageProcessingPreset(
	preset: FilesImageProcessingPreset,
): FilesImageProcessingPreset {
	const outputFormats = uniqueFormats(preset.outputFormats);
	if (outputFormats.length === 0) {
		throw new Error("Image processing preset must include at least one output format.");
	}

	for (const format of outputFormats) {
		assertImageOutputFormat(format);
	}

	const responsiveSizes = preset.responsiveSizes.map((size) => {
		assertImageOutputFormat(size.format);
		assertPositiveInteger(size.width, `responsive size ${size.label} width`);
		if (size.height !== undefined) {
			assertPositiveInteger(size.height, `responsive size ${size.label} height`);
		}
		if (!outputFormats.includes(size.format)) {
			throw new Error(`Responsive size ${size.label} uses an output format not in outputFormats.`);
		}

		return { ...size };
	});

	if (preset.thumbnail !== undefined) {
		assertPositiveInteger(preset.thumbnail.width, "thumbnail width");
		assertPositiveInteger(preset.thumbnail.height, "thumbnail height");
	}

	return {
		exif: preset.exif ?? false,
		outputFormats,
		placeholder: preset.placeholder ?? "none",
		responsiveSizes: responsiveSizes.sort(compareResponsiveSizes),
		skipSizesAboveSource: preset.skipSizesAboveSource ?? true,
		thumbnail: preset.thumbnail ? { ...preset.thumbnail } : undefined,
	};
}

export function createFilesImageProcessingPlan(input: {
	preset: FilesImageProcessingPreset;
	sourceMetadata?: FilesImageSourceMetadata;
	storagePrefix: string;
}): FilesImageProcessingPlan {
	const preset = normalizeFilesImageProcessingPreset(input.preset);
	const storagePrefix = normalizeStoragePrefix(input.storagePrefix);
	const responsiveSizes = selectResponsiveSizesForSource({
		preset,
		sourceMetadata: input.sourceMetadata,
	});
	const responsiveVariants = responsiveSizes.map((size) =>
		createResponsiveImageVariantPlan({
			size,
			sourceMetadata: input.sourceMetadata,
			storagePrefix,
		}),
	);
	const thumbnailVariant =
		preset.thumbnail === undefined
			? undefined
			: ({
					contentType: getFilesImageOutputContentType("webp"),
					format: "webp",
					height: preset.thumbnail.height,
					key: `${storagePrefix}/thumbnail.webp`,
					kind: "thumbnail",
					label: "thumbnail",
					width: preset.thumbnail.width,
				} satisfies FilesImageVariantPlan);

	return {
		exif: preset.exif ?? false,
		placeholder: createFilesImagePlaceholderPlan({
			mode: preset.placeholder ?? "none",
			storagePrefix,
		}),
		variants: thumbnailVariant ? [...responsiveVariants, thumbnailVariant] : responsiveVariants,
	};
}

export function createFilesImagePlaceholderPlan(input: {
	mode: FilesImagePlaceholderMode;
	storagePrefix: string;
}): FilesImagePlaceholderPlan {
	if (input.mode === "none") {
		return { mode: "none", requiredAdapterCapabilities: [] };
	}

	return {
		key: `${normalizeStoragePrefix(input.storagePrefix)}/placeholder.${
			input.mode === "blur-data-url" ? "txt" : "json"
		}`,
		mode: input.mode,
		requiredAdapterCapabilities: ["image-metadata", "image-variant"],
	};
}

function selectResponsiveSizesForSource(input: {
	preset: FilesImageProcessingPreset;
	sourceMetadata?: FilesImageSourceMetadata;
}): FilesImageResponsiveSize[] {
	const sourceWidth = input.sourceMetadata?.width;
	if (!input.preset.skipSizesAboveSource || sourceWidth === undefined) {
		return input.preset.responsiveSizes;
	}

	return input.preset.responsiveSizes.filter((size) => size.width <= sourceWidth);
}

function createResponsiveImageVariantPlan(input: {
	size: FilesImageResponsiveSize;
	sourceMetadata?: FilesImageSourceMetadata;
	storagePrefix: string;
}): FilesImageVariantPlan {
	return {
		contentType: getFilesImageOutputContentType(input.size.format),
		format: input.size.format,
		height:
			input.size.height ??
			scaleHeightForWidth({
				sourceMetadata: input.sourceMetadata,
				width: input.size.width,
			}),
		key: `${input.storagePrefix}/${input.size.label}.${getFilesImageOutputExtension(input.size.format)}`,
		kind: "responsive-image",
		label: input.size.label,
		width: input.size.width,
	};
}

function getFilesImageOutputExtension(format: FilesImageOutputFormat): string {
	return format === "jpeg" ? "jpg" : format;
}

function scaleHeightForWidth(input: {
	sourceMetadata?: FilesImageSourceMetadata;
	width: number;
}): number | undefined {
	const sourceWidth = input.sourceMetadata?.width;
	const sourceHeight = input.sourceMetadata?.height;
	if (sourceWidth === undefined || sourceHeight === undefined) {
		return undefined;
	}

	return Math.max(1, Math.round((input.width / sourceWidth) * sourceHeight));
}

function compareResponsiveSizes(a: FilesImageResponsiveSize, b: FilesImageResponsiveSize): number {
	if (a.width !== b.width) {
		return a.width - b.width;
	}

	return a.format.localeCompare(b.format);
}

function uniqueFormats(formats: FilesImageOutputFormat[]): FilesImageOutputFormat[] {
	return [...new Set(formats)];
}

function assertImageOutputFormat(format: FilesImageOutputFormat): void {
	if (!filesImageOutputFormatValues.includes(format)) {
		throw new Error(`Unsupported image output format: ${format}`);
	}
}

function assertPositiveInteger(value: number, label: string): void {
	if (!Number.isInteger(value) || value <= 0) {
		throw new Error(`${label} must be a positive integer.`);
	}
}

function normalizeStoragePrefix(prefix: string): string {
	const normalized = prefix.replace(/\/+$/u, "");
	if (normalized.length === 0) {
		throw new Error("storagePrefix cannot be empty.");
	}

	return normalized;
}
