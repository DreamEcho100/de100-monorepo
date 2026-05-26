import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import alchemy from "alchemy";
import { Images, R2Bucket, Vite } from "alchemy/cloudflare";
import { config } from "dotenv";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, "../../../../");
const webAppCwd = resolve(repoRoot, "apps/lms-web");
const nitroOutputNodeModules = resolve(webAppCwd, ".output/server/node_modules");
const pnpmVirtualNodeModules = resolve(repoRoot, "node_modules/.pnpm/node_modules");
const h3Entry = resolve(pnpmVirtualNodeModules, "h3/dist/_entries/generic.mjs");

if (!existsSync(h3Entry)) {
	throw new Error(`Expected h3 entrypoint at ${h3Entry}, but it was not found.`);
}

const resolveH3CloudflarePlugin = {
	name: "resolve-h3-cloudflare",
	setup(build: {
		onResolve: (options: { filter: RegExp }, callback: () => { path: string }) => void;
	}) {
		build.onResolve({ filter: /^h3$/ }, () => ({ path: h3Entry }));
	},
};
const candidateEnvPaths = [
	resolve(repoRoot, ".env.deploy.local"),
	resolve(repoRoot, ".env.deploy"),
	resolve(webAppCwd, ".env.deploy.local"),
	resolve(webAppCwd, ".env.deploy"),
	resolve(repoRoot, ".env.local"),
	resolve(repoRoot, ".env"),
	resolve(webAppCwd, ".env.local"),
	resolve(webAppCwd, ".env"),
];

for (const envPath of new Set(candidateEnvPaths)) {
	if (existsSync(envPath)) {
		config({ path: envPath, override: false });
	}
}

const app = await alchemy("de100-lms");

const viteServerUrl = process.env.VITE_APP_LMS_SERVER_URL;
const requiredRuntimeBindingKeys = [
	"APP_LMS_DATABASE_URL",
	"APP_LMS_BETTER_AUTH_SECRET",
	"APP_LMS_BETTER_AUTH_URL",
	"APP_LMS_CORS_ORIGIN",
] as const;
const optionalRuntimeBindingKeys = [
	"APP_LMS_DATABASE_DRIVER",
	"APP_LMS_CACHE_DRIVER",
	"APP_LMS_CACHE_KEY_PREFIX",
	"APP_LMS_MEDIA_STORAGE_DRIVER",
	"APP_LMS_MEDIA_LOCAL_ROOT",
	"APP_LMS_MEDIA_S3_ENDPOINT",
	"APP_LMS_MEDIA_S3_REGION",
	"APP_LMS_MEDIA_S3_ACCESS_KEY_ID",
	"APP_LMS_MEDIA_S3_SECRET_ACCESS_KEY",
	"APP_LMS_MEDIA_S3_PUBLIC_BUCKET",
	"APP_LMS_MEDIA_S3_PRIVATE_BUCKET",
	"APP_LMS_MEDIA_SIGNING_SECRET",
	"APP_LMS_MEDIA_SIGNED_URL_TTL_SECONDS",
	"REDIS_URL",
	"APP_LMS_UPSTASH_REDIS_URL",
	"APP_LMS_UPSTASH_REDIS_TOKEN",
	"APP_LMS_EMAIL_DRIVER",
	"APP_LMS_EMAIL_FROM",
	"APP_LMS_EMAIL_REPLY_TO",
	"APP_LMS_RESEND_API_KEY",
	"APP_LMS_SERVER_PORT",
] as const;
const requiredRuntimeBindingKeySet = new Set<string>(requiredRuntimeBindingKeys);
const runtimeBindings = Object.fromEntries(
	[...requiredRuntimeBindingKeys, ...optionalRuntimeBindingKeys].flatMap((key) => {
		const value = process.env[key];

		if (!value || value.trim().length === 0) {
			if (requiredRuntimeBindingKeySet.has(key)) {
				throw new Error(
					`Missing required deploy env var ${key}. Add it to .env.deploy.local before deploying.`,
				);
			}

			return [];
		}

		return [[key, value] as const];
	}),
);

if (!runtimeBindings.NODE_ENV) {
	runtimeBindings.NODE_ENV = "production";
}

const corsOrigins = [
	...new Set(
		[process.env.APP_LMS_CORS_ORIGIN, "http://localhost:3000"].filter((origin): origin is string =>
			Boolean(origin),
		),
	),
];

const publicMedia = await R2Bucket("public-media", {
	devDomain: true,
	cors: [
		{
			allowed: {
				headers: ["*"],
				methods: ["GET", "HEAD", "PUT", "POST"],
				origins: corsOrigins,
			},
			exposeHeaders: ["etag"],
			maxAgeSeconds: 3600,
		},
	],
});

const privateMedia = await R2Bucket("private-media", {
	cors: [
		{
			allowed: {
				headers: ["*"],
				methods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
				origins: corsOrigins,
			},
			exposeHeaders: ["etag"],
			maxAgeSeconds: 3600,
		},
	],
});

const images = Images();

const viteBindings = {
	...runtimeBindings,
	...(viteServerUrl ? { VITE_APP_LMS_SERVER_URL: viteServerUrl } : {}),
	IMAGES: images,
	PRIVATE_MEDIA_BUCKET: privateMedia,
	PRIVATE_MEDIA_BUCKET_NAME: privateMedia.name,
	PUBLIC_MEDIA_BUCKET: publicMedia,
	PUBLIC_MEDIA_BUCKET_NAME: publicMedia.name,
	PUBLIC_MEDIA_DEV_DOMAIN: publicMedia.devDomain ?? "",
} as const;

export const web = await Vite("lms-web", {
	cwd: webAppCwd,
	build: {
		env: {
			NODE_OPTIONS: "--experimental-strip-types",
			NITRO_PRESET: "cloudflare_module",
		},
	},
	assets: ".output/public",
	entrypoint: ".output/server/index.mjs",
	bundle: {
		conditions: ["workerd", "worker", "browser"],
		nodePaths: [nitroOutputNodeModules, pnpmVirtualNodeModules],
		plugins: [resolveH3CloudflarePlugin],
	},
	spa: false,
	compatibility: "node",
	observability: {
		enabled: true,
		headSamplingRate: 1,
		logs: {
			enabled: true,
			headSamplingRate: 1,
			persist: true,
			invocationLogs: true,
		},
		traces: {
			enabled: true,
			headSamplingRate: 1,
			persist: true,
		},
	},
	bindings: viteBindings,
});

console.log(`Web    -> ${web.url}`);
console.log(
	`Public -> ${publicMedia.name}${publicMedia.devDomain ? ` (${publicMedia.devDomain})` : ""}`,
);
console.log(`Private -> ${privateMedia.name}`);

await app.finalize();
