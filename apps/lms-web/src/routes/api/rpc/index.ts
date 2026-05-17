import type { APIEvent } from "@solidjs/start/server";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";

const notFound = (event: APIEvent) =>
	withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);

export const GET = notFound;
export const POST = notFound;
export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
