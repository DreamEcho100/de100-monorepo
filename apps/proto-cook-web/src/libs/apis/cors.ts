const allowMethods = "GET, POST, OPTIONS";
const allowHeaders = "Content-Type, Authorization";

type ResponseLike = Pick<globalThis.Response, "body" | "headers" | "status" | "statusText">;

export const createCorsPreflightResponse = (request?: Request) =>
	withCorsAndLogging(
		new Response(null, {
			status: 204,
		}),
		request,
	);

export const withCors = (response: ResponseLike, request?: Request) => {
	const headers = createCorsHeaders(request, response.headers);

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
};

export const withCorsAndLogging = (response: ResponseLike, request?: Request) => {
	const nextResponse = withCors(response, request);

	logRequest(request, nextResponse);

	return nextResponse;
};

const createCorsHeaders = (request?: Request, headers = new Headers()) => {
	const nextHeaders = new Headers(headers);
	const corsOrigin = resolveCorsOrigin(request);

	nextHeaders.set("Access-Control-Allow-Origin", corsOrigin);
	nextHeaders.set("Access-Control-Allow-Methods", allowMethods);
	nextHeaders.set("Access-Control-Allow-Headers", allowHeaders);
	if (corsOrigin !== "*") {
		nextHeaders.set("Access-Control-Allow-Credentials", "true");
	}
	nextHeaders.set("Vary", "Origin");

	return nextHeaders;
};

const resolveCorsOrigin = (request?: Request) => {
	if (process.env.APP_PROTO_COOK_CORS_ORIGIN) {
		return process.env.APP_PROTO_COOK_CORS_ORIGIN;
	}

	if (request) {
		return request.headers.get("origin") ?? new URL(request.url).origin;
	}

	return "*";
};

const logRequest = (request: Request | undefined, response: Response) => {
	if (!request || process.env.NODE_ENV === "test") {
		return;
	}

	const { method, url } = request;
	const pathname = new URL(url).pathname;

	console.info(`${method} ${pathname} ${response.status}`);
};
