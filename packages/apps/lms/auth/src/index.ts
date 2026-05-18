import { getCacheClient } from "@de100/apps-lms-cache";
import { createDb } from "@de100/apps-lms-db";
import { account, session, user, verification } from "@de100/apps-lms-db/schema/auth";
import { env } from "@de100/apps-lms-env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { getDefaultCookieAttributes } from "./cookie-attributes";
import { getTrustedOrigins } from "./trusted-origins";

export function createAuth() {
	const db = createDb();
	const secondaryStorage = getCacheClient({
		driver: env.APP_LMS_CACHE_DRIVER,
		keyPrefix: env.APP_LMS_CACHE_KEY_PREFIX,
		redisUrl: env.REDIS_URL,
		upstashRedisToken: env.UPSTASH_REDIS_TOKEN,
		upstashRedisUrl: env.UPSTASH_REDIS_URL,
	});

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
		session: {
			storeSessionInDatabase: true,
		},
		secondaryStorage,
		secret: env.APP_LMS_BETTER_AUTH_SECRET,
		baseURL: env.APP_LMS_BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: getDefaultCookieAttributes(env),
		},
		plugins: [],
	});
}

export const auth = createAuth();
