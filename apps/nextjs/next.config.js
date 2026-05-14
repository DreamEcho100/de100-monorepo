import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
await jiti.import("./src/env");

/** @type {import("next").NextConfig} */
const config = {
	/** Enables hot reloading for local packages without a build step */
	transpilePackages: [
		"@de100/api-proto",
		"@de100/auth-proto",
		"@de100/db-proto",
		"@de100/ui-proto",
		"@de100/validators-proto",
	],

	/** We already do linting and typechecking as separate tasks in CI */
	typescript: { ignoreBuildErrors: true },
};

export default config;
