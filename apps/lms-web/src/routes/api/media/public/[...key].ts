import { db } from "@de100/apps-lms-db";
import { media } from "@de100/apps-lms-db/schema/media";
import type { APIEvent } from "@solidjs/start/server";
import { and, eq, isNull } from "drizzle-orm";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";
import {
	createMediaObjectResponse,
	getMediaStorageProvider,
	MediaStorageUnavailableError,
} from "~/libs/server/media-storage";

async function handler(event: APIEvent) {
	try {
		const key = event.params.key;
		if (!key) {
			return withCorsAndLogging(new Response("Missing media key", { status: 400 }), event.request);
		}

		const [mediaRecord] = await db
			.select()
			.from(media)
			.where(
				and(
					eq(media.key, key),
					eq(media.visibility, "public"),
					eq(media.status, "ready"),
					isNull(media.deletedAt),
				),
			)
			.limit(1);

		if (!mediaRecord) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		const provider = getMediaStorageProvider(event);
		const object = await provider.getObject({ key, visibility: "public" });
		if (!object) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		return withCorsAndLogging(createMediaObjectResponse(object, "public"), event.request);
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
