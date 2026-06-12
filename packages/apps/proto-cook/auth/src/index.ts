import { getCacheClient } from "@de100/apps-proto-cook-cache";
import { createDb } from "@de100/apps-proto-cook-db";
import { account, session, user, verification } from "@de100/apps-proto-cook-db/schema/auth";
import { env } from "@de100/apps-proto-cook-env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { getDefaultCookieAttributes } from "./cookie-attributes";
import { createAppEmailSender } from "./email";
import { getTrustedOrigins } from "./trusted-origins";

export function createAuth() {
	console.info("[de100/apps-proto-cook-auth] createAuth start");
	const db = createDb();
	console.info("[de100/apps-proto-cook-auth] createAuth db ready");
	const secondaryStorage = getCacheClient(
		env.cache.type === "memory"
			? {
					driver: "memory",
					keyPrefix: env.cache.keyPrefix,
				}
			: env.cache.type === "redis"
				? {
						driver: "redis",
						keyPrefix: env.cache.keyPrefix,
						redisUrl: env.cache.redisUrl,
					}
				: {
						driver: "upstash",
						keyPrefix: env.cache.keyPrefix,
						upstashRedisToken: env.cache.upstashRedisToken,
						upstashRedisUrl: env.cache.upstashRedisUrl,
					},
	);
	console.info("[de100/apps-proto-cook-auth] createAuth cache ready");
	const emailSender = createAppEmailSender(
		env.email.type === "log"
			? {
					driver: "log",
					from: env.email.from,
					replyTo: env.email.replyTo,
				}
			: {
					driver: "resend",
					from: env.email.from,
					replyTo: env.email.replyTo,
					resendApiKey: env.email.resendApiKey,
				},
	);
	console.info("[de100/apps-proto-cook-auth] createAuth email ready");

	const instance = betterAuth({
		appName: "DE100 Proto Cook",
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
					console.error("[de100/apps-proto-cook-auth] failed to send password reset email", error);
				});
			},
		},
		emailVerification: {
			sendOnSignUp: true,
			sendVerificationEmail: async (data) => {
				void emailSender.sendVerificationEmail(data).catch((error) => {
					console.error("[de100/apps-proto-cook-auth] failed to send verification email", error);
				});
			},
		},
		session: {
			storeSessionInDatabase: true,
		},
		secondaryStorage,
		secret: env.APP_PROTO_COOK_BETTER_AUTH_SECRET,
		baseURL: env.APP_PROTO_COOK_BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: getDefaultCookieAttributes(env),
		},
		plugins: [],
	});

	console.info("[de100/apps-proto-cook-auth] createAuth initialized");
	return instance;
}

export const auth = (() => {
	try {
		return createAuth();
	} catch (error) {
		console.error("[de100/apps-proto-cook-auth] createAuth failed", error);
		throw error;
	}
})();
