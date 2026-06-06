import { getFilesStorageProvider } from "@de100/apps-lms-api/files-storage";
import { db } from "@de100/apps-lms-db";
import { files } from "@de100/apps-lms-db/schema/files";
import type { FileObject } from "@de100/files-server/storage";
import type { APIEvent } from "@solidjs/start/server";
import { and, eq, isNull } from "drizzle-orm";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";
import { createFilesObjectResponse } from "~/libs/server/files-object-response";

async function handler(event: APIEvent) {
	try {
		const key = event.params.key;
		if (!key) {
			return withCorsAndLogging(new Response("Missing file key", { status: 400 }), event.request);
		}

		const [fileRecord] = await db
			.select()
			.from(files)
			.where(
				and(
					eq(files.key, key),
					eq(files.visibility, "public"),
					eq(files.status, "ready"),
					isNull(files.deletedAt),
				),
			)
			.limit(1);

		if (!fileRecord) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		const provider = getFilesStorageProvider(event);
		const object = await provider.getObject({ key, visibility: "public" });
		if (!object) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		return withCorsAndLogging(
			await createFilesObjectResponse(event.request, object as FileObject, "public"),
			event.request,
		);
	} catch (error) {
		console.error(error);
		return withCorsAndLogging(new Response("Failed to read file", { status: 500 }), event.request);
	}
}

export const GET = handler;
export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
