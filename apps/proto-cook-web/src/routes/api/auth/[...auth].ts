import { auth } from "@de100/apps-proto-cook-auth";
import type { APIEvent } from "@solidjs/start/server";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";

const handler = async (event: APIEvent) => {
	const request = new Request(event.request);
	try {
		return withCorsAndLogging(await auth.handler(request), request);
	} catch (error) {
		console.error("[auth-route] auth.handler failed", error);
		throw error;
	}
};

export const GET = handler;
export const POST = handler;
export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
