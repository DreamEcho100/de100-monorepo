import type { S3Client as AwsS3Client, GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { env } from "@de100/apps-lms-env/server";
import type {
	CreateUploadTargetOutput,
	FilesStorageBackend,
	FilesUploadTargetProtocol,
} from "@de100/files-shared";

export type FilesVisibility = "public" | "private";
export type FilesStorageDriver = "local" | "s3";
export type FilesS3Provider = "aws" | "custom" | "minio" | "r2";

type RequestLike = Request | { request: Request };

export type FilesHttpMetadata = {
	cacheControl?: string;
	contentDisposition?: string;
	contentEncoding?: string;
	contentLanguage?: string;
	contentType?: string;
};

type FilesPutOptions = {
	httpMetadata?: FilesHttpMetadata;
};

type FilesObject = {
	body: ConstructorParameters<typeof Response>[0];
	httpEtag?: string;
	httpMetadata?: FilesHttpMetadata;
	size?: number;
	uploaded?: Date;
	writeHttpMetadata?: (headers: Headers) => void;
};

type FilesObjectResponse = Pick<globalThis.Response, "body" | "headers" | "status" | "statusText">;

export type FilesBucket = {
	delete(key: string): Promise<void>;
	get(key: string): Promise<FilesObject | null>;
	put(
		key: string,
		value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
		options?: FilesPutOptions,
	): Promise<unknown>;
};

export type FilesStorageCapabilities = {
	driver: FilesStorageDriver;
	provider: FilesS3Provider | null;
	supportsDirectPublicUrl: boolean;
	supportsSignedDelivery: boolean;
};

export type FilesObjectHead = Pick<FilesObject, "httpEtag" | "httpMetadata" | "size" | "uploaded">;

export type PutFilesObjectInput = {
	httpMetadata?: FilesHttpMetadata;
	key: string;
	value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob;
	visibility: FilesVisibility;
};

export type ReadFilesObjectInput = {
	key: string;
	visibility: FilesVisibility;
};

export type SignedFilesUrlInput = {
	expiresInSeconds: number;
	key: string;
	visibility: FilesVisibility;
};

export type FilesStorageProvider = {
	createSignedReadUrl(input: SignedFilesUrlInput): Promise<string | null>;
	createSignedWriteUrl(input: SignedFilesUrlInput): Promise<string | null>;
	deleteObject(input: ReadFilesObjectInput): Promise<void>;
	driver: FilesStorageDriver;
	getBucketName(visibility: FilesVisibility): string | null;
	getCapabilities(): FilesStorageCapabilities;
	getObject(input: ReadFilesObjectInput): Promise<FilesObject | null>;
	getPublicDirectUrl(key: string): string | null;
	headObject(input: ReadFilesObjectInput): Promise<FilesObjectHead | null>;
	listPrefix(input: { prefix: string; visibility: FilesVisibility }): Promise<string[] | null>;
	putObject(input: PutFilesObjectInput): Promise<void>;
};

export type CreateFilesStorageUploadTargetInput = {
	contentType: string;
	expiresInSeconds: number;
	fields?: Record<string, string>;
	key: string;
	protocol: FilesUploadTargetProtocol;
	sessionId: string;
	targetId: string;
	visibility: FilesVisibility;
};

type FilesBindings = {
	PRIVATE_FILES_BUCKET: FilesBucket;
	PRIVATE_FILES_BUCKET_NAME: string;
	PUBLIC_FILES_BUCKET: FilesBucket;
	PUBLIC_FILES_BUCKET_NAME: string;
	PUBLIC_FILES_DEV_DOMAIN?: string;
};

type FilesS3Config = {
	accessKeyId?: string;
	endpoint?: string;
	forcePathStyle: boolean;
	privateBucket?: string;
	provider: FilesS3Provider;
	publicBucket?: string;
	region: string;
	secretAccessKey?: string;
};

type ResolvedS3BucketConfig = {
	bucketName: string;
	config: FilesS3Config;
};

type LocalFsModule = typeof import("node:fs/promises");
type PathModule = typeof import("node:path");

type LocalFilesObjectMetadata = {
	httpMetadata?: FilesHttpMetadata;
};

type RuntimeBindingRequest = Request & {
	runtime?: {
		cloudflare?: {
			env?: Partial<FilesBindings>;
		};
	};
};

export class FilesStorageUnavailableError extends Error {}

export class FilesBindingsUnavailableError extends FilesStorageUnavailableError {
	constructor() {
		super(
			"Files storage is unavailable for this request. Configure runtime bucket bindings or APP_LMS_FILES_S3_* values, or switch APP_LMS_FILES_STORAGE_DRIVER to local.",
		);
	}
}

export class FilesLocalStorageUnavailableError extends FilesStorageUnavailableError {
	constructor() {
		super(
			"Local files storage is unavailable in this runtime. Use the Node-based local dev server or switch APP_LMS_FILES_STORAGE_DRIVER back to s3.",
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

function getBindings(source: RequestLike): Partial<FilesBindings> {
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

function getConfiguredFilesS3Config(): FilesS3Config {
	const configuredS3Values = env.filesStorage.type === "s3" ? env.filesStorage.s3 : null;
	const forcePathStyleOverride = parseRuntimeBoolean(
		getRuntimeEnvValue("APP_LMS_FILES_S3_FORCE_PATH_STYLE"),
	);

	return {
		accessKeyId:
			getRuntimeEnvValue("APP_LMS_FILES_S3_ACCESS_KEY_ID") ?? configuredS3Values?.accessKeyId,
		endpoint: getRuntimeEnvValue("APP_LMS_FILES_S3_ENDPOINT") ?? configuredS3Values?.endpoint,
		forcePathStyle: forcePathStyleOverride ?? configuredS3Values?.forcePathStyle ?? true,
		privateBucket:
			getRuntimeEnvValue("APP_LMS_FILES_S3_PRIVATE_BUCKET") ?? configuredS3Values?.privateBucket,
		provider:
			(getRuntimeEnvValue("APP_LMS_FILES_S3_PROVIDER") as FilesS3Provider | undefined) ??
			configuredS3Values?.provider ??
			"r2",
		publicBucket:
			getRuntimeEnvValue("APP_LMS_FILES_S3_PUBLIC_BUCKET") ?? configuredS3Values?.publicBucket,
		region: getRuntimeEnvValue("APP_LMS_FILES_S3_REGION") ?? configuredS3Values?.region ?? "auto",
		secretAccessKey:
			getRuntimeEnvValue("APP_LMS_FILES_S3_SECRET_ACCESS_KEY") ??
			configuredS3Values?.secretAccessKey,
	};
}

function hasCompleteS3Config(config: FilesS3Config) {
	const hasAccessKeyId = Boolean(config.accessKeyId);
	const hasSecretAccessKey = Boolean(config.secretAccessKey);

	if (hasAccessKeyId !== hasSecretAccessKey) {
		return false;
	}

	return Boolean(config.endpoint && config.publicBucket && config.privateBucket);
}

function resolveS3BucketConfig(visibility: FilesVisibility): ResolvedS3BucketConfig | null {
	if (getConfiguredFilesStorageDriver() !== "s3") {
		return null;
	}

	const config = getConfiguredFilesS3Config();
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

function buildS3ClientSignature(config: FilesS3Config) {
	return [
		config.endpoint ?? "",
		config.region,
		config.forcePathStyle ? "1" : "0",
		config.accessKeyId ?? "",
		config.secretAccessKey ?? "",
	].join("|");
}

async function getS3Client(config: FilesS3Config): Promise<AwsS3Client> {
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

function buildS3PublicUrl(config: FilesS3Config, bucketName: string, key: string) {
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

function createS3Bucket(resolvedConfig: ResolvedS3BucketConfig): FilesBucket {
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

				const httpMetadata = normalizeFilesHttpMetadata({
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
						applyFilesHttpMetadata(headers, httpMetadata);

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
			const blob = value instanceof Blob ? value : await createBlobFromFilesValue(value);
			const putBody = new Uint8Array(await blob.arrayBuffer());
			const normalizedHttpMetadata = normalizeFilesHttpMetadata(
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

export function getConfiguredFilesStorageDriver(): FilesStorageDriver {
	const runtimeDriver = process.env.APP_LMS_FILES_STORAGE_DRIVER;
	if (runtimeDriver === "local" || runtimeDriver === "s3") {
		return runtimeDriver;
	}

	return env.filesStorage.type;
}

export function getFilesStorageDriver(source: RequestLike): FilesStorageDriver {
	if (getConfiguredFilesStorageDriver() === "local") {
		return "local";
	}

	const bindings = getBindings(source);
	if (bindings.PUBLIC_FILES_BUCKET || bindings.PRIVATE_FILES_BUCKET) {
		return "s3";
	}

	if (hasCompleteS3Config(getConfiguredFilesS3Config())) {
		return "s3";
	}

	return "local";
}

export function getFilesStorageCapabilities(source: RequestLike): FilesStorageCapabilities {
	const driver = getFilesStorageDriver(source);

	return {
		driver,
		provider: driver === "s3" ? getConfiguredFilesS3Config().provider : null,
		supportsDirectPublicUrl: driver === "s3",
		supportsSignedDelivery: true,
	};
}

export function getFilesStorageBackend(source: RequestLike): FilesStorageBackend {
	const capabilities = getFilesStorageCapabilities(source);
	if (capabilities.driver === "local") {
		return "local-fs";
	}

	switch (capabilities.provider) {
		case "minio":
			return "minio-s3";
		case "r2":
			return "r2-s3";
		case "aws":
		case "custom":
		case null:
			return "s3-compatible";
		default: {
			const exhaustive: never = capabilities.provider;
			throw new Error(`Unsupported files storage provider: ${exhaustive}`);
		}
	}
}

function resolveFilesBucketInternal(source: RequestLike, visibility: FilesVisibility): FilesBucket {
	if (getFilesStorageDriver(source) === "local") {
		return createLocalBucket(visibility);
	}

	const bindings = getBindings(source);
	const bucket =
		visibility === "public" ? bindings.PUBLIC_FILES_BUCKET : bindings.PRIVATE_FILES_BUCKET;

	if (!bucket) {
		const resolvedS3BucketConfig = resolveS3BucketConfig(visibility);
		if (resolvedS3BucketConfig) {
			return createS3Bucket(resolvedS3BucketConfig);
		}

		throw new FilesBindingsUnavailableError();
	}

	return bucket;
}

export function getFilesStorageProvider(source: RequestLike): FilesStorageProvider {
	return {
		async createSignedReadUrl(_input) {
			return null;
		},
		async createSignedWriteUrl(_input) {
			return null;
		},
		async deleteObject(input) {
			const bucket = resolveFilesBucketInternal(source, input.visibility);
			await bucket.delete(input.key);
		},
		driver: getFilesStorageDriver(source),
		getBucketName(visibility) {
			return getFilesBucketName(source, visibility);
		},
		getCapabilities() {
			return getFilesStorageCapabilities(source);
		},
		async getObject(input) {
			const bucket = resolveFilesBucketInternal(source, input.visibility);
			return await bucket.get(input.key);
		},
		getPublicDirectUrl(key) {
			return getPublicFilesDirectUrl(source, key);
		},
		async headObject(input) {
			const bucket = resolveFilesBucketInternal(source, input.visibility);
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
			const bucket = resolveFilesBucketInternal(source, input.visibility);
			await bucket.put(input.key, input.value, {
				httpMetadata: input.httpMetadata,
			});
		},
	};
}

export async function createFilesStorageUploadTarget(
	source: RequestLike,
	input: CreateFilesStorageUploadTargetInput,
): Promise<CreateUploadTargetOutput | null> {
	const expiresAt = new Date(Date.now() + input.expiresInSeconds * 1000);
	const baseTarget = {
		expiresAt,
		protocol: input.protocol,
		sessionId: input.sessionId,
		targetId: input.targetId,
	} satisfies Pick<CreateUploadTargetOutput, "expiresAt" | "protocol" | "sessionId" | "targetId">;

	if (input.protocol === "xhr" || input.protocol === "tus") {
		return {
			...baseTarget,
			fields: {
				...input.fields,
				key: input.key,
			},
			headers: input.contentType ? { "content-type": input.contentType } : null,
			method: "POST",
			uploadUrl: createFilesServerUploadUrl(source, input.protocol, input.sessionId),
		};
	}

	if (input.protocol === "s3-put") {
		const uploadUrl = await createS3PresignedPutUploadUrl(source, input);
		if (!uploadUrl) {
			return null;
		}

		return {
			...baseTarget,
			fields: {
				...input.fields,
				key: input.key,
			},
			headers: input.contentType ? { "content-type": input.contentType } : null,
			method: "PUT",
			uploadUrl,
		};
	}

	if (input.protocol === "s3-multipart") {
		const multipart = await createS3MultipartUpload(source, input);
		if (!multipart) {
			return null;
		}

		return {
			...baseTarget,
			fields: {
				...input.fields,
				bucket: multipart.bucket,
				key: input.key,
				uploadId: multipart.uploadId,
			},
			headers: input.contentType ? { "content-type": input.contentType } : null,
			method: "POST",
			uploadUrl: createFilesServerUploadUrl(source, input.protocol, input.sessionId),
		};
	}

	return null;
}

async function getLocalFs() {
	try {
		const [fs, path] = await Promise.all([import("node:fs/promises"), import("node:path")]);

		return { fs, path } satisfies {
			fs: LocalFsModule;
			path: PathModule;
		};
	} catch {
		throw new FilesLocalStorageUnavailableError();
	}
}

function getFilesLocalRoot() {
	return env.filesStorage.localRoot;
}

async function getLocalBucketBasePath(visibility: FilesVisibility) {
	const { fs, path } = await getLocalFs();
	const root = getFilesLocalRoot();
	const basePath = path.resolve(root, visibility);

	await fs.mkdir(basePath, { recursive: true });

	return { basePath, fs, path };
}

async function resolveLocalObjectPath(key: string, visibility: FilesVisibility) {
	const { basePath, fs, path } = await getLocalBucketBasePath(visibility);
	const objectPath = path.resolve(basePath, key);

	if (!objectPath.startsWith(basePath)) {
		throw new Error("Resolved files path escaped the configured local files root.");
	}

	await fs.mkdir(path.dirname(objectPath), { recursive: true });

	return { fs, objectPath };
}

function getLocalMetadataPath(objectPath: string) {
	return `${objectPath}.metadata.json`;
}

function normalizeFilesHttpMetadata(httpMetadata?: FilesHttpMetadata) {
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

function applyFilesHttpMetadata(headers: Headers, httpMetadata?: FilesHttpMetadata) {
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
		const parsedMetadata = JSON.parse(metadataJson) as LocalFilesObjectMetadata;

		return {
			httpMetadata: normalizeFilesHttpMetadata(parsedMetadata.httpMetadata),
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
	httpMetadata?: FilesHttpMetadata,
) {
	const normalizedHttpMetadata = normalizeFilesHttpMetadata(httpMetadata);
	const metadataPath = getLocalMetadataPath(objectPath);

	if (!normalizedHttpMetadata) {
		await fs.rm(metadataPath, { force: true });
		return;
	}

	await fs.writeFile(
		metadataPath,
		JSON.stringify({ httpMetadata: normalizedHttpMetadata } satisfies LocalFilesObjectMetadata),
	);
}

function createLocalBucket(visibility: FilesVisibility): FilesBucket {
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
						applyFilesHttpMetadata(headers, storedMetadata?.httpMetadata);
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
			const blob = value instanceof Blob ? value : await createBlobFromFilesValue(value);
			const normalizedHttpMetadata = normalizeFilesHttpMetadata(
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

async function createBlobFromFilesValue(
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

export function getFilesBucket(source: RequestLike, visibility: FilesVisibility): FilesBucket {
	const provider = getFilesStorageProvider(source);

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

export function getConfiguredFilesBucket(visibility: FilesVisibility): FilesBucket | null {
	if (getConfiguredFilesStorageDriver() !== "local") {
		return null;
	}

	return createLocalBucket(visibility);
}

export function getFilesBucketName(
	source: RequestLike,
	visibility: FilesVisibility,
): string | null {
	if (getFilesStorageDriver(source) === "local") {
		return visibility === "public" ? "local-public-files" : "local-private-files";
	}

	const bindings = getBindings(source);
	const bindingBucketName =
		visibility === "public"
			? (bindings.PUBLIC_FILES_BUCKET_NAME ?? null)
			: (bindings.PRIVATE_FILES_BUCKET_NAME ?? null);

	if (bindingBucketName) {
		return bindingBucketName;
	}

	const resolvedS3BucketConfig = resolveS3BucketConfig(visibility);
	return resolvedS3BucketConfig?.bucketName ?? null;
}

async function createS3PresignedPutUploadUrl(
	source: RequestLike,
	input: Pick<
		CreateFilesStorageUploadTargetInput,
		"contentType" | "expiresInSeconds" | "key" | "visibility"
	>,
): Promise<string | null> {
	const resolvedConfig = resolveS3BucketConfigForRequest(source, input.visibility);
	if (!resolvedConfig) {
		return null;
	}

	const { PutObjectCommand } = await import("@aws-sdk/client-s3");
	const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
	const client = await getS3Client(resolvedConfig.config);
	const command = new PutObjectCommand({
		Bucket: resolvedConfig.bucketName,
		ContentType: input.contentType,
		Key: input.key,
	});

	return getSignedUrl(client as never, command as never, {
		expiresIn: Math.max(1, input.expiresInSeconds),
	});
}

async function createS3MultipartUpload(
	source: RequestLike,
	input: Pick<CreateFilesStorageUploadTargetInput, "contentType" | "key" | "visibility">,
): Promise<{ bucket: string; uploadId: string } | null> {
	const resolvedConfig = resolveS3BucketConfigForRequest(source, input.visibility);
	if (!resolvedConfig) {
		return null;
	}

	const { CreateMultipartUploadCommand } = await import("@aws-sdk/client-s3");
	const client = await getS3Client(resolvedConfig.config);
	const output = await client.send(
		new CreateMultipartUploadCommand({
			Bucket: resolvedConfig.bucketName,
			ContentType: input.contentType,
			Key: input.key,
		}),
	);

	return output.UploadId
		? {
				bucket: resolvedConfig.bucketName,
				uploadId: output.UploadId,
			}
		: null;
}

function resolveS3BucketConfigForRequest(
	source: RequestLike,
	visibility: FilesVisibility,
): ResolvedS3BucketConfig | null {
	if (getFilesStorageDriver(source) !== "s3") {
		return null;
	}

	return resolveS3BucketConfig(visibility);
}

function createFilesServerUploadUrl(
	source: RequestLike,
	protocol: FilesUploadTargetProtocol,
	sessionId: string,
) {
	return new URL(
		`/api/files/upload/${protocol}/${sessionId}`,
		resolveRequest(source).url,
	).toString();
}

export function getPublicFilesDirectUrl(source: RequestLike, key: string): string | null {
	if (getFilesStorageDriver(source) === "local") {
		return null;
	}

	const devDomain = getBindings(source).PUBLIC_FILES_DEV_DOMAIN;
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

export function createFilesStorageKey(options: {
	fileName: string;
	userId: string;
	visibility: FilesVisibility;
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

export function createFilesAccessUrl(
	source: RequestLike,
	visibility: FilesVisibility,
	key: string,
) {
	return new URL(`/api/files/${visibility}/${key}`, resolveRequest(source).url).toString();
}

export function createFilesObjectResponse(
	object: FilesObject,
	visibility: FilesVisibility,
): FilesObjectResponse {
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
