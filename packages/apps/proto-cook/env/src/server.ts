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
	resolve(repoRoot, "apps/proto-cook-web/.env.local"),
	resolve(repoRoot, "apps/proto-cook-web/.env"),
];

for (const envPath of new Set(candidateEnvPaths)) {
	if (existsSync(envPath)) {
		loadEnv({ path: envPath, override: false });
	}
}

const baseEnv = createEnv({
	server: {
		APP_PROTO_COOK_DATABASE_URL: z.string().min(1),
		APP_PROTO_COOK_DATABASE_DRIVER: z.enum(["auto", "postgres", "neon-http"]).default("auto"),
		APP_PROTO_COOK_CACHE_DRIVER: z.enum(["memory", "redis", "upstash"]).default("memory"),
		APP_PROTO_COOK_CACHE_KEY_PREFIX: z.string().min(1).default("de100:proto-cook"),
		APP_PROTO_COOK_FILES_STORAGE_DRIVER: z.enum(["s3", "local"]).default("s3"),
		APP_PROTO_COOK_FILES_LOCAL_ROOT: z.string().min(1).default("./.local/files"),
		APP_PROTO_COOK_FILES_S3_PROVIDER: z.enum(["r2", "minio", "aws", "custom"]).default("r2"),
		APP_PROTO_COOK_FILES_S3_ENDPOINT: z.url().optional(),
		APP_PROTO_COOK_FILES_S3_REGION: z.string().min(1).default("auto"),
		APP_PROTO_COOK_FILES_S3_ACCESS_KEY_ID: z.string().min(1).optional(),
		APP_PROTO_COOK_FILES_S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
		APP_PROTO_COOK_FILES_S3_PUBLIC_BUCKET: z.string().min(1).optional(),
		APP_PROTO_COOK_FILES_S3_PRIVATE_BUCKET: z.string().min(1).optional(),
		APP_PROTO_COOK_FILES_S3_FORCE_PATH_STYLE: z.stringbool().default(true),
		APP_PROTO_COOK_FILES_SIGNING_SECRET: z.string().min(32).optional(),
		APP_PROTO_COOK_FILES_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
		APP_PROTO_COOK_FILES_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
		APP_PROTO_COOK_FILES_WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
		APP_PROTO_COOK_FILES_WORKER_QUEUE_DRIVER: z.enum(["auto", "db", "redis"]).default("auto"),
		APP_PROTO_COOK_FILES_WORKER_REDIS_KEY_PREFIX: z
			.string()
			.min(1)
			.default("de100:proto-cook:files"),
		APP_PROTO_COOK_FILES_WORKER_STALE_AFTER_MS: z.coerce.number().int().positive().default(300000),
		REDIS_URL: z.url().optional(),
		APP_PROTO_COOK_UPSTASH_REDIS_URL: z.url().optional(),
		APP_PROTO_COOK_UPSTASH_REDIS_TOKEN: z.string().min(1).optional(),
		APP_PROTO_COOK_BETTER_AUTH_SECRET: z.string().min(32),
		APP_PROTO_COOK_BETTER_AUTH_URL: z.url(),
		APP_PROTO_COOK_CORS_ORIGIN: z.url(),
		APP_PROTO_COOK_EMAIL_DRIVER: z.enum(["log", "resend"]).default("log"),
		APP_PROTO_COOK_EMAIL_FROM: z
			.string()
			.min(1)
			.default("Proto Cook Starter <noreply@proto-cook.local>"),
		APP_PROTO_COOK_EMAIL_REPLY_TO: z.string().min(1).optional(),
		APP_PROTO_COOK_RESEND_API_KEY: z.string().min(1).optional(),
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
		DISABLE_ORPC_OUTPUT_VALIDATION: z.stringbool().default(false),
		APP_PROTO_COOK_SERVER_PORT: z.coerce.number().int().positive().default(3000),
		PROTO_COOK_APP_VITE_TRACE_MODE: z.string().min(1).optional(),
		NITRO_PRESET: z.string().min(1).optional(),
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

const filesS3ModeSchema = z
	.object({
		accessKeyId: z.string().min(1).optional(),
		endpoint: z.url().optional(),
		forcePathStyle: z.boolean(),
		privateBucket: z.string().min(1).optional(),
		provider: z.enum(["r2", "minio", "aws", "custom"]),
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
					"APP_PROTO_COOK_FILES_S3_ACCESS_KEY_ID and APP_PROTO_COOK_FILES_S3_SECRET_ACCESS_KEY must be set together when using s3 mode.",
			});
		}

		const hasPublicBucket = Boolean(value.publicBucket);
		const hasPrivateBucket = Boolean(value.privateBucket);

		if (hasPublicBucket !== hasPrivateBucket) {
			ctx.addIssue({
				code: "custom",
				message:
					"APP_PROTO_COOK_FILES_S3_PUBLIC_BUCKET and APP_PROTO_COOK_FILES_S3_PRIVATE_BUCKET must be set together when using s3 mode.",
			});
		}
	});

const filesStorageModeSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("local"),
		localRoot: z.string().min(1),
	}),
	z.object({
		type: z.literal("s3"),
		localRoot: z.string().min(1),
		s3: filesS3ModeSchema,
	}),
]);

export type DatabaseMode = z.infer<typeof databaseModeSchema>;
export type CacheMode = z.infer<typeof cacheModeSchema>;
export type EmailMode = z.infer<typeof emailModeSchema>;
export type FilesStorageMode = z.infer<typeof filesStorageModeSchema>;

const filesWorkerModeSchema = z.object({
	concurrency: z.number().int().positive(),
	pollIntervalMs: z.number().int().positive(),
	queueDriver: z.enum(["auto", "db", "redis"]),
	redisKeyPrefix: z.string().min(1),
	redisUrl: z.url().nullable(),
	staleAfterMs: z.number().int().positive(),
});

export type FilesWorkerMode = z.infer<typeof filesWorkerModeSchema>;

const modeProjectionSchema = z
	.object({
		APP_PROTO_COOK_CACHE_DRIVER: z.enum(["memory", "redis", "upstash"]),
		APP_PROTO_COOK_CACHE_KEY_PREFIX: z.string().min(1),
		APP_PROTO_COOK_DATABASE_DRIVER: z.enum(["auto", "postgres", "neon-http"]),
		APP_PROTO_COOK_DATABASE_URL: z.string().min(1),
		APP_PROTO_COOK_EMAIL_DRIVER: z.enum(["log", "resend"]),
		APP_PROTO_COOK_EMAIL_FROM: z.string().min(1),
		APP_PROTO_COOK_EMAIL_REPLY_TO: z.string().min(1).optional(),
		APP_PROTO_COOK_FILES_LOCAL_ROOT: z.string().min(1),
		APP_PROTO_COOK_FILES_S3_ACCESS_KEY_ID: z.string().min(1).optional(),
		APP_PROTO_COOK_FILES_S3_ENDPOINT: z.url().optional(),
		APP_PROTO_COOK_FILES_S3_FORCE_PATH_STYLE: z.boolean(),
		APP_PROTO_COOK_FILES_S3_PRIVATE_BUCKET: z.string().min(1).optional(),
		APP_PROTO_COOK_FILES_S3_PROVIDER: z.enum(["r2", "minio", "aws", "custom"]),
		APP_PROTO_COOK_FILES_S3_PUBLIC_BUCKET: z.string().min(1).optional(),
		APP_PROTO_COOK_FILES_S3_REGION: z.string().min(1),
		APP_PROTO_COOK_FILES_S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
		APP_PROTO_COOK_FILES_STORAGE_DRIVER: z.enum(["s3", "local"]),
		APP_PROTO_COOK_FILES_WORKER_CONCURRENCY: z.number().int().positive(),
		APP_PROTO_COOK_FILES_WORKER_POLL_INTERVAL_MS: z.number().int().positive(),
		APP_PROTO_COOK_FILES_WORKER_QUEUE_DRIVER: z.enum(["auto", "db", "redis"]),
		APP_PROTO_COOK_FILES_WORKER_REDIS_KEY_PREFIX: z.string().min(1),
		APP_PROTO_COOK_FILES_WORKER_STALE_AFTER_MS: z.number().int().positive(),
		APP_PROTO_COOK_RESEND_API_KEY: z.string().min(1).optional(),
		APP_PROTO_COOK_UPSTASH_REDIS_TOKEN: z.string().min(1).optional(),
		APP_PROTO_COOK_UPSTASH_REDIS_URL: z.url().optional(),
		REDIS_URL: z.url().optional(),
	})
	.transform((value) => ({
		cache: cacheModeSchema.parse(
			value.APP_PROTO_COOK_CACHE_DRIVER === "memory"
				? {
						type: "memory",
						keyPrefix: value.APP_PROTO_COOK_CACHE_KEY_PREFIX,
					}
				: value.APP_PROTO_COOK_CACHE_DRIVER === "redis"
					? {
							type: "redis",
							keyPrefix: value.APP_PROTO_COOK_CACHE_KEY_PREFIX,
							redisUrl: value.REDIS_URL,
						}
					: {
							type: "upstash",
							keyPrefix: value.APP_PROTO_COOK_CACHE_KEY_PREFIX,
							upstashRedisToken: value.APP_PROTO_COOK_UPSTASH_REDIS_TOKEN,
							upstashRedisUrl: value.APP_PROTO_COOK_UPSTASH_REDIS_URL,
						},
		),
		database: (() => {
			const configuredDatabase = databaseModeInputSchema.parse({
				type: value.APP_PROTO_COOK_DATABASE_DRIVER,
				url: value.APP_PROTO_COOK_DATABASE_URL,
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
			value.APP_PROTO_COOK_EMAIL_DRIVER === "log"
				? {
						type: "log",
						from: value.APP_PROTO_COOK_EMAIL_FROM,
						replyTo: value.APP_PROTO_COOK_EMAIL_REPLY_TO,
					}
				: {
						type: "resend",
						from: value.APP_PROTO_COOK_EMAIL_FROM,
						replyTo: value.APP_PROTO_COOK_EMAIL_REPLY_TO,
						resendApiKey: value.APP_PROTO_COOK_RESEND_API_KEY,
					},
		),
		filesStorage: filesStorageModeSchema.parse(
			value.APP_PROTO_COOK_FILES_STORAGE_DRIVER === "local"
				? {
						type: "local",
						localRoot: value.APP_PROTO_COOK_FILES_LOCAL_ROOT,
					}
				: {
						type: "s3",
						localRoot: value.APP_PROTO_COOK_FILES_LOCAL_ROOT,
						s3: {
							accessKeyId: value.APP_PROTO_COOK_FILES_S3_ACCESS_KEY_ID,
							endpoint: value.APP_PROTO_COOK_FILES_S3_ENDPOINT,
							forcePathStyle: value.APP_PROTO_COOK_FILES_S3_FORCE_PATH_STYLE,
							privateBucket: value.APP_PROTO_COOK_FILES_S3_PRIVATE_BUCKET,
							provider: value.APP_PROTO_COOK_FILES_S3_PROVIDER,
							publicBucket: value.APP_PROTO_COOK_FILES_S3_PUBLIC_BUCKET,
							region: value.APP_PROTO_COOK_FILES_S3_REGION,
							secretAccessKey: value.APP_PROTO_COOK_FILES_S3_SECRET_ACCESS_KEY,
						},
					},
		),
		filesWorker: filesWorkerModeSchema.parse({
			concurrency: value.APP_PROTO_COOK_FILES_WORKER_CONCURRENCY,
			pollIntervalMs: value.APP_PROTO_COOK_FILES_WORKER_POLL_INTERVAL_MS,
			queueDriver: value.APP_PROTO_COOK_FILES_WORKER_QUEUE_DRIVER,
			redisKeyPrefix: value.APP_PROTO_COOK_FILES_WORKER_REDIS_KEY_PREFIX,
			redisUrl: value.REDIS_URL ?? null,
			staleAfterMs: value.APP_PROTO_COOK_FILES_WORKER_STALE_AFTER_MS,
		}),
	}));

export const env = Object.freeze({
	...baseEnv,
	...modeProjectionSchema.parse(baseEnv),
});

export const databaseMode: DatabaseMode = env.database;
export const cacheMode: CacheMode = env.cache;
export const emailMode: EmailMode = env.email;
export const filesStorageMode: FilesStorageMode = env.filesStorage;
export const filesWorkerMode: FilesWorkerMode = env.filesWorker;
