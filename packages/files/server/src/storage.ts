import type {
	FileVisibility,
	LocalStorageProviderConfig,
	S3StorageProviderConfig,
	StorageProviderConfig,
} from "@de100/files-shared";
import { FilesError, filesErrorCodes } from "@de100/files-shared";

export type FileHttpMetadata = {
	cacheControl?: string;
	contentDisposition?: string;
	contentEncoding?: string;
	contentLanguage?: string;
	contentType?: string;
};

export type FileObject = {
	body: BodyInit | null;
	httpEtag?: string;
	httpMetadata?: FileHttpMetadata;
	size?: number;
	uploadedAt?: Date;
	writeHttpMetadata?: (headers: Headers) => void;
};

export type PutFileObjectInput = {
	httpMetadata?: FileHttpMetadata;
	key: string;
	value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob;
	visibility: FileVisibility;
};

export type ReadFileObjectInput = {
	key: string;
	visibility: FileVisibility;
};

export type CreateFileUploadTargetInput = {
	contentType: string;
	expiresInSeconds: number;
	key: string;
	method: "POST" | "PUT";
	protocol: "s3-put" | "s3-multipart" | "tus" | "xhr" | "custom";
	visibility: FileVisibility;
};

export type FileUploadTarget = {
	expiresAt: Date | null;
	fields: Record<string, string> | null;
	headers: Record<string, string> | null;
	method: "POST" | "PUT";
	uploadUrl: string;
};

export type FilesStorageProvider = {
	createUploadTarget(input: CreateFileUploadTargetInput): Promise<FileUploadTarget | null>;
	deleteObject(input: ReadFileObjectInput): Promise<void>;
	getBucketName(visibility: FileVisibility): string | null;
	getObject(input: ReadFileObjectInput): Promise<FileObject | null>;
	getPublicUrl(key: string): string | null;
	id: string;
	putObject(input: PutFileObjectInput): Promise<void>;
};

export type CreateStorageProviderOptions = {
	config: StorageProviderConfig;
	customProvider?: FilesStorageProvider;
	uploadRouteBasePath?: string;
};

export function createStorageProvider(options: CreateStorageProviderOptions): FilesStorageProvider {
	const uploadRoutes = {
		basePath: options.uploadRouteBasePath ?? "/api/files",
	};

	if (options.config.type === "local") {
		return createLocalStorageProvider(options.config, uploadRoutes);
	}

	if (options.config.type === "s3") {
		return createS3CompatibleStorageProvider(options.config, uploadRoutes);
	}

	if (options.config.type === "custom") {
		if (!options.customProvider) {
			throw new FilesError(
				filesErrorCodes.providerUnavailable,
				`Custom storage provider ${options.config.providerId} was not injected.`,
			);
		}

		return options.customProvider;
	}

	throw new FilesError(
		filesErrorCodes.providerUnavailable,
		`${options.config.type} storage is declared but requires an app-provided adapter.`,
	);
}

export function createServerRoutedUploadTarget(
	input: CreateFileUploadTargetInput,
	options: { basePath?: string } = {},
): FileUploadTarget {
	const uploadUrl = createServerRoutedUploadUrl(input, options.basePath ?? "/api/files");

	return {
		expiresAt: createUploadTargetExpiration(input.expiresInSeconds),
		fields: null,
		headers: input.contentType ? { "content-type": input.contentType } : null,
		method: input.method,
		uploadUrl,
	};
}

