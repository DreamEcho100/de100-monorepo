import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createEnv } from "@t3-oss/env-core";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, "../../../../../");
const candidateEnvPaths = [
	resolve(process.cwd(), ".env.local"),
	resolve(process.cwd(), ".env"),
	resolve(repoRoot, ".env.local"),
	resolve(repoRoot, ".env"),
	resolve(repoRoot, "apps/lms-web/.env.local"),
	resolve(repoRoot, "apps/lms-web/.env"),
];

for (const envPath of new Set(candidateEnvPaths)) {
	if (existsSync(envPath)) {
		loadEnv({ path: envPath, override: false });
	}
}

const baseEnv = createEnv({
	server: {
		APP_LMS_DATABASE_URL: z.string().min(1),
		APP_LMS_DATABASE_DRIVER: z.enum(["auto", "postgres", "neon-http"]).default("auto"),
		APP_LMS_CACHE_DRIVER: z.enum(["memory", "redis", "upstash"]).default("memory"),
		APP_LMS_CACHE_KEY_PREFIX: z.string().min(1).default("de100:lms"),
		APP_LMS_MEDIA_STORAGE_DRIVER: z.enum(["r2", "local"]).default("r2"),
		APP_LMS_MEDIA_LOCAL_ROOT: z.string().min(1).default("./.local/media"),
		APP_LMS_MEDIA_S3_ENDPOINT: z.url().optional(),
		APP_LMS_MEDIA_S3_REGION: z.string().min(1).default("auto"),
		APP_LMS_MEDIA_S3_ACCESS_KEY_ID: z.string().min(1).optional(),
		APP_LMS_MEDIA_S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
		APP_LMS_MEDIA_S3_PUBLIC_BUCKET: z.string().min(1).optional(),
		APP_LMS_MEDIA_S3_PRIVATE_BUCKET: z.string().min(1).optional(),
		APP_LMS_MEDIA_S3_FORCE_PATH_STYLE: z.boolean().default(true),
		APP_LMS_MEDIA_SIGNING_SECRET: z.string().min(32).optional(),
		APP_LMS_MEDIA_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
		REDIS_URL: z.url().optional(),
		APP_LMS_UPSTASH_REDIS_URL: z.url().optional(),
		APP_LMS_UPSTASH_REDIS_TOKEN: z.string().min(1).optional(),
		APP_LMS_BETTER_AUTH_SECRET: z.string().min(32),
		APP_LMS_BETTER_AUTH_URL: z.url(),
		APP_LMS_CORS_ORIGIN: z.url(),
		APP_LMS_EMAIL_DRIVER: z.enum(["log", "resend"]).default("log"),
		APP_LMS_EMAIL_FROM: z.string().min(1).default("LMS Starter <noreply@lms.local>"),
		APP_LMS_EMAIL_REPLY_TO: z.string().min(1).optional(),
		APP_LMS_RESEND_API_KEY: z.string().min(1).optional(),
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
		DISABLE_ORPC_OUTPUT_VALIDATION: z.boolean().default(false),
		APP_LMS_SERVER_PORT: z.coerce.number().int().positive().default(3000),
		LMS_APP_VITE_TRACE_MODE: z.string().min(1).optional(),
		NITRO_PRESET: z.string().min(1).optional(),
		ALCHEMY_ROOT: z.string().min(1).optional(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});

function isNeonUrl(databaseUrl: string) {
	try {
		const { host } = new URL(databaseUrl);
		return host.includes("neon.tech") || host.includes("neon.build");
	} catch {
		return databaseUrl.includes("neon");
	}
}

const databaseModeSchema = z
	.discriminatedUnion("type", [
		z.object({
			type: z.literal("postgres"),
			url: z.string().min(1),
		}),
		z.object({
			type: z.literal("neon-http"),
			url: z.string().min(1),
		}),
	])
	.superRefine((value, ctx) => {
		switch (value.type) {
			case "neon-http": {
				const isNeon = isNeonUrl(value.url);
				if (isNeon) return;
				ctx.addIssue({
					code: "custom",
					message:
						"The provided database URL appears to not be a Neon URL. If you intended to use the Neon HTTP driver, please ensure your database URL is correct.",
				});
				break;
			}
		}
	});

const databaseModeInputSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("auto"),
		url: z.string().min(1),
	}),
	z.object({
		type: z.literal("postgres"),
		url: z.string().min(1),
	}),
	z.object({
		type: z.literal("neon-http"),
		url: z.string().min(1),
	}),
]);

const cacheModeSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("memory"),
		keyPrefix: z.string().min(1),
	}),
	z.object({
		type: z.literal("redis"),
		keyPrefix: z.string().min(1),
		redisUrl: z.url(),
	}),
	z.object({
		type: z.literal("upstash"),
		keyPrefix: z.string().min(1),
		upstashRedisToken: z.string().min(1),
		upstashRedisUrl: z.url(),
	}),
]);

const emailModeSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("log"),
		from: z.string().min(1),
		replyTo: z.string().min(1).optional(),
	}),
	z.object({
		type: z.literal("resend"),
		from: z.string().min(1),
		replyTo: z.string().min(1).optional(),
		resendApiKey: z.string().min(1),
	}),
]);

const mediaS3ModeSchema = z
	.object({
		accessKeyId: z.string().min(1).optional(),
		endpoint: z.url().optional(),
		forcePathStyle: z.boolean(),
		privateBucket: z.string().min(1).optional(),
		publicBucket: z.string().min(1).optional(),
		region: z.string().min(1),
		secretAccessKey: z.string().min(1).optional(),
	})
	.superRefine((value, ctx) => {
		const hasAccessKeyId = Boolean(value.accessKeyId);
		const hasSecretAccessKey = Boolean(value.secretAccessKey);

		if (hasAccessKeyId !== hasSecretAccessKey) {
			ctx.addIssue({
				code: "custom",
				message:
					"APP_LMS_MEDIA_S3_ACCESS_KEY_ID and APP_LMS_MEDIA_S3_SECRET_ACCESS_KEY must be set together when using r2 mode.",
			});
		}

		const hasPublicBucket = Boolean(value.publicBucket);
		const hasPrivateBucket = Boolean(value.privateBucket);

		if (hasPublicBucket !== hasPrivateBucket) {
			ctx.addIssue({
				code: "custom",
				message:
					"APP_LMS_MEDIA_S3_PUBLIC_BUCKET and APP_LMS_MEDIA_S3_PRIVATE_BUCKET must be set together when using r2 mode.",
			});
		}
	});

const mediaStorageModeSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("local"),
		localRoot: z.string().min(1),
	}),
	z.object({
		type: z.literal("r2"),
		localRoot: z.string().min(1),
		s3: mediaS3ModeSchema,
	}),
]);

export type DatabaseMode = z.infer<typeof databaseModeSchema>;
export type CacheMode = z.infer<typeof cacheModeSchema>;
export type EmailMode = z.infer<typeof emailModeSchema>;
export type MediaStorageMode = z.infer<typeof mediaStorageModeSchema>;

