import type { FilesUppyPlugin } from "@de100/files-shared";
import { FilesError, filesErrorCodes } from "@de100/files-shared";

import type { FilesProtocolExecutor } from "./protocols";

export type FilesUppyPluginModule = {
	default?: unknown;
	[key: string]: unknown;
};

export type FilesUppyPluginImporter = (specifier: string) => Promise<FilesUppyPluginModule>;

export type FilesUppyPluginDefinition = {
	packageName: string;
	plugin: FilesUppyPlugin;
	requiredWhenEnabled: boolean;
};

export const filesUppyPluginDefinitions = {
	audio: {
		packageName: "@uppy/audio",
		plugin: "audio",
		requiredWhenEnabled: true,
	},
	"aws-s3": {
		packageName: "@uppy/aws-s3",
		plugin: "aws-s3",
		requiredWhenEnabled: true,
	},
	"companion-client": {
		packageName: "@uppy/companion-client",
		plugin: "companion-client",
		requiredWhenEnabled: true,
	},
	compressor: {
		packageName: "@uppy/compressor",
		plugin: "compressor",
		requiredWhenEnabled: true,
	},
	core: {
		packageName: "@uppy/core",
		plugin: "core",
		requiredWhenEnabled: true,
	},
	dashboard: {
		packageName: "@uppy/dashboard",
		plugin: "dashboard",
		requiredWhenEnabled: true,
	},
	"drag-drop": {
		packageName: "@uppy/drag-drop",
		plugin: "drag-drop",
		requiredWhenEnabled: true,
	},
	"drop-target": {
		packageName: "@uppy/drop-target",
		plugin: "drop-target",
		requiredWhenEnabled: true,
	},
	"file-input": {
		packageName: "@uppy/file-input",
		plugin: "file-input",
		requiredWhenEnabled: true,
	},
	"golden-retriever": {
		packageName: "@uppy/golden-retriever",
		plugin: "golden-retriever",
		requiredWhenEnabled: true,
	},
	"image-editor": {
		packageName: "@uppy/image-editor",
		plugin: "image-editor",
		requiredWhenEnabled: true,
	},
	informer: {
		packageName: "@uppy/informer",
		plugin: "informer",
		requiredWhenEnabled: true,
	},
	"progress-bar": {
		packageName: "@uppy/progress-bar",
		plugin: "progress-bar",
		requiredWhenEnabled: true,
	},
	"remote-sources": {
		packageName: "@uppy/remote-sources",
		plugin: "remote-sources",
		requiredWhenEnabled: true,
	},
	"screen-capture": {
		packageName: "@uppy/screen-capture",
		plugin: "screen-capture",
		requiredWhenEnabled: true,
	},
	"status-bar": {
		packageName: "@uppy/status-bar",
		plugin: "status-bar",
		requiredWhenEnabled: true,
	},
	"thumbnail-generator": {
		packageName: "@uppy/thumbnail-generator",
		plugin: "thumbnail-generator",
		requiredWhenEnabled: true,
	},
	transloadit: {
		packageName: "@uppy/transloadit",
		plugin: "transloadit",
		requiredWhenEnabled: true,
	},
	tus: {
		packageName: "@uppy/tus",
		plugin: "tus",
		requiredWhenEnabled: true,
	},
	webcam: {
		packageName: "@uppy/webcam",
		plugin: "webcam",
		requiredWhenEnabled: true,
	},
	"xhr-upload": {
		packageName: "@uppy/xhr-upload",
		plugin: "xhr-upload",
		requiredWhenEnabled: true,
	},
} satisfies Record<FilesUppyPlugin, FilesUppyPluginDefinition>;

export type FilesUppyPluginLoader = {
	getDefinition(plugin: FilesUppyPlugin): FilesUppyPluginDefinition;
	load(plugin: FilesUppyPlugin): Promise<FilesUppyPluginModule>;
};

export type FilesUppyLike = {
	addFile?: (file: { data: File; name: string; type: string }) => unknown;
	close?: () => unknown;
	upload?: () => Promise<unknown>;
	use(plugin: unknown, options?: Record<string, unknown>): FilesUppyLike;
};

export type InstallFilesUppyPluginsOptions = {
	loader?: FilesUppyPluginLoader;
	pluginOptions?: Partial<Record<FilesUppyPlugin, Record<string, unknown>>>;
	plugins: FilesUppyPlugin[];
	uppy: FilesUppyLike;
};

export type FilesUppyProtocolExecutorOptions = {
	createUppy: () => FilesUppyLike | Promise<FilesUppyLike>;
	loader?: FilesUppyPluginLoader;
	pluginOptions?: Partial<Record<FilesUppyPlugin, Record<string, unknown>>>;
};

export function createFilesUppyPluginLoader(
	options: { importer?: FilesUppyPluginImporter } = {},
): FilesUppyPluginLoader {
	const importer = options.importer ?? ((specifier) => import(/* @vite-ignore */ specifier));

	return {
		getDefinition(plugin) {
			return filesUppyPluginDefinitions[plugin];
		},
		async load(plugin) {
			const definition = filesUppyPluginDefinitions[plugin];
			try {
				return await importer(definition.packageName);
			} catch (error) {
				throw new FilesError(
					filesErrorCodes.missingDependency,
					`Uppy plugin ${plugin} requires ${definition.packageName}. Install it or disable that mode.`,
					{ cause: error },
				);
			}
		},
	};
}

export async function installFilesUppyPlugins(
	options: InstallFilesUppyPluginsOptions,
): Promise<FilesUppyLike> {
	const loader = options.loader ?? createFilesUppyPluginLoader();

	for (const plugin of options.plugins) {
		const module = await loader.load(plugin);
		const pluginFactory = module.default;
		if (!pluginFactory) {
			throw new FilesError(
				filesErrorCodes.missingDependency,
				`Uppy plugin ${plugin} did not expose a default plugin export.`,
			);
		}

		options.uppy.use(pluginFactory, options.pluginOptions?.[plugin]);
	}

	return options.uppy;
}

export function getFilesUppyProtocolPlugin(protocol: string): FilesUppyPlugin {
	if (protocol === "s3-put" || protocol === "s3-multipart") {
		return "aws-s3";
	}

	if (protocol === "tus") {
		return "tus";
	}

	return "xhr-upload";
}

export function createFilesUppyProtocolExecutor(
	options: FilesUppyProtocolExecutorOptions,
): FilesProtocolExecutor {
	return async (input) => {
		const protocolPlugin = getFilesUppyProtocolPlugin(input.target.protocol);
		const uppy = await options.createUppy();
		await installFilesUppyPlugins({
			loader: options.loader,
			pluginOptions: {
				...options.pluginOptions,
				[protocolPlugin]: {
					endpoint: input.target.uploadUrl,
					headers: input.target.headers ?? undefined,
					...(options.pluginOptions?.[protocolPlugin] ?? {}),
				},
			},
			plugins: [protocolPlugin],
			uppy,
		});

		input.onProgress?.({
			file: input.file,
			loaded: 0,
			progress: 0,
			total: input.file.size,
		});
		uppy.addFile?.({
			data: input.file,
			name: input.file.name,
			type: input.file.type || "application/octet-stream",
		});
		await uppy.upload?.();
		input.onProgress?.({
			file: input.file,
			loaded: input.file.size,
			progress: 100,
			total: input.file.size,
		});
		uppy.close?.();

		return {
			target: input.target,
		};
	};
}
