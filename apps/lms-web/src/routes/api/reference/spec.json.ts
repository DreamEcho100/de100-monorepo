import type { APIEvent } from "@solidjs/start/server";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";
import { generateOpenApiSpec } from "~/libs/apis/openapi";

export const GET = async (event: APIEvent) => {
	const spec = await generateOpenApiSpec(event.request);

	return withCorsAndLogging(
		new Response(JSON.stringify(spec), {
			headers: {
				"Content-Type": "application/json; charset=UTF-8",
			},
		}),
		event.request,
	);
};

export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
