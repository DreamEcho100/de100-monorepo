import { resolveSignedMediaAccessToken } from "@de100/apps-lms-api/routers/media";
import { createDb } from "@de100/apps-lms-db";
import type { APIEvent } from "@solidjs/start/server";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";
import {
	createMediaObjectResponse,
	getMediaStorageProvider,
	MediaStorageUnavailableError,
} from "~/libs/server/media-storage";

async function handler(event: APIEvent) {
	try {
		const token = event.params.token;
		if (!token) {
			return withCorsAndLogging(
				new Response("Missing media token", { status: 400 }),
				event.request,
			);
		}

		const mediaRecord = await resolveSignedMediaAccessToken(await createDb(), token);
		if (!mediaRecord) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		const provider = getMediaStorageProvider(event);
		const object = await provider.getObject({
			key: mediaRecord.key,
			visibility: mediaRecord.visibility,
		});
		if (!object) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		return withCorsAndLogging(
			createMediaObjectResponse(object, mediaRecord.visibility),
			event.request,
		);
	} catch (error) {
		if (error instanceof MediaStorageUnavailableError) {
			return withCorsAndLogging(new Response(error.message, { status: 503 }), event.request);
		}

		console.error(error);
		return withCorsAndLogging(new Response("Failed to read media", { status: 500 }), event.request);
	}
}

export const GET = handler;
export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
