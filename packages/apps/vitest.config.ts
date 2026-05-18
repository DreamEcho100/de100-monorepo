import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const configDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	root: configDir,
	test: {
		environment: "node",
		clearMocks: true,
		restoreMocks: true,
		exclude: ["**/.cache/**", "**/dist/**", "**/node_modules/**"],
		include: ["lms/**/src/**/*.test.ts"],
	},
});
