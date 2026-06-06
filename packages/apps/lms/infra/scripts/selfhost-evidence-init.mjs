import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function printUsage() {
	console.log(
		"Usage: pnpm -F @de100/apps-lms-infra selfhost:evidence:init -- [environment] [--dry-run] [--force]",
	);
	console.log("Examples:");
	console.log("  pnpm -F @de100/apps-lms-infra selfhost:evidence:init -- staging");
	console.log("  pnpm -F @de100/apps-lms-infra selfhost:evidence:init -- production --dry-run");
}

function normalizeEnvironmentLabel(label) {
	const normalized = label.trim().toLowerCase();
	if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
		throw new Error(
			`Invalid environment label "${label}". Use lowercase letters, numbers, and dashes only.`,
		);
	}

	return normalized;
}

function parseOptions(rawArgs) {
	const options = {
		dryRun: false,
		environment: process.env.APP_LMS_EVIDENCE_ENV || "staging",
		force: false,
	};

	for (const arg of rawArgs) {
		if (arg === "--") {
			continue;
		}

		if (arg === "--dry-run") {
			options.dryRun = true;
			continue;
		}

		if (arg === "--force") {
			options.force = true;
			continue;
		}

		if (arg.startsWith("--env=")) {
			options.environment = arg.slice("--env=".length);
			continue;
		}

		if (arg === "--help" || arg === "-h") {
			printUsage();
			process.exit(0);
		}

		if (arg.startsWith("-")) {
			throw new Error(`Unknown option: ${arg}`);
		}

		options.environment = arg;
	}

	options.environment = normalizeEnvironmentLabel(options.environment);
	return options;
}

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, "../../../../../");
const templatePath = resolve(repoRoot, "docs/evidence/templates/hosted-deploy-smoke-template.md");
const evidenceDir = resolve(repoRoot, "docs/evidence");

let options;
try {
	options = parseOptions(process.argv.slice(2));
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(message);
	printUsage();
	process.exit(1);
}

if (!existsSync(templatePath)) {
	console.error(`Evidence template not found: ${templatePath}`);
	process.exit(1);
}

const now = new Date();
const dateStamp = now.toISOString().slice(0, 10);
const nowIso = now.toISOString();
const commitSha = process.env.GITHUB_SHA?.trim() || "local";
const fileName = `${dateStamp}-hosted-smoke-${options.environment}.md`;
const outputPath = resolve(evidenceDir, fileName);

if (existsSync(outputPath) && !options.force) {
	console.error(`Evidence file already exists: ${outputPath}`);
	console.error("Use --force to overwrite the existing file.");
	process.exit(1);
}

const templateContent = readFileSync(templatePath, "utf8");
const filledTemplate = templateContent
	.replace("- Date (UTC):", `- Date (UTC): ${nowIso}`)
	.replace("- Environment:", `- Environment: ${options.environment}`)
	.replace("- Commit SHA:", `- Commit SHA: ${commitSha}`);

if (options.dryRun) {
	console.log("Dry run: no file was written.");
	console.log(`- Template: ${templatePath}`);
	console.log(`- Output: ${outputPath}`);
	process.exit(0);
}

writeFileSync(outputPath, filledTemplate, "utf8");

console.log(`Created hosted smoke evidence file: ${outputPath}`);
console.log("Next: fill command outputs, route checks, auth/files checks, and final sign-off.");
