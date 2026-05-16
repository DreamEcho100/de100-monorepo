import alchemy from "alchemy";
import { Vite } from "alchemy/cloudflare";
import { config } from "dotenv";

const webAppCwd = "../../apps/web";

config({ path: "./.env" });
config({ path: `${webAppCwd}/.env` });

const app = await alchemy("budget-tracker_");

const viteServerUrl = process.env.VITE_SERVER_URL;

const viteBindings = viteServerUrl ? ({ VITE_SERVER_URL: viteServerUrl } as const) : undefined;

export const web = await Vite("web", {
	cwd: webAppCwd,
	assets: "dist",
	bindings: viteBindings,
});

console.log(`Web    -> ${web.url}`);

await app.finalize();
