import { loadRepoEnv } from "./_shared/load-env.mjs";

loadRepoEnv();

const configuredHealthcheckUrl = process.env.APP_LMS_HEALTHCHECK_URL?.trim();
const healthcheckPath = process.env.APP_LMS_HEALTHCHECK_PATH?.trim() || "/health";
const fallbackBaseUrl =
	process.env.VITE_APP_LMS_SERVER_URL?.trim() ||
	`http://127.0.0.1:${process.env.APP_LMS_SERVER_PORT?.trim() || "3000"}`;
const targetUrl = configuredHealthcheckUrl || new URL(healthcheckPath, fallbackBaseUrl).toString();
const timeoutMs = Number.parseInt(process.env.APP_LMS_HEALTHCHECK_TIMEOUT_MS || "10000", 10);

const controller = new AbortController();
const timeoutHandle = setTimeout(
	() => {
		controller.abort();
	},
	Number.isNaN(timeoutMs) ? 10000 : timeoutMs,
);

try {
	const response = await fetch(targetUrl, {
		method: "GET",
		headers: {
			accept: "application/json, text/plain;q=0.9, */*;q=0.8",
		},
		signal: controller.signal,
	});
	const responseBody = await response.text();

	console.log(`Health check target: ${targetUrl}`);
	console.log(`Status: ${response.status}`);

	if (!response.ok) {
		console.error("Health check failed.");
		if (responseBody) {
			console.error(`Body: ${responseBody.slice(0, 500)}`);
		}
		process.exit(1);
	}

	if (responseBody) {
		console.log(`Body: ${responseBody.slice(0, 500)}`);
	}
	console.log("Health check passed.");
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`Health check request failed: ${message}`);
	process.exit(1);
} finally {
	clearTimeout(timeoutHandle);
}
