import { isLocalDevelopmentOrigin } from "./trusted-origins";

export type CookieAttributesEnvironment = {
	APP_PROTO_COOK_BETTER_AUTH_URL: string;
	APP_PROTO_COOK_CORS_ORIGIN: string;
	NODE_ENV: string;
};

export function getDefaultCookieAttributes(env: CookieAttributesEnvironment) {
	const localDevelopmentAuth =
		env.NODE_ENV === "development" &&
		(isLocalDevelopmentOrigin(env.APP_PROTO_COOK_BETTER_AUTH_URL) ||
			isLocalDevelopmentOrigin(env.APP_PROTO_COOK_CORS_ORIGIN));

	if (localDevelopmentAuth) {
		return {
			httpOnly: true,
			sameSite: "lax" as const,
			secure: false,
		};
	}

	return {
		httpOnly: true,
		sameSite: "none" as const,
		secure: true,
	};
}
