export interface TrustedOriginsEnvironment {
	BETTER_AUTH_URL: string;
	CORS_ORIGIN: string;
	NODE_ENV: string;
}

export interface OriginRequest {
	headers: Pick<Headers, "get">;
}

const localDevelopmentHostnames = new Set(["127.0.0.1", "localhost"]);

export function isLocalDevelopmentOrigin(origin: string) {
	try {
		const url = new URL(origin);
		return url.protocol === "http:" && localDevelopmentHostnames.has(url.hostname);
	} catch {
		return false;
	}
}

export function getTrustedOrigins(env: TrustedOriginsEnvironment, request?: OriginRequest) {
	const trustedOrigins = new Set<string>([env.CORS_ORIGIN, new URL(env.BETTER_AUTH_URL).origin]);

	if (env.NODE_ENV === "development") {
		const requestOrigin = request?.headers.get("origin");
		if (requestOrigin && isLocalDevelopmentOrigin(requestOrigin)) {
			trustedOrigins.add(requestOrigin);
		}
	}

	return [...trustedOrigins];
}
