import { env } from "@de100/apps-proto-cook-env/web";
import { getRequestEvent, isServer } from "solid-js/web";

function isAbsoluteUrl(value: string) {
	return /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith("//");
}

export function getApiOrigin() {
	const requestUrl = getRequestEvent()?.request.url;
	if (requestUrl) {
		return new URL(requestUrl).origin;
	}

	if (!isServer) {
		return window.location.origin;
	}

	if (env.VITE_APP_PROTO_COOK_SERVER_URL) {
		return new URL(env.VITE_APP_PROTO_COOK_SERVER_URL).origin;
	}

	return undefined;
}

export function resolveApiRequestUrl(input: string | URL) {
	const href = input instanceof URL ? input.toString() : input;
	if (isAbsoluteUrl(href)) {
		return href;
	}

	const origin = getApiOrigin();
	return origin ? new URL(href, origin).toString() : href;
}

export function resolveApiRequestInput(input: string | URL | Request) {
	if (typeof input === "string" || input instanceof URL) {
		return resolveApiRequestUrl(input);
	}

	return input;
}
