import type { APIEvent } from "@solidjs/start/server";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";
import {
	createDisabledFilesIntegrationResponse,
	createUnknownFilesIntegrationResponse,
	isDisabledFilesIntegration,
} from "~/libs/server/files-disabled-integrations";

function handler(event: APIEvent) {
	const integration = event.params.integration;
	const response = isDisabledFilesIntegration(integration)
		? createDisabledFilesIntegrationResponse(integration, {
				headers: {
					"x-files-integration-operation": event.params.operation ?? "",
				},
			})
		: createUnknownFilesIntegrationResponse(integration);

	return withCorsAndLogging(response, event.request);
}

export const DELETE = handler;
export const GET = handler;
export const PATCH = handler;
export const POST = handler;
export const PUT = handler;
export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
