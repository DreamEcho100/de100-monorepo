import { createContext } from "@de100/apps-proto-cook-api/context";
import { createProtoCookFilesRepositories } from "@de100/apps-proto-cook-api/files-repositories";
import { getFilesStorageProvider } from "@de100/apps-proto-cook-api/files-storage";
import { createDb } from "@de100/apps-proto-cook-db";
import type { FilesUploadTargetProtocol } from "@de100/files-shared";
import type { APIEvent } from "@solidjs/start/server";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";
import {
	createUnsupportedFilesProtocolMessage,
	isSupportedServerProxyProtocol,
} from "~/libs/server/files-upload-protocols";

async function handler(event: APIEvent) {
	try {
		const protocol = event.params.protocol as FilesUploadTargetProtocol | undefined;
		const sessionId = event.params.sessionId;
		if (!protocol || !sessionId) {
			return withCorsAndLogging(
				new Response("Missing upload route parameters", { status: 400 }),
				event.request,
			);
		}

		if (!isSupportedServerProxyProtocol(protocol)) {
			return withCorsAndLogging(
				new Response(createUnsupportedFilesProtocolMessage(protocol), {
					status: 501,
				}),
				event.request,
			);
		}

		const [context, db] = await Promise.all([
			createContext({
				headers: new Headers(event.request.headers),
				request: event.request,
			}),
			createDb(),
		]);
		const authContext = {
			userId: context.session?.user?.id ?? null,
		};
		const repositories = createProtoCookFilesRepositories(db);
		const uploadSession = await repositories.sessions.getSession(sessionId, authContext);
		if (!uploadSession || uploadSession.protocol !== protocol) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		const fileRecord = await repositories.files.getFile(uploadSession.fileId, authContext);
		if (!fileRecord || fileRecord.status === "deleted") {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		const file = await readUploadFile(event.request, fileRecord.fileName);
		const provider = getFilesStorageProvider(event);
		await provider.putObject({
			httpMetadata: {
				cacheControl:
					fileRecord.visibility === "public"
						? "public, max-age=31536000, immutable"
						: "private, no-store, max-age=0",
				contentDisposition: `inline; filename="${file.name.replace(/"/g, "")}"`,
				contentType: file.type || fileRecord.contentType,
			},
			key: fileRecord.key,
			value: file,
			visibility: fileRecord.visibility,
		});
		await repositories.files.updateFileStatus(fileRecord.id, "stored");

		return withCorsAndLogging(
			new Response(JSON.stringify({ fileId: fileRecord.id, sessionId, status: "stored" }), {
				headers: {
					"content-type": "application/json",
				},
				status: 200,
			}),
			event.request,
		);
	} catch (error) {
		console.error(error);
		return withCorsAndLogging(
			new Response("Failed to upload file", { status: 500 }),
			event.request,
		);
	}
}

async function readUploadFile(request: Request, fallbackFileName: string) {
	const contentType = request.headers.get("content-type") ?? "";
	if (contentType.includes("multipart/form-data")) {
		const formData = await request.formData();
		const file = formData.get("file");
		if (file instanceof File) {
			return file;
		}
	}

	const body = await request.blob();
	return new File([body], fallbackFileName, {
		type: body.type || contentType || "application/octet-stream",
	});
}

export const PATCH = handler;
export const POST = handler;
export const PUT = handler;
export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
