import { loadRepoEnv } from "./_shared/load-env.mjs";

const { loadedEnvPaths } = loadRepoEnv();

function getEnvValue(key) {
	const value = process.env[key];
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function resolveBaseUrl() {
	const explicitBaseUrl =
		getEnvValue("APP_LMS_SMOKE_BASE_URL") ??
		getEnvValue("VITE_APP_LMS_SERVER_URL") ??
		getEnvValue("APP_LMS_CORS_ORIGIN");
	if (explicitBaseUrl) {
		return explicitBaseUrl;
	}

	const healthcheckUrl = getEnvValue("APP_LMS_HEALTHCHECK_URL");
	if (healthcheckUrl) {
		return new URL(healthcheckUrl).origin;
	}

	const serverPort = getEnvValue("APP_LMS_SERVER_PORT") || "3000";
	return `http://127.0.0.1:${serverPort}`;
}

function toAbsoluteUrl(baseUrl, path) {
	return new URL(path, `${baseUrl.replace(/\/$/, "")}/`).toString();
}

function assertStatus(name, status, expectedStatuses) {
	if (expectedStatuses.includes(status)) {
		return;
	}

	throw new Error(
		`${name} returned unexpected status ${status}. Expected one of: ${expectedStatuses.join(", ")}.`,
	);
}

function assertContentType(name, response, expectedPrefix) {
	const contentType = response.headers.get("content-type") || "";
	if (contentType.toLowerCase().startsWith(expectedPrefix.toLowerCase())) {
		return;
	}

	throw new Error(
		`${name} returned content-type "${contentType}" but expected prefix "${expectedPrefix}".`,
	);
}

function assertRedirectLocation(name, response, expectedPath) {
	const location = response.headers.get("location") || "";
	if (!location) {
		throw new Error(`${name} did not return a redirect location header.`);
	}

	const redirectedPath = new URL(location, "http://localhost").pathname;
	if (redirectedPath === expectedPath) {
		return;
	}

	throw new Error(`${name} redirected to "${redirectedPath}" but expected "${expectedPath}".`);
}

async function runCheck(baseUrl, check, timeoutMs) {
	const requestUrl = toAbsoluteUrl(baseUrl, check.path);
	const controller = new AbortController();
	const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(requestUrl, {
			headers: {
				accept: check.accept,
			},
			method: "GET",
			redirect: check.redirectMode,
			signal: controller.signal,
		});

		assertStatus(check.name, response.status, check.expectedStatuses);

		if (check.expectedContentTypePrefix) {
			assertContentType(check.name, response, check.expectedContentTypePrefix);
		}

		if (check.expectedRedirectPath) {
			assertRedirectLocation(check.name, response, check.expectedRedirectPath);
		}

		if (check.parseJson) {
			await response.json();
		}

		return {
			name: check.name,
			ok: true,
			status: response.status,
			url: requestUrl,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			message,
			name: check.name,
			ok: false,
			url: requestUrl,
		};
	} finally {
		clearTimeout(timeoutHandle);
	}
}

const timeoutMs = Number.parseInt(getEnvValue("APP_LMS_SMOKE_TIMEOUT_MS") || "15000", 10);
const safeTimeoutMs = Number.isInteger(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000;
const baseUrl = resolveBaseUrl();

const checks = [
	{
		accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
		expectedContentTypePrefix: "text/html",
		expectedStatuses: [200],
		name: "localized home route /en",
		path: "/en",
		redirectMode: "follow",
	},
	{
		accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
		expectedContentTypePrefix: "text/html",
		expectedStatuses: [200],
		name: "localized home route /ar",
		path: "/ar",
		redirectMode: "follow",
	},
	{
		accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
		expectedRedirectPath: "/en/api/reference",
		expectedStatuses: [301, 302, 307, 308],
		name: "api reference redirect /api/reference",
		path: "/api/reference",
		redirectMode: "manual",
	},
	{
		accept: "application/json, text/plain;q=0.9, */*;q=0.8",
		expectedContentTypePrefix: "application/json",
		expectedStatuses: [200],
		name: "openapi spec endpoint /api/reference/spec.json",
		parseJson: true,
		path: "/api/reference/spec.json",
		redirectMode: "follow",
	},
];

console.log("Self-host public smoke summary");
console.log(
	`- Loaded env files: ${loadedEnvPaths.length > 0 ? loadedEnvPaths.join(", ") : "none"}`,
);
console.log(`- Base URL: ${baseUrl}`);
console.log(`- Timeout per request: ${safeTimeoutMs}ms`);

const results = [];
for (const check of checks) {
	// Execute checks sequentially to keep output deterministic for deployment logs.
	results.push(await runCheck(baseUrl, check, safeTimeoutMs));
}

const failedChecks = results.filter((result) => !result.ok);
for (const result of results) {
	if (result.ok) {
		console.log(`- PASS ${result.name} (${result.status}) -> ${result.url}`);
		continue;
	}

	console.error(`- FAIL ${result.name} -> ${result.url}`);
	console.error(`  ${result.message}`);
}

if (failedChecks.length > 0) {
	process.exit(1);
}

console.log("Public smoke checks passed.");
