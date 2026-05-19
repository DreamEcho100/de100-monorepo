import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import alchemy from "alchemy";
import { Images, R2Bucket, Vite } from "alchemy/cloudflare";
import { config } from "dotenv";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, "../../../../");
const webAppCwd = resolve(repoRoot, "apps/lms-web");
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
	assets: "dist",
	bindings: viteBindings,
});

console.log(`Web    -> ${web.url}`);
console.log(
	`Public -> ${publicMedia.name}${publicMedia.devDomain ? ` (${publicMedia.devDomain})` : ""}`,
);
console.log(`Private -> ${privateMedia.name}`);

await app.finalize();
