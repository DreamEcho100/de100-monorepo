import type {
	CreateUploadTargetInput,
	CreateUploadTargetOutput,
	FileRecord,
	FileRouteSlug,
	FilesUploadModeDecision,
	FilesUploadProtocolPreference,
	FileVisibility,
} from "@de100/files-shared";
import { brandFileRouteSlug, inferFileKindFromContentType } from "@de100/files-shared";

export type FilesClientFetch = typeof fetch;

export type FilesClientConfig = {
	directUpload: {
		enabled: boolean;
		maxBytes: number;
	};
	routes: Array<{
		config: Record<
			string,
			{
				access: FileVisibility;
				contentDisposition: "attachment" | "inline";
				maxFileCount: number;
				maxFileSizeBytes: number;
				minFileCount: number;
				protocols: FilesUploadProtocolPreference[];
				requiresResumable: boolean;
			}
		>;
		options: {
			awaitServerData: boolean;
			presignedUrlTtlSeconds: number;
		};
		slug: string;
	}>;
};

export type FilesDirectUploadInput = {
	file: File;
	kind?: FileRecord["kind"];
	metadata?: Record<string, unknown>;
	requiresResumable?: boolean;
	routeSlug: FileRouteSlug | string;
	visibility?: FileVisibility;
};

export type FilesDirectDownloadOutput = {
	file: Blob;
	record: FileRecord;
};

export type FilesSignedAccessOutput = {
	expiresAt: Date;
	token: string;
	url: string | null;
};

export type FilesUploadModeInput = {
	contentType?: string;
	fileSize: number;
	kind?: FileRecord["kind"];
	requiresResumable?: boolean;
	routeSlug: FileRouteSlug | string;
};

export type FilesClientRpcAdapter = {
	downloadDirect?: (input: { id: string }) => Promise<FilesDirectDownloadOutput | null>;
	uploadDirect?: (input: FilesDirectUploadInput) => Promise<FileRecord>;
	watchProcessing?: (input: { fileId: string }) => AsyncIterable<unknown>;
	watchUpload?: (input: { sessionId: string }) => AsyncIterable<unknown>;
};

export type FilesClientOptions = {
	baseUrl?: string | URL;
	fetch?: FilesClientFetch;
	headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
	rpc?: FilesClientRpcAdapter;
};

export type FilesUploadFileInput = {
	file: File;
	input?: unknown;
	metadata?: Record<string, unknown>;
	requiresResumable?: boolean;
	routeSlug: FileRouteSlug | string;
	visibility?: CreateUploadTargetInput["visibility"];
};

export type FilesUploadProgress = {
	file: File;
	loaded: number;
	progress: number;
	total: number;
};

export type FilesUploadOptions = FilesUploadFileInput & {
	onUploadBegin?: (file: File) => void;
	onUploadProgress?: (progress: FilesUploadProgress) => void;
	signal?: AbortSignal;
};

export type FilesUploadResult =
	| {
			mode: "orpc-direct";
			record: FileRecord;
	  }
	| {
			mode: "upload-target";
			target: CreateUploadTargetOutput;
	  };

export type FilesClient = {
	abortUpload(input: { sessionId: string }): Promise<unknown>;
	completeUpload(input: { fileId: string; sessionId?: string }): Promise<FileRecord | null>;
	createUploadTarget(input: CreateUploadTargetInput): Promise<CreateUploadTargetOutput>;
	downloadDirect(input: { id: string }): Promise<FilesDirectDownloadOutput | null>;
	getConfig(): Promise<FilesClientConfig>;
	issueSignedAccess(input: {
		expiresInSeconds?: number;
		id: string;
	}): Promise<FilesSignedAccessOutput | null>;
	route(slug: string): FileRouteSlug;
	resolveUploadMode(input: FilesUploadModeInput): Promise<FilesUploadModeDecision>;
	uploadDirect(input: FilesDirectUploadInput): Promise<FileRecord>;
	uploadFile(options: FilesUploadOptions): Promise<FilesUploadResult>;
	watchProcessing(input: { fileId: string }): AsyncIterable<unknown>;
	watchUpload(input: { sessionId: string }): AsyncIterable<unknown>;
};

