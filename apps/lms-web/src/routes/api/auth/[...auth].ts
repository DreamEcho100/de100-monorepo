import { auth } from "@de100/apps-lms-auth";
import type { APIEvent } from "@solidjs/start/server";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";

const handler = async (event: APIEvent) =>
	withCorsAndLogging(await auth.handler(event.request), event.request);

export const GET = handler;
export const POST = handler;
export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
