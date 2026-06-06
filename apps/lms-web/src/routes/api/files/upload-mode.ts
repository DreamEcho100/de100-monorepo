import type { FilesUploadModeInput } from "@de100/files-server/orpc";
import type { APIEvent } from "@solidjs/start/server";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";
import {
	createFilesHttpHandlers,
	createFilesJsonResponse,
	readFilesJsonBody,
} from "~/libs/server/files-http-handlers";

async function handler(event: APIEvent) {
	try {
		const handlers = await createFilesHttpHandlers(event.request);
		const input = await readFilesJsonBody<FilesUploadModeInput>(event.request);
		return withCorsAndLogging(
			createFilesJsonResponse(handlers.resolveUploadMode(input)),
			event.request,
		);
	} catch (error) {
		console.error(error);
		return withCorsAndLogging(
			new Response("Failed to resolve upload mode", { status: 500 }),
			event.request,
		);
	}
}

export const POST = handler;
export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
