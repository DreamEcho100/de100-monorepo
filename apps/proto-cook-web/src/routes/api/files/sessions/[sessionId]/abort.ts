import type { APIEvent } from "@solidjs/start/server";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";
import {
	createFilesHttpHandlers,
	createFilesJsonResponse,
} from "~/libs/server/files-http-handlers";

async function handler(event: APIEvent) {
	try {
		const sessionId = event.params.sessionId;
		if (!sessionId) {
			return withCorsAndLogging(new Response("Missing session id", { status: 400 }), event.request);
		}

		const handlers = await createFilesHttpHandlers(event.request);
		return withCorsAndLogging(
			createFilesJsonResponse(await handlers.abortUpload({ sessionId }, event.request)),
			event.request,
		);
	} catch (error) {
		console.error(error);
		return withCorsAndLogging(
			new Response("Failed to abort upload", { status: 500 }),
			event.request,
		);
	}
}

export const POST = handler;
export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
