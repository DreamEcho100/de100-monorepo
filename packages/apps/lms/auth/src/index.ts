import { getCacheClient } from "@de100/apps-lms-cache";
import { createDb } from "@de100/apps-lms-db";
import { account, session, user, verification } from "@de100/apps-lms-db/schema/auth";
import { env } from "@de100/apps-lms-env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { getDefaultCookieAttributes } from "./cookie-attributes";
import { createAppEmailSender } from "./email";
import { getTrustedOrigins } from "./trusted-origins";

export function createAuth() {
	const db = createDb();
	const secondaryStorage = getCacheClient({
		driver: env.APP_LMS_CACHE_DRIVER,
		keyPrefix: env.APP_LMS_CACHE_KEY_PREFIX,
		redisUrl: env.REDIS_URL,
		upstashRedisToken: env.APP_LMS_UPSTASH_REDIS_TOKEN,
		upstashRedisUrl: env.APP_LMS_UPSTASH_REDIS_URL,
	});
	const emailSender = createAppEmailSender({
		driver: env.APP_LMS_EMAIL_DRIVER,
		from: env.APP_LMS_EMAIL_FROM,
		replyTo: env.APP_LMS_EMAIL_REPLY_TO,
		resendApiKey: env.APP_LMS_RESEND_API_KEY,
	});

	return betterAuth({
		appName: "DE100 LMS",
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
			sendResetPassword: async (data) => {
				void emailSender.sendPasswordResetEmail(data).catch((error) => {
					console.error("[de100/apps-lms-auth] failed to send password reset email", error);
				});
			},
		},
		emailVerification: {
			sendOnSignUp: true,
			sendVerificationEmail: async (data) => {
				void emailSender.sendVerificationEmail(data).catch((error) => {
					console.error("[de100/apps-lms-auth] failed to send verification email", error);
				});
			},
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
