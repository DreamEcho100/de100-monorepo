import { createDb } from "@de100/apps-lms-db";
import { account, session, user, verification } from "@de100/apps-lms-db/schema/auth";
import { env } from "@de100/apps-lms-env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { getTrustedOrigins } from "./trusted-origins";

export function createAuth() {
	const db = createDb();

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",

			schema: {
				account,
				session,
				user,
				verification,
			},
		}),
		trustedOrigins: (request) => getTrustedOrigins(env, request),
		emailAndPassword: {
			enabled: true,
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
				httpOnly: true,
			},
		},
		plugins: [],
	});
}

export const auth = createAuth();
