import { randomUUID } from "node:crypto";
import { mkdtemp, open, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

export type FilesTempPath = {
	cleanup: () => Promise<void>;
	path: string;
};

export type CreateFilesTempDirectoryOptions = {
	directory?: string;
	prefix?: string;
};

export type CreateFilesTempFileOptions = CreateFilesTempDirectoryOptions & {
	suffix?: string;
};

export type FilesTempFileValue = ArrayBuffer | ArrayBufferView | Blob | ReadableStream | string;

export async function createFilesTempDirectory(
	options: CreateFilesTempDirectoryOptions = {},
): Promise<FilesTempPath> {
	const parentDirectory = options.directory ?? tmpdir();
	const prefix = options.prefix ?? "de100-files-";
	const path = await mkdtemp(join(parentDirectory, prefix));

	return {
		cleanup: () => cleanupFilesTempPath(path),
		path,
	};
}

export async function createFilesTempFile(
	options: CreateFilesTempFileOptions = {},
): Promise<FilesTempPath> {
	const ownedDirectory = options.directory ? null : await createFilesTempDirectory();
	const directory = options.directory ?? ownedDirectory?.path;
	if (!directory) {
		throw new Error("Temp file directory could not be resolved.");
	}

	const prefix = options.prefix ?? "upload-";
	const suffix = options.suffix ?? ".tmp";
	const path = join(directory, `${prefix}${randomUUID()}${suffix}`);
	const handle = await open(path, "wx");
	await handle.close();

	return {
		cleanup: async () => {
			await cleanupFilesTempPath(path);
			await ownedDirectory?.cleanup();
		},
		path,
	};
}

export async function writeFilesTempFile(path: string, value: FilesTempFileValue) {
	const bytes = await readFileValue(value);
	await writeFile(path, bytes);
}

export async function withFilesTempDirectory<T>(
	options: CreateFilesTempDirectoryOptions,
	fn: (directory: FilesTempPath) => Promise<T>,
) {
	const directory = await createFilesTempDirectory(options);
	try {
		return await fn(directory);
	} finally {
		await directory.cleanup();
	}
}

export async function cleanupFilesTempPath(path: string) {
	if (!basename(path)) {
		return;
	}

	await rm(path, { force: true, recursive: true });
}

async function readFileValue(value: FilesTempFileValue) {
	if (value instanceof Blob) {
		return new Uint8Array(await value.arrayBuffer());
	}

	if (value instanceof ReadableStream) {
		return new Uint8Array(await new Response(value).arrayBuffer());
	}

	if (typeof value === "string") {
		return new TextEncoder().encode(value);
	}

	if (value instanceof ArrayBuffer) {
		return new Uint8Array(value);
	}

	return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}
