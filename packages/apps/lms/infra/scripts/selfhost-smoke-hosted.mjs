import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadRepoEnv } from "./_shared/load-env.mjs";

function printUsage() {
	console.log(
		"Usage: pnpm -F @de100/apps-lms-infra selfhost:smoke:hosted -- --url <origin> [--env <environment>] [--timeout-ms <ms>] [--health-url <url>] [--skip-evidence-init] [--evidence-dry-run] [--force-evidence]",
	);
	console.log("Examples:");
	console.log(
		"  pnpm -F @de100/apps-lms-infra selfhost:smoke:hosted -- --url https://app.example --env production",
	);
	console.log(
		"  pnpm -F @de100/apps-lms-infra selfhost:smoke:hosted -- --url https://staging.example --env staging --evidence-dry-run",
	);
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

function normalizeOriginUrl(value, optionName) {
	let parsedUrl;
	try {
		parsedUrl = new URL(value);
	} catch {
		throw new Error(`${optionName} must be a valid absolute URL. Received: ${value}`);
	}

	if (!["http:", "https:"].includes(parsedUrl.protocol)) {
		throw new Error(
			`${optionName} must use http or https. Received protocol: ${parsedUrl.protocol}`,
		);
	}

	return parsedUrl.origin;
}

function readRequiredValue(args, index, optionName) {
	const value = args[index + 1];
	if (typeof value !== "string" || value.startsWith("-")) {
		throw new Error(`${optionName} requires a value.`);
	}

	return value;
}

function parseOptions(rawArgs) {
	const options = {
		baseUrl: process.env.APP_LMS_SMOKE_BASE_URL,
		evidenceDryRun: false,
		environment: process.env.APP_LMS_EVIDENCE_ENV || "staging",
		forceEvidence: false,
		healthUrl: process.env.APP_LMS_HEALTHCHECK_URL,
		skipEvidenceInit: false,
		timeoutMs: process.env.APP_LMS_SMOKE_TIMEOUT_MS || "15000",
	};

	for (let index = 0; index < rawArgs.length; index += 1) {
		const arg = rawArgs[index];

		if (arg === "--") {
			continue;
		}

		if (arg === "--help" || arg === "-h") {
			printUsage();
			process.exit(0);
		}

		if (arg === "--skip-evidence-init") {
			options.skipEvidenceInit = true;
			continue;
		}

		if (arg === "--evidence-dry-run") {
			options.evidenceDryRun = true;
			continue;
		}

		if (arg === "--force-evidence") {
			options.forceEvidence = true;
			continue;
		}

		if (arg === "--url") {
			options.baseUrl = readRequiredValue(rawArgs, index, "--url");
			index += 1;
			continue;
		}

		if (arg.startsWith("--url=")) {
			options.baseUrl = arg.slice("--url=".length);
			continue;
		}

		if (arg === "--env") {
			options.environment = readRequiredValue(rawArgs, index, "--env");
			index += 1;
			continue;
		}

		if (arg.startsWith("--env=")) {
			options.environment = arg.slice("--env=".length);
			continue;
		}

		if (arg === "--timeout-ms") {
			options.timeoutMs = readRequiredValue(rawArgs, index, "--timeout-ms");
			index += 1;
			continue;
		}

		if (arg.startsWith("--timeout-ms=")) {
			options.timeoutMs = arg.slice("--timeout-ms=".length);
			continue;
		}

		if (arg === "--health-url") {
			options.healthUrl = readRequiredValue(rawArgs, index, "--health-url");
			index += 1;
			continue;
		}

		if (arg.startsWith("--health-url=")) {
			options.healthUrl = arg.slice("--health-url=".length);
			continue;
		}

		throw new Error(`Unknown option: ${arg}`);
	}

	if (!options.baseUrl) {
		throw new Error("Missing base URL. Provide --url <origin> or set APP_LMS_SMOKE_BASE_URL.");
	}

	const normalizedBaseUrl = normalizeOriginUrl(options.baseUrl, "--url");
	const normalizedEnvironment = normalizeEnvironmentLabel(options.environment);
	const timeoutMs = Number.parseInt(String(options.timeoutMs), 10);
	if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
		throw new Error(`--timeout-ms must be a positive integer. Received: ${options.timeoutMs}`);
	}

	const healthUrl = options.healthUrl
		? new URL(options.healthUrl).toString()
		: new URL("/health", `${normalizedBaseUrl}/`).toString();

	if (options.skipEvidenceInit && options.evidenceDryRun) {
		console.warn("Ignoring --evidence-dry-run because --skip-evidence-init is enabled.");
	}

	if (options.skipEvidenceInit && options.forceEvidence) {
		console.warn("Ignoring --force-evidence because --skip-evidence-init is enabled.");
	}

	return {
		baseUrl: normalizedBaseUrl,
		evidenceDryRun: options.evidenceDryRun,
		environment: normalizedEnvironment,
		forceEvidence: options.forceEvidence,
		healthUrl,
		skipEvidenceInit: options.skipEvidenceInit,
		timeoutMs,
	};
}

function runCommand(command, args, cwd) {
	const result = spawnSync(command, args, {
		cwd,
		env: process.env,
		stdio: "inherit",
	});

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

const moduleDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(moduleDir, "..");
const { loadedEnvPaths } = loadRepoEnv();

let options;
try {
	options = parseOptions(process.argv.slice(2));
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(message);
	printUsage();
	process.exit(1);
}

process.env.APP_LMS_SMOKE_BASE_URL = options.baseUrl;
process.env.APP_LMS_SMOKE_TIMEOUT_MS = String(options.timeoutMs);
process.env.APP_LMS_HEALTHCHECK_URL = options.healthUrl;
process.env.APP_LMS_EVIDENCE_ENV = options.environment;

console.log("Hosted smoke orchestration summary");
console.log(
	`- Loaded env files: ${loadedEnvPaths.length > 0 ? loadedEnvPaths.join(", ") : "none"}`,
);
console.log(`- Base URL: ${options.baseUrl}`);
console.log(`- Health URL: ${options.healthUrl}`);
console.log(`- Timeout: ${options.timeoutMs}ms`);
console.log(`- Evidence environment: ${options.environment}`);
console.log(`- Skip evidence init: ${options.skipEvidenceInit ? "yes" : "no"}`);

console.log("\nRunning full self-host verification...");
runCommand("pnpm", ["selfhost:verify:full"], packageRoot);

if (!options.skipEvidenceInit) {
	const evidenceArgs = ["./scripts/selfhost-evidence-init.mjs", "--", options.environment];
	if (options.evidenceDryRun) {
		evidenceArgs.push("--dry-run");
	}
	if (options.forceEvidence) {
		evidenceArgs.push("--force");
	}

	console.log("\nScaffolding hosted smoke evidence...");
	runCommand("node", evidenceArgs, packageRoot);
}

console.log("\nHosted smoke orchestration complete.");
console.log("Next: complete manual post-deploy checklist items and fill the evidence artifact.");
