import type { APIEvent } from "@solidjs/start/server";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";

export const GET = (event: APIEvent) => withCorsAndLogging(new Response("OK"), event.request);

export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
