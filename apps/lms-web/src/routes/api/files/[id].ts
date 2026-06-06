import type { APIEvent } from "@solidjs/start/server";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";
import {
	createFilesHttpHandlers,
	createFilesJsonResponse,
} from "~/libs/server/files-http-handlers";

async function getHandler(event: APIEvent) {
	try {
		const id = event.params.id;
		if (!id) {
			return withCorsAndLogging(new Response("Missing file id", { status: 400 }), event.request);
		}

		const handlers = await createFilesHttpHandlers(event.request);
		return withCorsAndLogging(
			createFilesJsonResponse(await handlers.getFile({ id }, event.request)),
			event.request,
		);
	} catch (error) {
		console.error(error);
		return withCorsAndLogging(
			new Response("Failed to read file record", { status: 500 }),
			event.request,
		);
	}
}

async function deleteHandler(event: APIEvent) {
	try {
		const id = event.params.id;
		if (!id) {
			return withCorsAndLogging(new Response("Missing file id", { status: 400 }), event.request);
		}

		const handlers = await createFilesHttpHandlers(event.request);
		return withCorsAndLogging(
			createFilesJsonResponse(await handlers.deleteFile({ id }, event.request)),
			event.request,
		);
	} catch (error) {
		console.error(error);
		return withCorsAndLogging(
			new Response("Failed to delete file", { status: 500 }),
			event.request,
		);
	}
}

export const DELETE = deleteHandler;
export const GET = getHandler;
export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
