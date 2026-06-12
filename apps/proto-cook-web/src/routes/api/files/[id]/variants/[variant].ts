import { getFilesStorageProvider } from "@de100/apps-proto-cook-api/files-storage";
import type { FileObject } from "@de100/files-server/storage";
import type { APIEvent } from "@solidjs/start/server";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";
import {
	createFilesHttpHandlers,
	createFilesJsonResponse,
} from "~/libs/server/files-http-handlers";
import {
	createFilesObjectResponse,
	selectReadyFilesVariant,
} from "~/libs/server/files-object-response";

async function handler(event: APIEvent) {
	try {
		const id = event.params.id;
		const variantKind = event.params.variant;
		if (!id || !variantKind) {
			return withCorsAndLogging(
				createFilesJsonResponse(
					{
						message: "Missing file id or variant kind.",
						reason: "invalid-route-params",
					},
					{ status: 400 },
				),
				event.request,
			);
		}

		const handlers = await createFilesHttpHandlers(event.request);
		const file = await handlers.getFile({ id }, event.request);
		if (!file) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		const variants = await handlers.listVariants({ fileId: id }, event.request);
		const variant = selectReadyFilesVariant(variants, variantKind);
		if (!variant) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		const provider = getFilesStorageProvider(event);
		const object = await provider.getObject({
			key: variant.key,
			visibility: file.visibility,
		});
		if (!object) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		return withCorsAndLogging(
			await createFilesObjectResponse(event.request, object as FileObject, file.visibility),
			event.request,
		);
	} catch (error) {
		console.error(error);
		return withCorsAndLogging(
			new Response("Failed to read file variant", { status: 500 }),
			event.request,
		);
	}
}

export const GET = handler;
export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
