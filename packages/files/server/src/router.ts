import type {
	FileRouteConfigInput,
	FileRouteOptionsInput,
	NormalizedFileRouteConfig,
	NormalizedFileRouteOptions,
} from "@de100/files-shared";
import { normalizeFileRouteConfig, normalizeFileRouteOptions } from "@de100/files-shared";

import type { FilesRequestContext } from "./operations";

export type MaybePromise<T> = T | Promise<T>;
export type FileRouteMiddlewareResult = Record<string, unknown>;

export type FileRouteDefinition<
	TInput = undefined,
	TMetadata extends FileRouteMiddlewareResult = FileRouteMiddlewareResult,
	TOutput = unknown,
> = {
	$types: {
		input: TInput;
		metadata: TMetadata;
		output: TOutput;
	};
	config: NormalizedFileRouteConfig;
	options: NormalizedFileRouteOptions;
	parseInput: (input: unknown) => MaybePromise<TInput>;
	runMiddleware: (input: {
		context: FilesRequestContext;
		files: Array<{ lastModified?: number; name: string; size: number; type: string }>;
		input: TInput;
	}) => MaybePromise<TMetadata>;
	onUploadComplete: (input: {
		context: FilesRequestContext;
		file: { id: string; key: string; name: string; size: number; type: string };
		metadata: TMetadata;
	}) => MaybePromise<TOutput>;
	onUploadError: (input: {
		context: FilesRequestContext;
		error: unknown;
		fileKey?: string;
		metadata?: TMetadata;
	}) => MaybePromise<void>;
};

type BuilderState = {
	config: NormalizedFileRouteConfig;
	options: NormalizedFileRouteOptions;
	onUploadError?: (input: {
		context: FilesRequestContext;
		error: unknown;
		fileKey?: string;
		metadata?: FileRouteMiddlewareResult;
	}) => MaybePromise<void>;
	parseInput: (input: unknown) => MaybePromise<unknown>;
	runMiddleware: (input: {
		context: FilesRequestContext;
		files: Array<{ lastModified?: number; name: string; size: number; type: string }>;
		input: unknown;
	}) => MaybePromise<FileRouteMiddlewareResult>;
};

export type FileRouteBuilder<TInput, TMetadata extends FileRouteMiddlewareResult> = {
	input<TNextInput>(
		parser: (input: unknown) => MaybePromise<TNextInput>,
	): FileRouteBuilder<TNextInput, TMetadata>;
	middleware<TNextMetadata extends FileRouteMiddlewareResult>(
		fn: FileRouteDefinition<TInput, TNextMetadata, unknown>["runMiddleware"],
	): FileRouteBuilder<TInput, TNextMetadata>;
	onUploadComplete<TOutput>(
		fn: FileRouteDefinition<TInput, TMetadata, TOutput>["onUploadComplete"],
	): FileRouteDefinition<TInput, TMetadata, TOutput>;
	onUploadError(
		fn: FileRouteDefinition<TInput, TMetadata, unknown>["onUploadError"],
	): FileRouteBuilder<TInput, TMetadata>;
};

export type FilesRouter = Record<
	string,
	{
		config: NormalizedFileRouteConfig;
		options: NormalizedFileRouteOptions;
	}
>;

export function createFilesRouteBuilder(
	config: FileRouteConfigInput,
	options?: FileRouteOptionsInput,
): FileRouteBuilder<undefined, FileRouteMiddlewareResult> {
	return createBuilder({
		config: normalizeFileRouteConfig(config),
		options: normalizeFileRouteOptions(options),
		parseInput: () => undefined,
		runMiddleware: () => ({}),
	});
}

export function createFilesRouter<TRouter extends FilesRouter>(router: TRouter): TRouter {
	return router;
}

export function extractFilesRouterConfig(router: FilesRouter) {
	return Object.entries(router).map(([slug, route]) => ({
		config: route.config,
		options: route.options,
		slug,
	}));
}

function createBuilder<TInput, TMetadata extends FileRouteMiddlewareResult>(
	state: BuilderState,
): FileRouteBuilder<TInput, TMetadata> {
	return {
		input<TNextInput>(parser: (input: unknown) => MaybePromise<TNextInput>) {
			return createBuilder<TNextInput, TMetadata>({
				...state,
				parseInput: parser as BuilderState["parseInput"],
			});
		},
		middleware<TNextMetadata extends FileRouteMiddlewareResult>(
			fn: FileRouteDefinition<TInput, TNextMetadata, unknown>["runMiddleware"],
		) {
			return createBuilder<TInput, TNextMetadata>({
				...state,
				runMiddleware: fn as unknown as BuilderState["runMiddleware"],
			});
		},
		onUploadComplete<TNextOutput>(
			fn: FileRouteDefinition<TInput, TMetadata, TNextOutput>["onUploadComplete"],
		) {
			return {
				$types: {} as FileRouteDefinition<TInput, TMetadata, TNextOutput>["$types"],
				config: state.config,
				onUploadComplete: fn,
				onUploadError: state.onUploadError ?? (() => undefined),
				options: state.options,
				parseInput: state.parseInput as FileRouteDefinition<
					TInput,
					TMetadata,
					TNextOutput
				>["parseInput"],
				runMiddleware: state.runMiddleware as FileRouteDefinition<
					TInput,
					TMetadata,
					TNextOutput
				>["runMiddleware"],
			};
		},
		onUploadError(fn: FileRouteDefinition<TInput, TMetadata, unknown>["onUploadError"]) {
			return createBuilder<TInput, TMetadata>({
				...state,
				onUploadError: fn as unknown as BuilderState["onUploadError"],
			});
		},
	};
}
