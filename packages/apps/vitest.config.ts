import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		clearMocks: true,
		restoreMocks: true,
		exclude: ["**/.cache/**", "**/dist/**", "**/node_modules/**"],
		include: ["lms/**/src/**/*.test.ts"],
	},
});