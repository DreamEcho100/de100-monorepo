import { loadRepoEnv } from "./_shared/load-env.mjs";

const { loadedEnvPaths } = loadRepoEnv();

const errors = [];
const warnings = [];

function getEnvValue(key) {
	const value = process.env[key];
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function requireEnvValue(key) {
	const value = getEnvValue(key);
	if (!value) {
		errors.push(`${key} is required.`);
		return undefined;
	}

	return value;
}

function assertEnumValue(key, allowedValues) {
	const value = requireEnvValue(key);
	if (!value) {
		return undefined;
	}

	if (!allowedValues.includes(value)) {
		errors.push(`${key} must be one of: ${allowedValues.join(", ")}. Received: ${value}`);
		return undefined;
	}

	return value;
}

function assertPositiveInteger(key) {
	const value = requireEnvValue(key);
	if (!value) {
		return;
	}

	const numericValue = Number.parseInt(value, 10);
	if (!Number.isInteger(numericValue) || numericValue <= 0) {
		errors.push(`${key} must be a positive integer. Received: ${value}`);
	}
}

const databaseDriver = assertEnumValue("APP_LMS_DATABASE_DRIVER", [
	"auto",
	"postgres",
	"neon-http",
]);
const cacheDriver = assertEnumValue("APP_LMS_CACHE_DRIVER", ["memory", "redis", "upstash"]);
const filesDriver = assertEnumValue("APP_LMS_FILES_STORAGE_DRIVER", ["local", "s3"]);
const filesS3Provider =
	filesDriver === "s3"
		? assertEnumValue("APP_LMS_FILES_S3_PROVIDER", ["r2", "minio", "aws", "custom"])
		: undefined;
const emailDriver = assertEnumValue("APP_LMS_EMAIL_DRIVER", ["log", "resend"]);

requireEnvValue("APP_LMS_DATABASE_URL");
requireEnvValue("APP_LMS_BETTER_AUTH_SECRET");
requireEnvValue("APP_LMS_BETTER_AUTH_URL");
requireEnvValue("APP_LMS_CORS_ORIGIN");
assertPositiveInteger("APP_LMS_SERVER_PORT");

const publicServerUrl = getEnvValue("VITE_APP_LMS_SERVER_URL");
if (!publicServerUrl) {
	warnings.push(
		"VITE_APP_LMS_SERVER_URL is not set. Health checks will default to localhost unless APP_LMS_HEALTHCHECK_URL is provided.",
	);
}

if (cacheDriver === "redis") {
	requireEnvValue("REDIS_URL");
}

if (cacheDriver === "upstash") {
	requireEnvValue("APP_LMS_UPSTASH_REDIS_URL");
	requireEnvValue("APP_LMS_UPSTASH_REDIS_TOKEN");
}

if (filesDriver === "local") {
	requireEnvValue("APP_LMS_FILES_LOCAL_ROOT");
}

if (filesDriver === "s3") {
	requireEnvValue("APP_LMS_FILES_S3_ENDPOINT");
	requireEnvValue("APP_LMS_FILES_S3_PUBLIC_BUCKET");
	requireEnvValue("APP_LMS_FILES_S3_PRIVATE_BUCKET");

	const accessKeyId = getEnvValue("APP_LMS_FILES_S3_ACCESS_KEY_ID");
	const secretAccessKey = getEnvValue("APP_LMS_FILES_S3_SECRET_ACCESS_KEY");
	if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
		errors.push(
			"APP_LMS_FILES_S3_ACCESS_KEY_ID and APP_LMS_FILES_S3_SECRET_ACCESS_KEY must be set together when files driver is s3.",
		);
	}
}

if (emailDriver === "resend") {
	requireEnvValue("APP_LMS_RESEND_API_KEY");
}

console.log("Self-host preflight summary");
console.log(
	`- Loaded env files: ${loadedEnvPaths.length > 0 ? loadedEnvPaths.join(", ") : "none"}`,
);
console.log(`- Database driver: ${databaseDriver ?? "unresolved"}`);
console.log(`- Cache driver: ${cacheDriver ?? "unresolved"}`);
console.log(`- Files driver: ${filesDriver ?? "unresolved"}`);
if (filesDriver === "s3") {
	console.log(`- Files S3 provider: ${filesS3Provider ?? "unresolved"}`);
}
console.log(`- Email driver: ${emailDriver ?? "unresolved"}`);

if (warnings.length > 0) {
	console.log("\nWarnings:");
	for (const warning of warnings) {
		console.log(`- ${warning}`);
	}
}

if (errors.length > 0) {
	console.error("\nPreflight failed:");
	for (const error of errors) {
		console.error(`- ${error}`);
	}
	process.exit(1);
}

console.log("\nPreflight passed.");
