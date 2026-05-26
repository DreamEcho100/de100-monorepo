import type { S3Client as AwsS3Client, GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { env } from "@de100/apps-lms-env/server";

export type MediaVisibility = "public" | "private";
export type MediaStorageDriver = "local" | "r2";

type RequestLike = Request | { request: Request };

export type MediaHttpMetadata = {
	cacheControl?: string;
	contentDisposition?: string;
	contentEncoding?: string;
	contentLanguage?: string;
	contentType?: string;
};

type MediaPutOptions = {
	httpMetadata?: MediaHttpMetadata;
};

type MediaObject = {
	body: ConstructorParameters<typeof Response>[0];
	httpEtag?: string;
	httpMetadata?: MediaHttpMetadata;
	size?: number;
	uploaded?: Date;
	writeHttpMetadata?: (headers: Headers) => void;
};

type MediaObjectResponse = Pick<globalThis.Response, "body" | "headers" | "status" | "statusText">;

export type MediaBucket = {
	delete(key: string): Promise<void>;
	get(key: string): Promise<MediaObject | null>;
	put(
		key: string,
		value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
		options?: MediaPutOptions,
	): Promise<unknown>;
};

export type MediaStorageCapabilities = {
	driver: MediaStorageDriver;
	supportsDirectPublicUrl: boolean;
	supportsSignedDelivery: boolean;
};

export type MediaObjectHead = Pick<MediaObject, "httpEtag" | "httpMetadata" | "size" | "uploaded">;

export type PutMediaObjectInput = {
	httpMetadata?: MediaHttpMetadata;
	key: string;
	value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob;
	visibility: MediaVisibility;
};

export type ReadMediaObjectInput = {
	key: string;
	visibility: MediaVisibility;
};

export type SignedMediaUrlInput = {
	expiresInSeconds: number;
	key: string;
	visibility: MediaVisibility;
};

export type MediaStorageProvider = {
	createSignedReadUrl(input: SignedMediaUrlInput): Promise<string | null>;
	createSignedWriteUrl(input: SignedMediaUrlInput): Promise<string | null>;
	deleteObject(input: ReadMediaObjectInput): Promise<void>;
	driver: MediaStorageDriver;
	getBucketName(visibility: MediaVisibility): string | null;
	getCapabilities(): MediaStorageCapabilities;
	getObject(input: ReadMediaObjectInput): Promise<MediaObject | null>;
	getPublicDirectUrl(key: string): string | null;
	headObject(input: ReadMediaObjectInput): Promise<MediaObjectHead | null>;
	listPrefix(input: { prefix: string; visibility: MediaVisibility }): Promise<string[] | null>;
	putObject(input: PutMediaObjectInput): Promise<void>;
};

type MediaBindings = {
	PRIVATE_MEDIA_BUCKET: MediaBucket;
	PRIVATE_MEDIA_BUCKET_NAME: string;
	PUBLIC_MEDIA_BUCKET: MediaBucket;
	PUBLIC_MEDIA_BUCKET_NAME: string;
	PUBLIC_MEDIA_DEV_DOMAIN?: string;
};

type MediaS3Config = {
	accessKeyId?: string;
	endpoint?: string;
	forcePathStyle: boolean;
	privateBucket?: string;
	publicBucket?: string;
	region: string;
	secretAccessKey?: string;
};

type ResolvedS3BucketConfig = {
	bucketName: string;
	config: MediaS3Config;
};

type LocalFsModule = typeof import("node:fs/promises");
type PathModule = typeof import("node:path");

type LocalMediaObjectMetadata = {
	httpMetadata?: MediaHttpMetadata;
};

type RuntimeBindingRequest = Request & {
	runtime?: {
		cloudflare?: {
			env?: Partial<MediaBindings>;
		};
	};
};

export class MediaStorageUnavailableError extends Error {}

export class MediaBindingsUnavailableError extends MediaStorageUnavailableError {
	constructor() {
		super(
			"Media storage is unavailable for this request. Configure runtime bucket bindings or APP_LMS_MEDIA_S3_* values, or switch APP_LMS_MEDIA_STORAGE_DRIVER to local.",
		);
	}
}

export class MediaLocalStorageUnavailableError extends MediaStorageUnavailableError {
	constructor() {
		super(
			"Local media storage is unavailable in this runtime. Use the Node-based local dev server or switch APP_LMS_MEDIA_STORAGE_DRIVER back to r2.",
		);
	}
}

let cachedS3Client: {
	client: AwsS3Client;
	signature: string;
} | null = null;

function resolveRequest(source: RequestLike): Request {
	return "request" in source ? source.request : source;
}

function getBindings(source: RequestLike): Partial<MediaBindings> {
	const runtimeRequest = resolveRequest(source) as RuntimeBindingRequest;
	return runtimeRequest.runtime?.cloudflare?.env ?? {};
}

function getRuntimeEnvValue(key: string): string | undefined {
	const value = process.env[key];
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function parseRuntimeBoolean(value: string | undefined): boolean | undefined {
	if (!value) {
		return undefined;
	}

	const normalizedValue = value.trim().toLowerCase();
	if (normalizedValue === "1" || normalizedValue === "true" || normalizedValue === "yes") {
		return true;
	}

	if (normalizedValue === "0" || normalizedValue === "false" || normalizedValue === "no") {
		return false;
	}

	return undefined;
}

function getConfiguredMediaS3Config(): MediaS3Config {
	const configuredS3Values = env.mediaStorage.type === "r2" ? env.mediaStorage.s3 : null;
	const forcePathStyleOverride = parseRuntimeBoolean(
		getRuntimeEnvValue("APP_LMS_MEDIA_S3_FORCE_PATH_STYLE"),
	);

	return {
		accessKeyId:
			getRuntimeEnvValue("APP_LMS_MEDIA_S3_ACCESS_KEY_ID") ?? configuredS3Values?.accessKeyId,
		endpoint: getRuntimeEnvValue("APP_LMS_MEDIA_S3_ENDPOINT") ?? configuredS3Values?.endpoint,
		forcePathStyle: forcePathStyleOverride ?? configuredS3Values?.forcePathStyle ?? true,
		privateBucket:
			getRuntimeEnvValue("APP_LMS_MEDIA_S3_PRIVATE_BUCKET") ?? configuredS3Values?.privateBucket,
		publicBucket:
			getRuntimeEnvValue("APP_LMS_MEDIA_S3_PUBLIC_BUCKET") ?? configuredS3Values?.publicBucket,
		region: getRuntimeEnvValue("APP_LMS_MEDIA_S3_REGION") ?? configuredS3Values?.region ?? "auto",
		secretAccessKey:
			getRuntimeEnvValue("APP_LMS_MEDIA_S3_SECRET_ACCESS_KEY") ??
			configuredS3Values?.secretAccessKey,
	};
}

function hasCompleteS3Config(config: MediaS3Config) {
	const hasAccessKeyId = Boolean(config.accessKeyId);
	const hasSecretAccessKey = Boolean(config.secretAccessKey);

	if (hasAccessKeyId !== hasSecretAccessKey) {
		return false;
	}

	return Boolean(config.endpoint && config.publicBucket && config.privateBucket);
}

function resolveS3BucketConfig(visibility: MediaVisibility): ResolvedS3BucketConfig | null {
	if (getConfiguredMediaStorageDriver() !== "r2") {
		return null;
	}

	const config = getConfiguredMediaS3Config();
	if (!hasCompleteS3Config(config)) {
		return null;
	}

	const bucketName = visibility === "public" ? config.publicBucket : config.privateBucket;
	if (!bucketName) {
		return null;
	}

	return {
		bucketName,
		config,
	};
}

function buildS3ClientSignature(config: MediaS3Config) {
	return [
		config.endpoint ?? "",
		config.region,
		config.forcePathStyle ? "1" : "0",
		config.accessKeyId ?? "",
		config.secretAccessKey ?? "",
	].join("|");
}

async function getS3Client(config: MediaS3Config): Promise<AwsS3Client> {
	const signature = buildS3ClientSignature(config);
	if (cachedS3Client?.signature === signature) {
		return cachedS3Client.client;
	}

	const { S3Client } = await import("@aws-sdk/client-s3");
	const clientConfig: {
		credentials?: { accessKeyId: string; secretAccessKey: string };
		endpoint?: string;
		forcePathStyle: boolean;
		region: string;
	} = {
		endpoint: config.endpoint,
		forcePathStyle: config.forcePathStyle,
		region: config.region,
	};

	if (config.accessKeyId && config.secretAccessKey) {
		clientConfig.credentials = {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		};
	}

	const client = new S3Client(clientConfig);
	cachedS3Client = {
		client,
		signature,
	};

	return client;
}

function isS3NotFoundError(error: unknown) {
	const maybeError = error as {
		$metadata?: { httpStatusCode?: number };
		Code?: string;
		code?: string;
		name?: string;
	};

	return (
		maybeError.name === "NoSuchKey" ||
		maybeError.name === "NotFound" ||
		maybeError.code === "NoSuchKey" ||
		maybeError.Code === "NoSuchKey" ||
		maybeError.$metadata?.httpStatusCode === 404
	);
}

async function readS3ObjectBody(output: GetObjectCommandOutput) {
	const body = output.Body;
	if (!body) {
		return null;
	}

	const toArrayBuffer = (value: ArrayBufferView | Uint8Array) => {
		const bytes =
			value instanceof Uint8Array
				? value
				: new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

		// Copy into a fresh Uint8Array-backed ArrayBuffer so SharedArrayBuffer-backed
		// views never leak into Response body typing.
		return Uint8Array.from(bytes).buffer;
	};

	if (body instanceof ReadableStream || typeof body === "string") {
		return body;
	}

	if (body instanceof Uint8Array) {
		return toArrayBuffer(body);
	}

	if (body instanceof ArrayBuffer) {
		return body;
	}

	if (ArrayBuffer.isView(body)) {
		return toArrayBuffer(body);
	}

	if (
		typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray ===
		"function"
	) {
		const byteArray = await (
			body as { transformToByteArray: () => Promise<Uint8Array> }
		).transformToByteArray();
		return toArrayBuffer(byteArray);
	}

	if (
		typeof (body as { transformToWebStream?: () => ReadableStream }).transformToWebStream ===
		"function"
	) {
		return (body as { transformToWebStream: () => ReadableStream }).transformToWebStream();
	}

	return await new Response(body as ConstructorParameters<typeof Response>[0]).arrayBuffer();
}

function buildS3PublicUrl(config: MediaS3Config, bucketName: string, key: string) {
	if (!config.endpoint) {
		return null;
	}

	const normalizedKey = key.replace(/^\/+/, "");
	const endpointUrl = new URL(config.endpoint);

	if (config.forcePathStyle) {
		return new URL(
			`${bucketName}/${normalizedKey}`,
			`${endpointUrl.toString().replace(/\/?$/, "/")}`,
		).toString();
	}

	const pathnameSuffix =
		endpointUrl.pathname === "/" ? "/" : `${endpointUrl.pathname.replace(/\/?$/, "/")}`;
	const virtualHostedBase = `${endpointUrl.protocol}//${bucketName}.${endpointUrl.host}${pathnameSuffix}`;

	return new URL(normalizedKey, virtualHostedBase).toString();
}

function createS3Bucket(resolvedConfig: ResolvedS3BucketConfig): MediaBucket {
	return {
		async delete(key) {
			const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
			const client = await getS3Client(resolvedConfig.config);

			await client.send(
				new DeleteObjectCommand({
					Bucket: resolvedConfig.bucketName,
					Key: key,
				}),
			);
		},
		async get(key) {
			const { GetObjectCommand } = await import("@aws-sdk/client-s3");
			const client = await getS3Client(resolvedConfig.config);

			try {
				const output = await client.send(
					new GetObjectCommand({
						Bucket: resolvedConfig.bucketName,
						Key: key,
					}),
				);
				const body = await readS3ObjectBody(output);

				if (!body) {
					return null;
				}

				const httpMetadata = normalizeMediaHttpMetadata({
					cacheControl: output.CacheControl,
					contentDisposition: output.ContentDisposition,
					contentEncoding: output.ContentEncoding,
					contentLanguage: output.ContentLanguage,
					contentType: output.ContentType,
				});

				return {
					body,
					httpEtag: output.ETag,
					httpMetadata,
					size: typeof output.ContentLength === "number" ? output.ContentLength : undefined,
					uploaded: output.LastModified,
					writeHttpMetadata: (headers) => {
						applyMediaHttpMetadata(headers, httpMetadata);

						if (typeof output.ContentLength === "number") {
							headers.set("content-length", String(output.ContentLength));
						}
					},
				};
			} catch (error) {
				if (isS3NotFoundError(error)) {
					return null;
				}

				throw error;
			}
		},
		async put(key, value, options) {
			const { PutObjectCommand } = await import("@aws-sdk/client-s3");
			const client = await getS3Client(resolvedConfig.config);
			const blob = value instanceof Blob ? value : await createBlobFromMediaValue(value);
			const putBody = new Uint8Array(await blob.arrayBuffer());
			const normalizedHttpMetadata = normalizeMediaHttpMetadata(
				options?.httpMetadata ?? (blob.type ? { contentType: blob.type } : undefined),
			);

			await client.send(
				new PutObjectCommand({
					Body: putBody,
					Bucket: resolvedConfig.bucketName,
					CacheControl: normalizedHttpMetadata?.cacheControl,
					ContentDisposition: normalizedHttpMetadata?.contentDisposition,
					ContentEncoding: normalizedHttpMetadata?.contentEncoding,
					ContentLanguage: normalizedHttpMetadata?.contentLanguage,
					ContentType: normalizedHttpMetadata?.contentType,
					Key: key,
				}),
			);
		},
	};
}

export function getConfiguredMediaStorageDriver(): MediaStorageDriver {
	const runtimeDriver = process.env.APP_LMS_MEDIA_STORAGE_DRIVER;
	if (runtimeDriver === "local" || runtimeDriver === "r2") {
		return runtimeDriver;
	}

	return env.mediaStorage.type;
}

export function getMediaStorageDriver(source: RequestLike): MediaStorageDriver {
	if (getConfiguredMediaStorageDriver() === "local") {
		return "local";
	}

	const bindings = getBindings(source);
	if (bindings.PUBLIC_MEDIA_BUCKET || bindings.PRIVATE_MEDIA_BUCKET) {
		return "r2";
	}

	if (hasCompleteS3Config(getConfiguredMediaS3Config())) {
		return "r2";
	}

	return "local";
}

export function getMediaStorageCapabilities(source: RequestLike): MediaStorageCapabilities {
	const driver = getMediaStorageDriver(source);

	return {
		driver,
		supportsDirectPublicUrl: driver === "r2",
		supportsSignedDelivery: true,
	};
}

function resolveMediaBucketInternal(source: RequestLike, visibility: MediaVisibility): MediaBucket {
	if (getMediaStorageDriver(source) === "local") {
		return createLocalBucket(visibility);
	}

	const bindings = getBindings(source);
	const bucket =
		visibility === "public" ? bindings.PUBLIC_MEDIA_BUCKET : bindings.PRIVATE_MEDIA_BUCKET;

	if (!bucket) {
		const resolvedS3BucketConfig = resolveS3BucketConfig(visibility);
		if (resolvedS3BucketConfig) {
			return createS3Bucket(resolvedS3BucketConfig);
		}

		throw new MediaBindingsUnavailableError();
	}

	return bucket;
}

export function getMediaStorageProvider(source: RequestLike): MediaStorageProvider {
	return {
		async createSignedReadUrl(_input) {
			return null;
		},
		async createSignedWriteUrl(_input) {
			return null;
		},
		async deleteObject(input) {
			const bucket = resolveMediaBucketInternal(source, input.visibility);
			await bucket.delete(input.key);
		},
		driver: getMediaStorageDriver(source),
		getBucketName(visibility) {
			return getMediaBucketName(source, visibility);
		},
		getCapabilities() {
			return getMediaStorageCapabilities(source);
		},
		async getObject(input) {
			const bucket = resolveMediaBucketInternal(source, input.visibility);
			return await bucket.get(input.key);
		},
		getPublicDirectUrl(key) {
			return getPublicMediaDirectUrl(source, key);
		},
		async headObject(input) {
			const bucket = resolveMediaBucketInternal(source, input.visibility);
			const object = await bucket.get(input.key);

			if (!object) {
				return null;
			}

			return {
				httpEtag: object.httpEtag,
				httpMetadata: object.httpMetadata,
				size: object.size,
				uploaded: object.uploaded,
			};
		},
		async listPrefix(_input) {
			return null;
		},
		async putObject(input) {
			const bucket = resolveMediaBucketInternal(source, input.visibility);
			await bucket.put(input.key, input.value, {
				httpMetadata: input.httpMetadata,
			});
		},
	};
}

async function getLocalFs() {
	try {
		const [fs, path] = await Promise.all([import("node:fs/promises"), import("node:path")]);

		return { fs, path } satisfies {
			fs: LocalFsModule;
			path: PathModule;
		};
	} catch {
		throw new MediaLocalStorageUnavailableError();
	}
}

function getMediaLocalRoot() {
	return env.mediaStorage.localRoot;
}

async function getLocalBucketBasePath(visibility: MediaVisibility) {
	const { fs, path } = await getLocalFs();
	const root = getMediaLocalRoot();
	const basePath = path.resolve(root, visibility);

	await fs.mkdir(basePath, { recursive: true });

	return { basePath, fs, path };
}

async function resolveLocalObjectPath(key: string, visibility: MediaVisibility) {
	const { basePath, fs, path } = await getLocalBucketBasePath(visibility);
	const objectPath = path.resolve(basePath, key);

	if (!objectPath.startsWith(basePath)) {
		throw new Error("Resolved media path escaped the configured local media root.");
	}

	await fs.mkdir(path.dirname(objectPath), { recursive: true });

	return { fs, objectPath };
}

function getLocalMetadataPath(objectPath: string) {
	return `${objectPath}.metadata.json`;
}

function normalizeMediaHttpMetadata(httpMetadata?: MediaHttpMetadata) {
	if (!httpMetadata) {
		return undefined;
	}

	const normalized = {
		cacheControl: httpMetadata.cacheControl,
		contentDisposition: httpMetadata.contentDisposition,
		contentEncoding: httpMetadata.contentEncoding,
		contentLanguage: httpMetadata.contentLanguage,
		contentType: httpMetadata.contentType,
	};

	if (Object.values(normalized).every((value) => value == null || value === "")) {
		return undefined;
	}

	return normalized;
}

function applyMediaHttpMetadata(headers: Headers, httpMetadata?: MediaHttpMetadata) {
	if (!httpMetadata) {
		return;
	}

	if (httpMetadata.cacheControl) {
		headers.set("cache-control", httpMetadata.cacheControl);
	}

	if (httpMetadata.contentDisposition) {
		headers.set("content-disposition", httpMetadata.contentDisposition);
	}

	if (httpMetadata.contentEncoding) {
		headers.set("content-encoding", httpMetadata.contentEncoding);
	}

	if (httpMetadata.contentLanguage) {
		headers.set("content-language", httpMetadata.contentLanguage);
	}

	if (httpMetadata.contentType) {
		headers.set("content-type", httpMetadata.contentType);
	}
}

async function readLocalObjectMetadata(fs: LocalFsModule, objectPath: string) {
	try {
		const metadataJson = await fs.readFile(getLocalMetadataPath(objectPath), "utf8");
		const parsedMetadata = JSON.parse(metadataJson) as LocalMediaObjectMetadata;

		return {
			httpMetadata: normalizeMediaHttpMetadata(parsedMetadata.httpMetadata),
		};
	} catch (error) {
		const maybeError = error as NodeJS.ErrnoException;
		if (maybeError.code === "ENOENT") {
			return null;
		}

		throw error;
	}
}

async function writeLocalObjectMetadata(
	fs: LocalFsModule,
	objectPath: string,
	httpMetadata?: MediaHttpMetadata,
) {
	const normalizedHttpMetadata = normalizeMediaHttpMetadata(httpMetadata);
	const metadataPath = getLocalMetadataPath(objectPath);

	if (!normalizedHttpMetadata) {
		await fs.rm(metadataPath, { force: true });
		return;
	}

	await fs.writeFile(
		metadataPath,
		JSON.stringify({ httpMetadata: normalizedHttpMetadata } satisfies LocalMediaObjectMetadata),
	);
}

function createLocalBucket(visibility: MediaVisibility): MediaBucket {
	return {
		async delete(key) {
			const { fs, objectPath } = await resolveLocalObjectPath(key, visibility);

			await Promise.all([
				fs.rm(objectPath, { force: true }),
				fs.rm(getLocalMetadataPath(objectPath), { force: true }),
			]);
		},
		async get(key) {
			const { fs, objectPath } = await resolveLocalObjectPath(key, visibility);

			try {
				const [fileBytes, stats, storedMetadata] = await Promise.all([
					fs.readFile(objectPath),
					fs.stat(objectPath),
					readLocalObjectMetadata(fs, objectPath),
				]);

				return {
					body: new Uint8Array(fileBytes),
					httpMetadata: storedMetadata?.httpMetadata,
					size: stats.size,
					uploaded: stats.mtime,
					writeHttpMetadata: (headers) => {
						applyMediaHttpMetadata(headers, storedMetadata?.httpMetadata);
						headers.set("content-length", String(stats.size));
					},
				};
			} catch (error) {
				const maybeError = error as NodeJS.ErrnoException;
				if (maybeError.code === "ENOENT") {
					return null;
				}

				throw error;
			}
		},
		async put(key, value, options) {
			const { fs, objectPath } = await resolveLocalObjectPath(key, visibility);
			const blob = value instanceof Blob ? value : await createBlobFromMediaValue(value);
			const normalizedHttpMetadata = normalizeMediaHttpMetadata(
				options?.httpMetadata ?? (blob.type ? { contentType: blob.type } : undefined),
			);

			const arrayBuffer = await blob.arrayBuffer();
			await Promise.all([
				fs.writeFile(objectPath, new Uint8Array(arrayBuffer)),
				writeLocalObjectMetadata(fs, objectPath, normalizedHttpMetadata),
			]);
		},
	};
}

async function createBlobFromMediaValue(
	value: ReadableStream | ArrayBuffer | ArrayBufferView | string,
) {
	if (value instanceof ReadableStream) {
		return await new Response(value).blob();
	}

	if (typeof value === "string" || value instanceof ArrayBuffer) {
		return new Blob([value]);
	}

	const normalizedView = Uint8Array.from(
		new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
	);

	return new Blob([normalizedView.buffer]);
}

export function getMediaBucket(source: RequestLike, visibility: MediaVisibility): MediaBucket {
	const provider = getMediaStorageProvider(source);

	return {
		async delete(key) {
			await provider.deleteObject({
				key,
				visibility,
			});
		},
		async get(key) {
			return await provider.getObject({
				key,
				visibility,
			});
		},
		async put(key, value, options) {
			await provider.putObject({
				httpMetadata: options?.httpMetadata,
				key,
				value,
				visibility,
			});
		},
	};
}

export function getConfiguredMediaBucket(visibility: MediaVisibility): MediaBucket | null {
	if (getConfiguredMediaStorageDriver() !== "local") {
		return null;
	}

	return createLocalBucket(visibility);
}

export function getMediaBucketName(
	source: RequestLike,
	visibility: MediaVisibility,
): string | null {
	if (getMediaStorageDriver(source) === "local") {
		return visibility === "public" ? "local-public-media" : "local-private-media";
	}

	const bindings = getBindings(source);
	const bindingBucketName =
		visibility === "public"
			? (bindings.PUBLIC_MEDIA_BUCKET_NAME ?? null)
			: (bindings.PRIVATE_MEDIA_BUCKET_NAME ?? null);

	if (bindingBucketName) {
		return bindingBucketName;
	}

	const resolvedS3BucketConfig = resolveS3BucketConfig(visibility);
	return resolvedS3BucketConfig?.bucketName ?? null;
}

export function getPublicMediaDirectUrl(source: RequestLike, key: string): string | null {
	if (getMediaStorageDriver(source) === "local") {
		return null;
	}

	const devDomain = getBindings(source).PUBLIC_MEDIA_DEV_DOMAIN;
	if (devDomain) {
		const normalizedDomain =
			devDomain.startsWith("http://") || devDomain.startsWith("https://")
				? devDomain
				: `https://${devDomain}`;

		return new URL(key, `${normalizedDomain.replace(/\/$/, "")}/`).toString();
	}

	const resolvedS3BucketConfig = resolveS3BucketConfig("public");
	if (!resolvedS3BucketConfig) {
		return null;
	}

	return buildS3PublicUrl(resolvedS3BucketConfig.config, resolvedS3BucketConfig.bucketName, key);
}

export function createStorageKey(options: {
	fileName: string;
	userId: string;
	visibility: MediaVisibility;
}) {
	const now = new Date();
	const safeFileName = sanitizeFileName(options.fileName);
	const datePath = [
		now.getUTCFullYear(),
		String(now.getUTCMonth() + 1).padStart(2, "0"),
		String(now.getUTCDate()).padStart(2, "0"),
	].join("/");

	return [
		options.userId,
		datePath,
		`${options.visibility}-${crypto.randomUUID()}-${safeFileName}`,
	].join("/");
}

export function createMediaAccessUrl(
	source: RequestLike,
	visibility: MediaVisibility,
	key: string,
) {
	return new URL(`/api/media/${visibility}/${key}`, resolveRequest(source).url).toString();
}

export function createMediaObjectResponse(
	object: MediaObject,
	visibility: MediaVisibility,
): MediaObjectResponse {
	const headers = new Headers();
	object.writeHttpMetadata?.(headers);

	if (!headers.has("content-type")) {
		headers.set("content-type", "application/octet-stream");
	}

	if (object.httpEtag && !headers.has("etag")) {
		headers.set("etag", object.httpEtag);
	}

	if (visibility === "private") {
		headers.set("cache-control", "private, no-store, max-age=0");
	} else if (!headers.has("cache-control")) {
		headers.set("cache-control", "public, max-age=31536000, immutable");
	}

	return new Response(object.body, {
		headers,
		status: 200,
	});
}

function sanitizeFileName(fileName: string) {
	const trimmed = fileName.trim().toLowerCase();
	const normalized = trimmed.replace(/\s+/g, "-");
	const sanitized = normalized.replace(/[^a-z0-9._-]/g, "");

	return sanitized || "file";
}
