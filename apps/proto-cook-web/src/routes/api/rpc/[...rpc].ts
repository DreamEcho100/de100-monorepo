import { createContext } from "@de100/apps-proto-cook-api/context";
import { appRouter } from "@de100/apps-proto-cook-api/routers/index";
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
	const request = new Request(event.request);
	const context = await createContext({
		headers: new Headers(request.headers),
		request,
	});
	const result = await rpcHandler.handle(request, {
		prefix: "/api/rpc",
		context,
	});

	if (!result.matched) {
		return withCorsAndLogging(new Response("Not Found", { status: 404 }), request);
	}

	return withCorsAndLogging(result.response, request);
};

export const GET = handler;
export const POST = handler;
export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);