export function createFilesClient(options: FilesClientOptions = {}): FilesClient {
	const fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis);
	const baseUrl = options.baseUrl
		? new URL(options.baseUrl)
		: new URL("/api/files", getDefaultOrigin());

	return {
		async abortUpload(input) {
			return postJson(
				fetchFn,
				createUrl(baseUrl, `sessions/${input.sessionId}/abort`),
				{},
				options,
			);
		},
		async completeUpload(input) {
			return postJson(
				fetchFn,
				createUrl(baseUrl, `${input.fileId}/complete`),
				{
					fileId: input.fileId,
					sessionId: input.sessionId,
				},
				options,
			);
		},
		async createUploadTarget(input) {
			return postJson(fetchFn, createUrl(baseUrl, "targets"), input, options);
		},
		async downloadDirect(input) {
			if (!options.rpc?.downloadDirect) {
				throw new Error("Direct oRPC download requires an RPC adapter.");
			}

			return options.rpc.downloadDirect(input);
		},
		async getConfig() {
			return getJson(fetchFn, createUrl(baseUrl, "config"), options);
		},
		async issueSignedAccess(input) {
			return postJson(fetchFn, createUrl(baseUrl, `${input.id}/signed-access`), input, options);
		},
		route(slug) {
			return brandFileRouteSlug(slug);
		},
		async resolveUploadMode(input) {
			return postJson(
				fetchFn,
				createUrl(baseUrl, "upload-mode"),
				{
					...input,
					routeSlug: String(input.routeSlug),
				},
				options,
			);
		},
		async uploadDirect(input) {
			if (!options.rpc?.uploadDirect) {
				throw new Error("Direct oRPC upload requires an RPC adapter.");
			}

			return options.rpc.uploadDirect(input);
		},
		async uploadFile(uploadOptions) {
			uploadOptions.onUploadBegin?.(uploadOptions.file);
			const mode = await this.resolveUploadMode({
				contentType: uploadOptions.file.type || "application/octet-stream",
				fileSize: uploadOptions.file.size,
				kind: inferFileKindFromContentType(uploadOptions.file.type),
				requiresResumable: uploadOptions.requiresResumable,
				routeSlug: uploadOptions.routeSlug,
			});

			if (mode.mode === "orpc-direct") {
				const record = await this.uploadDirect({
					file: uploadOptions.file,
					kind: inferFileKindFromContentType(uploadOptions.file.type),
					metadata: uploadOptions.metadata,
					requiresResumable: uploadOptions.requiresResumable,
					routeSlug: uploadOptions.routeSlug,
					visibility: uploadOptions.visibility ?? "private",
				});

				uploadOptions.onUploadProgress?.({
					file: uploadOptions.file,
					loaded: uploadOptions.file.size,
					progress: 100,
					total: uploadOptions.file.size,
				});

				return {
					mode: "orpc-direct",
					record,
				};
			}

			const target = await this.createUploadTarget({
				contentType: uploadOptions.file.type || "application/octet-stream",
				fileName: uploadOptions.file.name,
				fileSize: uploadOptions.file.size,
				metadata: uploadOptions.metadata,
				routeSlug: String(uploadOptions.routeSlug),
				protocol: mode.protocol === "orpc-direct" ? "auto" : mode.protocol,
				visibility: uploadOptions.visibility ?? "private",
			});

			uploadOptions.onUploadProgress?.({
				file: uploadOptions.file,
				loaded: uploadOptions.file.size,
				progress: 100,
				total: uploadOptions.file.size,
			});

			return {
				mode: "upload-target",
				target,
			};
		},
		watchProcessing(input) {
			if (!options.rpc?.watchProcessing) {
				throw new Error("Processing event streaming requires an RPC adapter.");
			}

			return options.rpc.watchProcessing(input);
		},
		watchUpload(input) {
			if (!options.rpc?.watchUpload) {
				throw new Error("Upload event streaming requires an RPC adapter.");
			}

			return options.rpc.watchUpload(input);
		},
	};
}

export type FilesRouteHelpers<TRoutes extends Record<string, unknown>> = {
	route<TSlug extends Extract<keyof TRoutes, string>>(slug: TSlug): FileRouteSlug & TSlug;
	uploadFile<TSlug extends Extract<keyof TRoutes, string>>(
		options: Omit<FilesUploadOptions, "routeSlug"> & { routeSlug: TSlug },
	): Promise<FilesUploadResult>;
};

export function createFilesRouteHelpers<TRoutes extends Record<string, unknown>>(
	client: FilesClient,
): FilesRouteHelpers<TRoutes> {
	return {
		route(slug) {
			return client.route(slug) as FileRouteSlug & typeof slug;
		},
		uploadFile(options) {
			return client.uploadFile(options);
		},
	};
}

async function resolveHeaders(headers?: FilesClientOptions["headers"]) {
	if (!headers) {
		return {};
	}

	return typeof headers === "function" ? await headers() : headers;
}

function getDefaultOrigin() {
	if (typeof window !== "undefined") {
		return window.location.origin;
	}

	return "http://localhost";
}

function ensureTrailingSlash(url: URL) {
	const next = new URL(url);
	if (!next.pathname.endsWith("/")) {
		next.pathname = `${next.pathname}/`;
	}

	return next;
}

function createUrl(baseUrl: URL, path: string) {
	return new URL(path, ensureTrailingSlash(baseUrl)).toString();
}

async function getJson<TValue>(
	fetchFn: FilesClientFetch,
	url: string,
	options: FilesClientOptions,
): Promise<TValue> {
	const response = await fetchFn(url, {
		headers: await resolveHeaders(options.headers),
		method: "GET",
	});

	return readJsonResponse<TValue>(response);
}

async function postJson<TValue>(
	fetchFn: FilesClientFetch,
	url: string,
	body: unknown,
	options: FilesClientOptions,
): Promise<TValue> {
	const response = await fetchFn(url, {
		body: JSON.stringify(body),
		headers: {
			"content-type": "application/json",
			...(await resolveHeaders(options.headers)),
		},
		method: "POST",
	});

	return readJsonResponse<TValue>(response);
}

async function readJsonResponse<TValue>(response: Response): Promise<TValue> {
	if (!response.ok) {
		throw new Error(`Files request failed with ${response.status}.`);
	}

	return (await response.json()) as TValue;
}
