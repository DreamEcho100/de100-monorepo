import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	expect: {
		timeout: 10_000,
	},
	fullyParallel: true,
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
			},
		},
	],
	testMatch: "**/*.pw.ts",
	testDir: "./tests/browser",
	timeout: 30_000,
	use: {
		baseURL: "http://127.0.0.1:4173",
		trace: "on-first-retry",
	},
	webServer: {
		command: "pnpm build && PORT=4173 node .output/server/index.mjs",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		url: "http://127.0.0.1:4173/en",
	},
});
