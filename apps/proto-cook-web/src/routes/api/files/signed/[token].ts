import { verifySignedFilesAccessToken } from "@de100/apps-proto-cook-api/files-signed-access";
import { getFilesStorageProvider } from "@de100/apps-proto-cook-api/files-storage";
import { createDb } from "@de100/apps-proto-cook-db";
import { files } from "@de100/apps-proto-cook-db/schema/files";
import type { FileObject } from "@de100/files-server/storage";
import type { APIEvent } from "@solidjs/start/server";
import { and, eq, isNull } from "drizzle-orm";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";
import { createFilesObjectResponse } from "~/libs/server/files-object-response";

async function handler(event: APIEvent) {
	try {
		const token = event.params.token;
		if (!token) {
			return withCorsAndLogging(new Response("Missing file token", { status: 400 }), event.request);
		}

		const payload = await verifySignedFilesAccessToken(token);
		if (!payload) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		const [fileRecord] = await (await createDb())
			.select()
			.from(files)
			.where(and(eq(files.id, payload.fileId), eq(files.status, "ready"), isNull(files.deletedAt)))
			.limit(1);

		if (!fileRecord) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		const provider = getFilesStorageProvider(event);
		const object = await provider.getObject({
			key: fileRecord.key,
			visibility: fileRecord.visibility,
		});
		if (!object) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		return withCorsAndLogging(
			await createFilesObjectResponse(event.request, object as FileObject, fileRecord.visibility),
			event.request,
		);
	} catch (error) {
		console.error(error);
		return withCorsAndLogging(new Response("Failed to read file", { status: 500 }), event.request);
	}
}

export const GET = handler;
export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
