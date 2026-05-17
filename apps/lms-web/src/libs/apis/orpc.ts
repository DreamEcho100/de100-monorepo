import type { AppRouterClient } from "@de100/apps-lms-api/routers/index";
import { env } from "@de100/apps-lms-env/web";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryClient } from "@tanstack/solid-query";
import { getRequestEvent } from "solid-js/web";

function getRpcUrl() {
	const requestUrl = getRequestEvent()?.request.url;
	if (requestUrl) {
		return new URL("/rpc", requestUrl).toString();
	}

	if (env.VITE_SERVER_URL) {
		return new URL("/rpc", env.VITE_SERVER_URL).toString();
	}

	return "/rpc";
}

export const link = new RPCLink({
	url: () => getRpcUrl(),
	fetch(url, options) {
		const headers = new Headers(
			"headers" in options ? (options.headers as HeadersInit | undefined) : undefined,
		);
		const cookie = getRequestEvent()?.request.headers.get("cookie");
		if (cookie && !headers.has("cookie")) {
			headers.set("cookie", cookie);
		}

		return fetch(url, {
			...options,
			headers,
			credentials: "include",
		});
	},
});

export const client: AppRouterClient = createORPCClient(link);

export function createQueryClient() {
	return new QueryClient();
}

export const orpc = createTanstackQueryUtils(client);
