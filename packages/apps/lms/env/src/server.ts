import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createEnv } from "@t3-oss/env-core";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, "../../../../../");
const candidateEnvPaths = [
	resolve(process.cwd(), ".env"),
	resolve(repoRoot, ".env"),
	resolve(repoRoot, "apps/lms-web/.env"),
];

for (const envPath of new Set(candidateEnvPaths)) {
	if (existsSync(envPath)) {
		loadEnv({ path: envPath, override: false });
	}
}

export const env = createEnv({
	server: {
		APP_LMS_DATABASE_URL: z.string().min(1),
		APP_LMS_DATABASE_DRIVER: z.enum(["auto", "postgres", "neon-http"]).default("auto"),
		APP_LMS_CACHE_DRIVER: z.enum(["memory", "redis", "upstash"]).default("memory"),
		APP_LMS_CACHE_KEY_PREFIX: z.string().min(1).default("de100:lms"),
		APP_LMS_MEDIA_STORAGE_DRIVER: z.enum(["r2", "local"]).default("r2"),
		APP_LMS_MEDIA_LOCAL_ROOT: z.string().min(1).default("./.local/media"),
		MEDIA_SIGNING_SECRET: z.string().min(32).optional(),
		APP_LMS_MEDIA_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
		REDIS_URL: z.url().optional(),
		UPSTASH_REDIS_URL: z.url().optional(),
		UPSTASH_REDIS_TOKEN: z.string().min(1).optional(),
		APP_LMS_BETTER_AUTH_SECRET: z.string().min(32),
		APP_LMS_BETTER_AUTH_URL: z.url(),
		APP_LMS_CORS_ORIGIN: z.url(),
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
		DISABLE_ORPC_OUTPUT_VALIDATION: z.boolean().default(false),
		APP_LMS_SERVER_PORT: z.coerce.number().int().positive().default(3000),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
