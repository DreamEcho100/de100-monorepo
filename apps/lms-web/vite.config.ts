import { env } from "@de100/apps-lms-env/server";
import { solidStart } from "@solidjs/start/config";
import { nitroV2Plugin as nitro } from "@solidjs/vite-plugin-nitro-2";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const isTraceModeEnabled =
	process.env.LMS_APP_VITE_TRACE_MODE === "1" || process.env.LMS_APP_VITE_TRACE_MODE === "true";

const solidWorkspaceDeps = ["@de100/i18n-domains-solidjs", "@de100/ui-solidjs"];

const depsToOptimize = [
	"@de100/apps-i18n",
	"@de100/apps-lms-api",
	"@de100/apps-lms-auth",
	// "@de100/apps-lms-config",
	"@de100/apps-lms-db",
	// "@de100/apps-lms-env",
	"@de100/apps-lms-infra",
	"@de100/apps-lms-validators",
];

export default defineConfig({
	server: {
		sourcemapIgnoreList: isTraceModeEnabled ? false : undefined,
		port: env.APP_LMS_SERVER_PORT ?? 3000,
	},
	css: {
		// Tailwind/Vite dev CSS sourcemaps currently pull source-map-js into the browser
		// as a raw CommonJS module, which breaks the media page in local dev.
		// devSourcemap: false,
	},
	esbuild: {
		keepNames: isTraceModeEnabled,
	},
	build: {
		sourcemap: isTraceModeEnabled,
		minify: isTraceModeEnabled ? false : undefined,
		cssMinify: isTraceModeEnabled ? false : undefined,
		reportCompressedSize: !isTraceModeEnabled,
	},
	plugins: [solidStart({ middleware: "./src/middleware/index.ts" }), tailwindcss(), nitro()],
	optimizeDeps: {
		include: depsToOptimize,
		exclude: solidWorkspaceDeps,
	},
	ssr: {
		noExternal: [...depsToOptimize, ...solidWorkspaceDeps],
	},
});
