import type { APIEvent } from "@solidjs/start/server";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";
import {
	createFilesHttpHandlers,
	createFilesJsonResponse,
} from "~/libs/server/files-http-handlers";

async function handler(event: APIEvent) {
	try {
		const handlers = await createFilesHttpHandlers(event.request);
		return withCorsAndLogging(
			createFilesJsonResponse(await handlers.getConfig(event.request)),
			event.request,
		);
	} catch (error) {
		console.error(error);
		return withCorsAndLogging(
			new Response("Failed to load files config", { status: 500 }),
			event.request,
		);
	}
}

export const GET = handler;
export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
