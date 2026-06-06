import type { CreateUploadTargetInput } from "@de100/files-shared";
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
		const input = await readFilesJsonBody<CreateUploadTargetInput>(event.request);
		return withCorsAndLogging(
			createFilesJsonResponse(await handlers.createUploadTarget(input, event.request)),
			event.request,
		);
	} catch (error) {
		console.error(error);
		return withCorsAndLogging(
			new Response("Failed to create upload target", { status: 500 }),
			event.request,
		);
	}
}

export const POST = handler;
export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
