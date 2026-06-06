import type { FilesSignedAccessInput } from "@de100/files-server/orpc";
import type { APIEvent } from "@solidjs/start/server";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";
import {
	createFilesHttpHandlers,
	createFilesJsonResponse,
	readFilesJsonBody,
} from "~/libs/server/files-http-handlers";

async function handler(event: APIEvent) {
	try {
		const id = event.params.id;
		if (!id) {
			return withCorsAndLogging(new Response("Missing file id", { status: 400 }), event.request);
		}

		const body = await readFilesJsonBody<Partial<FilesSignedAccessInput>>(event.request);
		const handlers = await createFilesHttpHandlers(event.request);
		return withCorsAndLogging(
			createFilesJsonResponse(
				await handlers.issueSignedAccess(
					{
						expiresInSeconds: body.expiresInSeconds,
						id,
					},
					event.request,
				),
			),
			event.request,
		);
	} catch (error) {
		console.error(error);
		return withCorsAndLogging(
			new Response("Failed to issue signed access", { status: 500 }),
			event.request,
		);
	}
}

export const POST = handler;
export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