export function createFileObjectResponse(object: FileObject, visibility: FileVisibility): Response {
	const headers = new Headers();
	object.writeHttpMetadata?.(headers);
	applyFileHttpMetadata(headers, object.httpMetadata);

	if (!headers.has("content-type")) {
		headers.set("content-type", "application/octet-stream");
	}

	if (object.httpEtag && !headers.has("etag")) {
		headers.set("etag", object.httpEtag);
	}

	if (typeof object.size === "number" && !headers.has("content-length")) {
		headers.set("content-length", String(object.size));
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

function createLocalStorageProvider(
	config: LocalStorageProviderConfig,
	uploadRoutes: { basePath: string },
): FilesStorageProvider {
	return {
		async createUploadTarget(input) {
			if (input.protocol === "xhr" || input.protocol === "tus") {
				return createServerRoutedUploadTarget(input, uploadRoutes);
			}

			return null;
		},
		async deleteObject(input) {
			const { fs, objectPath } = await resolveLocalObjectPath(config, input);
			await Promise.all([
				fs.rm(objectPath, { force: true }),
				fs.rm(getLocalMetadataPath(objectPath), { force: true }),
			]);
		},
		getBucketName(visibility) {
			return visibility === "public" ? "local-public-files" : "local-private-files";
		},
		async getObject(input) {
			const { fs, objectPath } = await resolveLocalObjectPath(config, input);
			try {
				const [fileBytes, stats, metadata] = await Promise.all([
					fs.readFile(objectPath),
					fs.stat(objectPath),
					readLocalObjectMetadata(fs, objectPath),
				]);

				return {
					body: Uint8Array.from(fileBytes).buffer,
					httpMetadata: metadata,
					size: stats.size,
					uploadedAt: stats.mtime,
				};
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === "ENOENT") {
					return null;
				}

				throw error;
			}
		},
		getPublicUrl() {
			return null;
		},
		id: "local",
		async putObject(input) {
			const { fs, objectPath } = await resolveLocalObjectPath(config, input);
			const blob =
				input.value instanceof Blob ? input.value : await createBlobFromFileValue(input.value);
			await Promise.all([
				fs.writeFile(objectPath, new Uint8Array(await blob.arrayBuffer())),
				writeLocalObjectMetadata(fs, objectPath, input.httpMetadata),
			]);
		},
	};
}

function createS3CompatibleStorageProvider(
	config: S3StorageProviderConfig,
	uploadRoutes: { basePath: string },
): FilesStorageProvider {
	return {
		async createUploadTarget(input) {
			if (input.protocol === "s3-put") {
				return createS3PresignedPutUploadTarget(config, input);
			}

			if (input.protocol === "s3-multipart") {
				return createS3MultipartUploadTarget(config, input, uploadRoutes);
			}

			if (input.protocol === "xhr" || input.protocol === "tus") {
				return createServerRoutedUploadTarget(input, uploadRoutes);
			}

			return null;
		},
		async deleteObject(input) {
			const { DeleteObjectCommand, S3Client } = await import("@aws-sdk/client-s3");
			const client = new S3Client(buildS3ClientConfig(config));
			await client.send(
				new DeleteObjectCommand({
					Bucket: getS3BucketName(config, input.visibility),
					Key: input.key,
				}),
			);
		},
		getBucketName(visibility) {
			return getS3BucketName(config, visibility);
		},
		async getObject(input) {
			const { GetObjectCommand, S3Client } = await import("@aws-sdk/client-s3");
			const client = new S3Client(buildS3ClientConfig(config));

			try {
				const output = await client.send(
					new GetObjectCommand({
						Bucket: getS3BucketName(config, input.visibility),
						Key: input.key,
					}),
				);
				const body = output.Body ? await new Response(output.Body as BodyInit).arrayBuffer() : null;

				if (!body) {
					return null;
				}

				return {
					body,
					httpEtag: output.ETag,
					httpMetadata: normalizeFileHttpMetadata({
						cacheControl: output.CacheControl,
						contentDisposition: output.ContentDisposition,
						contentEncoding: output.ContentEncoding,
						contentLanguage: output.ContentLanguage,
						contentType: output.ContentType,
					}),
					size: output.ContentLength,
					uploadedAt: output.LastModified,
				};
			} catch (error) {
				if (isS3NotFoundError(error)) {
					return null;
				}

				throw error;
			}
		},
		getPublicUrl(key) {
			if (config.publicBaseUrl) {
				return new URL(
					key.replace(/^\/+/, ""),
					`${config.publicBaseUrl.replace(/\/$/, "")}/`,
				).toString();
			}

			if (!config.endpoint) {
				return null;
			}

			return buildS3PublicUrl(config, key);
		},
		id: `s3:${config.profile}`,
		async putObject(input) {
			const { PutObjectCommand, S3Client } = await import("@aws-sdk/client-s3");
			const client = new S3Client(buildS3ClientConfig(config));
			const blob =
				input.value instanceof Blob ? input.value : await createBlobFromFileValue(input.value);
			const httpMetadata = normalizeFileHttpMetadata(
				input.httpMetadata ?? (blob.type ? { contentType: blob.type } : undefined),
			);

			await client.send(
				new PutObjectCommand({
					Body: new Uint8Array(await blob.arrayBuffer()),
					Bucket: getS3BucketName(config, input.visibility),
					CacheControl: httpMetadata?.cacheControl,
					ContentDisposition: httpMetadata?.contentDisposition,
					ContentEncoding: httpMetadata?.contentEncoding,
					ContentLanguage: httpMetadata?.contentLanguage,
					ContentType: httpMetadata?.contentType,
					Key: input.key,
				}),
			);
		},
	};
}

async function createS3PresignedPutUploadTarget(
	config: S3StorageProviderConfig,
	input: CreateFileUploadTargetInput,
): Promise<FileUploadTarget> {
	const { PutObjectCommand, S3Client } = await import("@aws-sdk/client-s3");
	const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
	const client = new S3Client(buildS3ClientConfig(config));
	const command = new PutObjectCommand({
		Bucket: getS3BucketName(config, input.visibility),
		ContentType: input.contentType,
		Key: input.key,
	});

	return {
		expiresAt: createUploadTargetExpiration(input.expiresInSeconds),
		fields: null,
		headers: { "content-type": input.contentType },
		method: "PUT",
		uploadUrl: await getSignedUrl(client as never, command as never, {
			expiresIn: Math.max(1, input.expiresInSeconds),
		}),
	};
}

async function createS3MultipartUploadTarget(
	config: S3StorageProviderConfig,
	input: CreateFileUploadTargetInput,
	uploadRoutes: { basePath: string },
): Promise<FileUploadTarget> {
	const { CreateMultipartUploadCommand, S3Client } = await import("@aws-sdk/client-s3");
	const client = new S3Client(buildS3ClientConfig(config));
	const output = await client.send(
		new CreateMultipartUploadCommand({
			Bucket: getS3BucketName(config, input.visibility),
			ContentType: input.contentType,
			Key: input.key,
		}),
	);

	if (!output.UploadId) {
		throw new FilesError(
			filesErrorCodes.storageFailed,
			"S3 multipart upload creation did not return an upload ID.",
		);
	}

	return {
		expiresAt: createUploadTargetExpiration(input.expiresInSeconds),
		fields: {
			bucket: getS3BucketName(config, input.visibility),
			key: input.key,
			uploadId: output.UploadId,
		},
		headers: input.contentType ? { "content-type": input.contentType } : null,
		method: "POST",
		uploadUrl: createServerRoutedUploadUrl(input, uploadRoutes.basePath),
	};
}

function getS3BucketName(config: S3StorageProviderConfig, visibility: FileVisibility) {
	return visibility === "public" ? config.buckets.publicBucket : config.buckets.privateBucket;
}

function buildS3ClientConfig(config: S3StorageProviderConfig) {
	return {
		credentials:
			config.accessKeyId && config.secretAccessKey
				? {
						accessKeyId: config.accessKeyId,
						secretAccessKey: config.secretAccessKey,
					}
				: undefined,
		endpoint: config.endpoint,
		forcePathStyle: config.forcePathStyle,
		region: config.region,
	};
}

function buildS3PublicUrl(config: S3StorageProviderConfig, key: string) {
	if (!config.endpoint) {
		return null;
	}

	const endpoint = new URL(config.endpoint);
	const bucketName = config.buckets.publicBucket;
	const normalizedKey = key.replace(/^\/+/, "");

	if (config.forcePathStyle) {
		return new URL(
			`${bucketName}/${normalizedKey}`,
			`${endpoint.toString().replace(/\/?$/, "/")}`,
		).toString();
	}

	const pathname = endpoint.pathname === "/" ? "/" : `${endpoint.pathname.replace(/\/?$/, "/")}`;
	return new URL(
		normalizedKey,
		`${endpoint.protocol}//${bucketName}.${endpoint.host}${pathname}`,
	).toString();
}

function createUploadTargetExpiration(expiresInSeconds: number) {
	return new Date(Date.now() + Math.max(1, expiresInSeconds) * 1000);
}

function createServerRoutedUploadUrl(input: CreateFileUploadTargetInput, basePath: string) {
	const normalizedBasePath = `/${basePath.replace(/^\/+|\/+$/g, "")}`;
	const uploadUrl = new URL(`${normalizedBasePath}/upload/${input.protocol}`, "http://files.local");
	uploadUrl.searchParams.set("key", input.key);
	uploadUrl.searchParams.set("visibility", input.visibility);

	return `${uploadUrl.pathname}${uploadUrl.search}`;
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

async function resolveLocalObjectPath(
	config: LocalStorageProviderConfig,
	input: ReadFileObjectInput,
) {
	const [fs, path] = await Promise.all([import("node:fs/promises"), import("node:path")]);
	const basePath = path.resolve(config.root, input.visibility);
	const objectPath = path.resolve(basePath, input.key);

	if (!objectPath.startsWith(basePath)) {
		throw new FilesError(filesErrorCodes.storageFailed, "Resolved file path escaped storage root.");
	}

	await fs.mkdir(path.dirname(objectPath), { recursive: true });
	return { fs, objectPath };
}

function getLocalMetadataPath(objectPath: string) {
	return `${objectPath}.metadata.json`;
}

async function readLocalObjectMetadata(
	fs: typeof import("node:fs/promises"),
	objectPath: string,
): Promise<FileHttpMetadata | undefined> {
	try {
		const raw = await fs.readFile(getLocalMetadataPath(objectPath), "utf8");
		return normalizeFileHttpMetadata(JSON.parse(raw) as FileHttpMetadata);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return undefined;
		}

		throw error;
	}
}

async function writeLocalObjectMetadata(
	fs: typeof import("node:fs/promises"),
	objectPath: string,
	metadata?: FileHttpMetadata,
) {
	const normalized = normalizeFileHttpMetadata(metadata);
	const metadataPath = getLocalMetadataPath(objectPath);
	if (!normalized) {
		await fs.rm(metadataPath, { force: true });
		return;
	}

	await fs.writeFile(metadataPath, JSON.stringify(normalized));
}

function normalizeFileHttpMetadata(metadata?: FileHttpMetadata) {
	if (!metadata) {
		return undefined;
	}

	const normalized = {
		cacheControl: metadata.cacheControl,
		contentDisposition: metadata.contentDisposition,
		contentEncoding: metadata.contentEncoding,
		contentLanguage: metadata.contentLanguage,
		contentType: metadata.contentType,
	};

	return Object.values(normalized).some((value) => value) ? normalized : undefined;
}

function applyFileHttpMetadata(headers: Headers, metadata?: FileHttpMetadata) {
	if (!metadata) {
		return;
	}

	for (const [key, value] of Object.entries({
		"cache-control": metadata.cacheControl,
		"content-disposition": metadata.contentDisposition,
		"content-encoding": metadata.contentEncoding,
		"content-language": metadata.contentLanguage,
		"content-type": metadata.contentType,
	})) {
		if (value) {
			headers.set(key, value);
		}
	}
}

async function createBlobFromFileValue(
	value: ReadableStream | ArrayBuffer | ArrayBufferView | string,
) {
	if (value instanceof ReadableStream) {
		return await new Response(value).blob();
	}

	if (typeof value === "string" || value instanceof ArrayBuffer) {
		return new Blob([value]);
	}

	const bytes = Uint8Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
	return new Blob([bytes.buffer]);
}
