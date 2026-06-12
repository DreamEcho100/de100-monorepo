import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";

export function loadRepoEnv() {
	const moduleDir = dirname(fileURLToPath(import.meta.url));
	const repoRoot = resolve(moduleDir, "../../../../../../");
	const webAppDir = resolve(repoRoot, "apps/proto-cook-web");
	const candidateEnvPaths = [
		resolve(repoRoot, ".env.deploy.local"),
		resolve(repoRoot, ".env.deploy"),
		resolve(webAppDir, ".env.deploy.local"),
		resolve(webAppDir, ".env.deploy"),
		resolve(repoRoot, ".env.local"),
		resolve(repoRoot, ".env"),
		resolve(webAppDir, ".env.local"),
		resolve(webAppDir, ".env"),
	];

	const loadedEnvPaths = [];

	for (const envPath of new Set(candidateEnvPaths)) {
		if (!existsSync(envPath)) {
			continue;
		}

		loadEnv({ path: envPath, override: false });
		loadedEnvPaths.push(envPath);
	}

	return {
		loadedEnvPaths,
		repoRoot,
		webAppDir,
	};
}
