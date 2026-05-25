import { createContext } from "@de100/apps-lms-api/context";
import { appRouter } from "@de100/apps-lms-api/routers/index";
import { ORPCError, onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import type { APIEvent } from "@solidjs/start/server";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";

const rpcHandler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error) => {
			if (error instanceof ORPCError) {
				console.error("[orpc] request failed", {
					code: error.code,
					data: error.data,
					defined: error.defined,
					message: error.message,
					status: error.status,
				});
				return;
			}

			console.error(error);
		}),
	],
});

const handler = async (event: APIEvent) => {
	const context = await createContext({
		headers: event.request.headers,
		request: event.request,
	});
	const result = await rpcHandler.handle(event.request, {
		prefix: "/api/rpc",
		context,
	});

	if (!result.matched) {
		return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
	}

	return withCorsAndLogging(result.response, event.request);
};

export const GET = handler;
export const POST = handler;
export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
