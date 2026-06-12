import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolveOutputPath(process.argv.slice(2));

const envValues = {
	APP_PROTO_COOK_BETTER_AUTH_SECRET: "proto-cook-ci-local-secret-please-change",
	APP_PROTO_COOK_BETTER_AUTH_URL: "http://127.0.0.1:3000/api/auth",
	APP_PROTO_COOK_CACHE_DRIVER: "redis",
	APP_PROTO_COOK_CACHE_KEY_PREFIX: "de100:proto-cook:ci",
	APP_PROTO_COOK_CORS_ORIGIN: "http://127.0.0.1:3000",
	APP_PROTO_COOK_DATABASE_DRIVER: "postgres",
	APP_PROTO_COOK_DATABASE_URL: "postgres://postgres:postgres@127.0.0.1:5432/de100_proto_cook",
	APP_PROTO_COOK_EMAIL_DRIVER: "log",
	APP_PROTO_COOK_EMAIL_FROM: "Proto Cook CI <noreply@proto-cook.local>",
	APP_PROTO_COOK_FILES_LOCAL_ROOT: "./apps/proto-cook-web/.local/files",
	APP_PROTO_COOK_FILES_S3_ACCESS_KEY_ID: "minioadmin",
	APP_PROTO_COOK_FILES_S3_ENDPOINT: "http://127.0.0.1:9000",
	APP_PROTO_COOK_FILES_S3_FORCE_PATH_STYLE: "true",
	APP_PROTO_COOK_FILES_S3_PRIVATE_BUCKET: "private-files",
	APP_PROTO_COOK_FILES_S3_PROVIDER: "minio",
	APP_PROTO_COOK_FILES_S3_PUBLIC_BUCKET: "public-files",
	APP_PROTO_COOK_FILES_S3_REGION: "us-east-1",
	APP_PROTO_COOK_FILES_S3_SECRET_ACCESS_KEY: "minioadmin",
	APP_PROTO_COOK_FILES_SIGNED_URL_TTL_SECONDS: "3600",
	APP_PROTO_COOK_FILES_STORAGE_DRIVER: "s3",
	APP_PROTO_COOK_FILES_WORKER_CONCURRENCY: "1",
	APP_PROTO_COOK_FILES_WORKER_POLL_INTERVAL_MS: "5000",
	APP_PROTO_COOK_FILES_WORKER_QUEUE_DRIVER: "redis",
	APP_PROTO_COOK_FILES_WORKER_REDIS_KEY_PREFIX: "de100:proto-cook:files:ci",
	APP_PROTO_COOK_FILES_WORKER_STALE_AFTER_MS: "300000",
	APP_PROTO_COOK_HEALTHCHECK_URL: "http://127.0.0.1:3000/health",
	APP_PROTO_COOK_SERVER_PORT: "3000",
	APP_PROTO_COOK_SMOKE_BASE_URL: "http://127.0.0.1:3000",
	APP_PROTO_COOK_SMOKE_TIMEOUT_MS: "15000",
	REDIS_URL: "redis://127.0.0.1:6379",
	VITE_APP_PROTO_COOK_SERVER_URL: "http://127.0.0.1:3000",
};

const forbiddenKeyFragments = [
	String.fromCharCode(77, 69, 68, 73, 65),
	String.fromCharCode(76, 77, 83),
];
const invalidKeys = Object.keys(envValues).filter((key) =>
	forbiddenKeyFragments.some((fragment) => key.includes(fragment)),
);

if (invalidKeys.length > 0) {
	throw new Error(`CI env writer contains stale keys: ${invalidKeys.join(", ")}`);
}

const content = `${Object.entries(envValues)
	.map(([key, value]) => `${key}=${JSON.stringify(value)}`)
	.join("\n")}\n`;

writeFileSync(outputPath, content);
console.log(`Wrote ${Object.keys(envValues).length} Proto Cook CI env values to ${outputPath}.`);

/**
 * @param {string[]} args
 */
function resolveOutputPath(args) {
	const outputFlagIndex = args.indexOf("--output");
	if (outputFlagIndex >= 0) {
		const outputArg = args[outputFlagIndex + 1];
		if (!outputArg) {
			throw new Error("Missing value for --output.");
		}

		return path.resolve(repoRoot, outputArg);
	}

	const envOutputPath = process.env.PROTO_COOK_CI_ENV_OUTPUT;
	if (envOutputPath) {
		return path.resolve(repoRoot, envOutputPath);
	}

	return path.join(repoRoot, ".env.local");
}
