import { afterEach, describe, expect, it, vi } from "vitest";

const booleanCases = [
	["true", true],
	["false", false],
	["1", true],
	["0", false],
] as const;
const envImportTimeoutMs = 15_000;

describe("Proto Cook server env parsing", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it.each(booleanCases)(
		"parses APP_PROTO_COOK_FILES_S3_FORCE_PATH_STYLE=%s as %s",
		async (value, expected) => {
			stubRequiredServerEnv({
				APP_PROTO_COOK_FILES_S3_FORCE_PATH_STYLE: value,
			});

			const { env, filesStorageMode } = await import("./server");

			expect(env.APP_PROTO_COOK_FILES_S3_FORCE_PATH_STYLE).toBe(expected);
			expect(filesStorageMode.type).toBe("s3");
			if (filesStorageMode.type === "s3") {
				expect(filesStorageMode.s3.forcePathStyle).toBe(expected);
			}
		},
		envImportTimeoutMs,
	);

	it.each(booleanCases)(
		"parses DISABLE_ORPC_OUTPUT_VALIDATION=%s as %s",
		async (value, expected) => {
			stubRequiredServerEnv({
				DISABLE_ORPC_OUTPUT_VALIDATION: value,
			});

			const { env } = await import("./server");

			expect(env.DISABLE_ORPC_OUTPUT_VALIDATION).toBe(expected);
		},
		envImportTimeoutMs,
	);

	it(
		"accepts the CI env writer boolean shape",
		async () => {
			stubRequiredServerEnv({
				APP_PROTO_COOK_FILES_S3_FORCE_PATH_STYLE: "true",
				DISABLE_ORPC_OUTPUT_VALIDATION: "false",
			});

			const { env } = await import("./server");

			expect(env.APP_PROTO_COOK_FILES_S3_FORCE_PATH_STYLE).toBe(true);
			expect(env.DISABLE_ORPC_OUTPUT_VALIDATION).toBe(false);
		},
		envImportTimeoutMs,
	);
});

function stubRequiredServerEnv(overrides: Record<string, string>) {
	const baseEnv = {
		APP_PROTO_COOK_BETTER_AUTH_SECRET: "proto-cook-test-secret-please-change",
		APP_PROTO_COOK_BETTER_AUTH_URL: "http://127.0.0.1:3000/api/auth",
		APP_PROTO_COOK_CORS_ORIGIN: "http://127.0.0.1:3000",
		APP_PROTO_COOK_DATABASE_DRIVER: "postgres",
		APP_PROTO_COOK_DATABASE_URL: "postgres://postgres:postgres@127.0.0.1:5432/de100_proto_cook",
		APP_PROTO_COOK_FILES_STORAGE_DRIVER: "s3",
		NODE_ENV: "test",
		...overrides,
	};

	for (const [key, value] of Object.entries(baseEnv)) {
		vi.stubEnv(key, value);
	}
}
