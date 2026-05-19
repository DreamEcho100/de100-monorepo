import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, "../../../..");
const candidateEnvPaths = [
	resolve(repoRoot, ".env.deploy.local"),
	resolve(repoRoot, ".env.deploy"),
	resolve(repoRoot, "apps/lms-web/.env.deploy.local"),
	resolve(repoRoot, "apps/lms-web/.env.deploy"),
	resolve(repoRoot, ".env.local"),
	resolve(repoRoot, ".env"),
	resolve(repoRoot, "apps/lms-web/.env.local"),
	resolve(repoRoot, "apps/lms-web/.env"),
];

for (const envPath of new Set(candidateEnvPaths)) {
	if (existsSync(envPath)) {
		dotenv.config({ path: envPath, override: false });
	}
}

export default defineConfig({
	schema: "./src/schema",
	out: "./src/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.APP_LMS_DATABASE_URL || "",
	},
});
