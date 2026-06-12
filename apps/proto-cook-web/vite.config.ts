import { env } from "@de100/apps-proto-cook-env/server";
import { solidStart } from "@solidjs/start/config";
import { nitroV2Plugin as nitro } from "@solidjs/vite-plugin-nitro-2";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const isTraceModeEnabled =
	env.PROTO_COOK_APP_VITE_TRACE_MODE === "1" || env.PROTO_COOK_APP_VITE_TRACE_MODE === "true";
const nitroPreset = env.NITRO_PRESET ?? process.env.NITRO_PRESET;
const nitroConfig = nitroPreset
	? {
			preset: nitroPreset,
		}
	: undefined;

const solidWorkspaceDeps = [
	"@de100/i18n-domains-solidjs",
	"@de100/ui-domains-solidjs",
	"@de100/ui-shared",
];

const depsToOptimize = [
	"@de100/apps-proto-cook-api",
	"@de100/apps-proto-cook-auth",
	// "@de100/apps-proto-cook-config",
	"@de100/apps-proto-cook-db",
	// "@de100/apps-proto-cook-env",
	"@de100/apps-proto-cook-validators",
	"@de100/i18n-core/client",
	"@de100/i18n-core/server",
	"@de100/i18n-core/shared",
];

export default defineConfig({
	server: {
		host: "0.0.0.0",
		sourcemapIgnoreList: isTraceModeEnabled ? false : undefined,
		port: env.APP_PROTO_COOK_SERVER_PORT ?? 3000,
		strictPort: true,
	},
	css: {
		// Tailwind/Vite dev CSS sourcemaps currently pull source-map-js into the browser
		// as a raw CommonJS module, which breaks local app pages in dev.
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