const modeProjectionSchema = z
	.object({
		APP_LMS_CACHE_DRIVER: z.enum(["memory", "redis", "upstash"]),
		APP_LMS_CACHE_KEY_PREFIX: z.string().min(1),
		APP_LMS_DATABASE_DRIVER: z.enum(["auto", "postgres", "neon-http"]),
		APP_LMS_DATABASE_URL: z.string().min(1),
		APP_LMS_EMAIL_DRIVER: z.enum(["log", "resend"]),
		APP_LMS_EMAIL_FROM: z.string().min(1),
		APP_LMS_EMAIL_REPLY_TO: z.string().min(1).optional(),
		APP_LMS_MEDIA_LOCAL_ROOT: z.string().min(1),
		APP_LMS_MEDIA_S3_ACCESS_KEY_ID: z.string().min(1).optional(),
		APP_LMS_MEDIA_S3_ENDPOINT: z.url().optional(),
		APP_LMS_MEDIA_S3_FORCE_PATH_STYLE: z.boolean(),
		APP_LMS_MEDIA_S3_PRIVATE_BUCKET: z.string().min(1).optional(),
		APP_LMS_MEDIA_S3_PUBLIC_BUCKET: z.string().min(1).optional(),
		APP_LMS_MEDIA_S3_REGION: z.string().min(1),
		APP_LMS_MEDIA_S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
		APP_LMS_MEDIA_STORAGE_DRIVER: z.enum(["r2", "local"]),
		APP_LMS_RESEND_API_KEY: z.string().min(1).optional(),
		APP_LMS_UPSTASH_REDIS_TOKEN: z.string().min(1).optional(),
		APP_LMS_UPSTASH_REDIS_URL: z.url().optional(),
		REDIS_URL: z.url().optional(),
	})
	.transform((value) => ({
		cache: cacheModeSchema.parse(
			value.APP_LMS_CACHE_DRIVER === "memory"
				? {
						type: "memory",
						keyPrefix: value.APP_LMS_CACHE_KEY_PREFIX,
					}
				: value.APP_LMS_CACHE_DRIVER === "redis"
					? {
							type: "redis",
							keyPrefix: value.APP_LMS_CACHE_KEY_PREFIX,
							redisUrl: value.REDIS_URL,
						}
					: {
							type: "upstash",
							keyPrefix: value.APP_LMS_CACHE_KEY_PREFIX,
							upstashRedisToken: value.APP_LMS_UPSTASH_REDIS_TOKEN,
							upstashRedisUrl: value.APP_LMS_UPSTASH_REDIS_URL,
						},
		),
		database: (() => {
			const configuredDatabase = databaseModeInputSchema.parse({
				type: value.APP_LMS_DATABASE_DRIVER,
				url: value.APP_LMS_DATABASE_URL,
			});

			if (configuredDatabase.type === "auto") {
				return databaseModeSchema.parse({
					type: isNeonUrl(configuredDatabase.url) ? "neon-http" : "postgres",
					url: configuredDatabase.url,
				});
			}

			return databaseModeSchema.parse(configuredDatabase);
		})(),
		email: emailModeSchema.parse(
			value.APP_LMS_EMAIL_DRIVER === "log"
				? {
						type: "log",
						from: value.APP_LMS_EMAIL_FROM,
						replyTo: value.APP_LMS_EMAIL_REPLY_TO,
					}
				: {
						type: "resend",
						from: value.APP_LMS_EMAIL_FROM,
						replyTo: value.APP_LMS_EMAIL_REPLY_TO,
						resendApiKey: value.APP_LMS_RESEND_API_KEY,
					},
		),
		mediaStorage: mediaStorageModeSchema.parse(
			value.APP_LMS_MEDIA_STORAGE_DRIVER === "local"
				? {
						type: "local",
						localRoot: value.APP_LMS_MEDIA_LOCAL_ROOT,
					}
				: {
						type: "r2",
						localRoot: value.APP_LMS_MEDIA_LOCAL_ROOT,
						s3: {
							accessKeyId: value.APP_LMS_MEDIA_S3_ACCESS_KEY_ID,
							endpoint: value.APP_LMS_MEDIA_S3_ENDPOINT,
							forcePathStyle: value.APP_LMS_MEDIA_S3_FORCE_PATH_STYLE,
							privateBucket: value.APP_LMS_MEDIA_S3_PRIVATE_BUCKET,
							publicBucket: value.APP_LMS_MEDIA_S3_PUBLIC_BUCKET,
							region: value.APP_LMS_MEDIA_S3_REGION,
							secretAccessKey: value.APP_LMS_MEDIA_S3_SECRET_ACCESS_KEY,
						},
					},
		),
	}));

type ModeProjection = z.infer<typeof modeProjectionSchema>;

export const env = Object.freeze({
	...baseEnv,
	...modeProjectionSchema.parse(baseEnv),
});

export const databaseMode: DatabaseMode = env.database;
export const cacheMode: CacheMode = env.cache;
export const emailMode: EmailMode = env.email;
export const mediaStorageMode: MediaStorageMode = env.mediaStorage;
