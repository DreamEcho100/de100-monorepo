import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const roots = ["apps", "packages", "tooling"];
const ignoredDirectories = new Set([
	".cache",
	".git",
	".nitro",
	".output",
	".turbo",
	".wrangler",
	"dist",
	"node_modules",
]);
const requiredScripts = [
	"clean",
	"format-and-lint:check",
	"format-and-lint:fix",
	"format:check",
	"format:fix",
	"lint:check",
	"lint:fix",
	"type:check",
];

/**
 * @param {string} directory
 * @returns {Generator<string>}
 */
function* walkPackages(directory) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (ignoredDirectories.has(entry.name)) continue;

		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			yield* walkPackages(entryPath);
			continue;
		}

		if (entry.name === "package.json") {
			yield entryPath;
		}
	}
}

/** @param {string} packageJsonPath */
function isActivePackage(packageJsonPath) {
	const relative = path.relative(repoRoot, packageJsonPath);
	if (relative.startsWith(`docs${path.sep}archive${path.sep}`)) return false;
	if (relative.startsWith(`_old${path.sep}`)) return false;
	if (relative.startsWith(`_ignore${path.sep}`)) return false;
	return true;
}

const failures = [];

for (const root of roots) {
	const rootPath = path.join(repoRoot, root);
	if (!statSync(rootPath, { throwIfNoEntry: false })?.isDirectory()) continue;

	for (const packageJsonPath of walkPackages(rootPath)) {
		if (!isActivePackage(packageJsonPath)) continue;

		const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
		const missingScripts = requiredScripts.filter((script) => !packageJson.scripts?.[script]);

		if (missingScripts.length > 0) {
			failures.push(
				`${path.relative(repoRoot, packageJsonPath)} missing scripts: ${missingScripts.join(", ")}`,
			);
		}
	}
}

if (failures.length > 0) {
	console.error("Package script convention failed:");
	for (const failure of failures) {
		console.error(`- ${failure}`);
	}
	process.exit(1);
}

console.log("Package script convention passed.");
