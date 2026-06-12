import { getFilesStorageProvider } from "@de100/apps-proto-cook-api/files-storage";
import { auth } from "@de100/apps-proto-cook-auth";
import { db } from "@de100/apps-proto-cook-db";
import { files } from "@de100/apps-proto-cook-db/schema/files";
import type { FileObject } from "@de100/files-server/storage";
import type { APIEvent } from "@solidjs/start/server";
import { and, eq, isNull } from "drizzle-orm";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";
import { createFilesObjectResponse } from "~/libs/server/files-object-response";

async function handler(event: APIEvent) {
	try {
		const session = await auth.api.getSession({ headers: new Headers(event.request.headers) });
		if (!session?.user) {
			return withCorsAndLogging(new Response("Unauthorized", { status: 401 }), event.request);
		}

		const key = event.params.key;
		if (!key) {
			return withCorsAndLogging(new Response("Missing file key", { status: 400 }), event.request);
		}

		if (!key.startsWith(`${session.user.id}/`)) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		const [fileRecord] = await db
			.select()
			.from(files)
			.where(
				and(
					eq(files.key, key),
					eq(files.userId, session.user.id),
					eq(files.visibility, "private"),
					isNull(files.deletedAt),
				),
			)
			.limit(1);

		if (!fileRecord) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		const provider = getFilesStorageProvider(event);
		const object = await provider.getObject({ key, visibility: "private" });
		if (!object) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		return withCorsAndLogging(
			await createFilesObjectResponse(event.request, object as FileObject, "private"),
			event.request,
		);
	} catch (error) {
		console.error(error);
		return withCorsAndLogging(new Response("Failed to read file", { status: 500 }), event.request);
	}
}

export const GET = handler;
export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
