import { env } from "@de100/apps-lms-env/server";
import { solidStart } from "@solidjs/start/config";
import { nitroV2Plugin as nitro } from "@solidjs/vite-plugin-nitro-2";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const isTraceModeEnabled =
	env.LMS_APP_VITE_TRACE_MODE === "1" || env.LMS_APP_VITE_TRACE_MODE === "true";
const nitroPreset = env.NITRO_PRESET ?? process.env.NITRO_PRESET;
const nitroConfig = nitroPreset
	? {
			preset: nitroPreset,
		}
	: undefined;
console.log("___ nitroPreset", nitroPreset);

const solidWorkspaceDeps = ["@de100/i18n-domains-solidjs", "@de100/ui-solidjs"];

const depsToOptimize = [
	"@de100/apps-lms-api",
	"@de100/apps-lms-auth",
	// "@de100/apps-lms-config",
	"@de100/apps-lms-db",
	// "@de100/apps-lms-env",
	"@de100/apps-lms-validators",
	"@de100/i18n-core/client",
	"@de100/i18n-core/server",
	"@de100/i18n-core/shared",
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
	plugins: [
		solidStart({ middleware: "./src/middleware/index.ts" }),
		tailwindcss(),
		nitro(nitroConfig),
	],
	optimizeDeps: {
		include: depsToOptimize,
		exclude: solidWorkspaceDeps,
	},
	ssr: {
		noExternal: [...depsToOptimize, ...solidWorkspaceDeps],
	},
});
