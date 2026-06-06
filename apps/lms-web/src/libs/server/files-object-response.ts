import type { FilesVariantRecord } from "@de100/files-server/operations";
import type { FileObject } from "@de100/files-server/storage";
import { createFileObjectResponse } from "@de100/files-server/storage";
import type { FileVisibility } from "@de100/files-shared";

export async function createFilesObjectResponse(
	request: Request,
	object: FileObject,
	visibility: FileVisibility,
) {
	const rangeHeader = request.headers.get("range");
	if (!rangeHeader || object.body === null || typeof object.size !== "number") {
		const response = createFileObjectResponse(object, visibility);
		response.headers.set("accept-ranges", object.size ? "bytes" : "none");
		return response;
	}

	const range = parseByteRange(rangeHeader, object.size);
	if (!range) {
		return new Response("Range Not Satisfiable", {
			headers: {
				"content-range": `bytes */${object.size}`,
			},
			status: 416,
		});
	}

	const body = await new Response(object.body).arrayBuffer();
	const chunk = body.slice(range.start, range.end + 1);
	const response = createFileObjectResponse(
		{
			...object,
			body: chunk,
			size: chunk.byteLength,
		},
		visibility,
	);

	response.headers.set("accept-ranges", "bytes");
	response.headers.set("content-length", String(chunk.byteLength));
	response.headers.set("content-range", `bytes ${range.start}-${range.end}/${object.size}`);

	return new Response(response.body, {
		headers: response.headers,
		status: 206,
	});
}

export function selectReadyFilesVariant(variants: readonly FilesVariantRecord[], kind: string) {
	return (
		variants.find(
			(variant) =>
				variant.kind === kind && variant.status === "ready" && variant.deletedAt === null,
		) ?? null
	);
}

function parseByteRange(rangeHeader: string, totalSize: number) {
	const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
	if (!match) {
		return null;
	}

	const [, rawStart, rawEnd] = match;
	if (!rawStart && !rawEnd) {
		return null;
	}

	if (!rawStart) {
		const suffixLength = Number(rawEnd);
		if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
			return null;
		}

		return {
			end: totalSize - 1,
			start: Math.max(totalSize - suffixLength, 0),
		};
	}

	const start = Number(rawStart);
	const end = rawEnd ? Number(rawEnd) : totalSize - 1;
	if (
		!Number.isInteger(start) ||
		!Number.isInteger(end) ||
		start < 0 ||
		end < start ||
		start >= totalSize
	) {
		return null;
	}

	return {
		end: Math.min(end, totalSize - 1),
		start,
	};
}
