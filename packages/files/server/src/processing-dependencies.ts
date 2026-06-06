import type { FilesProcessingDependency } from "@de100/files-shared";

export type FilesProcessingDependencyLoadResult =
	| {
			dependency: FilesProcessingDependency;
			module: unknown;
			status: "available";
	  }
	| {
			dependency: FilesProcessingDependency;
			reason: string;
			status: "unavailable";
	  };

export type FilesProcessingDependencyRegistry = {
	load(dependency: FilesProcessingDependency): Promise<FilesProcessingDependencyLoadResult>;
};

export type CreateFilesProcessingDependencyRegistryOptions = {
	dependencies?: Partial<Record<FilesProcessingDependency, unknown>>;
	loaders?: Partial<Record<FilesProcessingDependency, () => Promise<unknown>>>;
};

const dependencySpecifiers = {
	exifr: "exifr",
	"file-type": "file-type",
	"music-metadata": "music-metadata",
	sharp: "sharp",
} as const satisfies Partial<Record<FilesProcessingDependency, string>>;

export function createFilesProcessingDependencyRegistry(
	options: CreateFilesProcessingDependencyRegistryOptions = {},
): FilesProcessingDependencyRegistry {
	return {
		async load(dependency) {
			if (dependency in (options.dependencies ?? {})) {
				return {
					dependency,
					module: options.dependencies?.[dependency],
					status: "available",
				};
			}

			const loader = options.loaders?.[dependency] ?? createDefaultDependencyLoader(dependency);
			if (!loader) {
				return {
					dependency,
					reason: `${dependency} requires an app-injected executable or adapter.`,
					status: "unavailable",
				};
			}

			try {
				return {
					dependency,
					module: await loader(),
					status: "available",
				};
			} catch (error) {
				return {
					dependency,
					reason: getDependencyLoadFailureReason(error),
					status: "unavailable",
				};
			}
		},
	};
}

function createDefaultDependencyLoader(dependency: FilesProcessingDependency) {
	const specifier = dependencySpecifiers[dependency as keyof typeof dependencySpecifiers];
	if (!specifier) {
		return null;
	}

	return () => import(specifier);
}

function getDependencyLoadFailureReason(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}
