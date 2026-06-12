import { env } from "@de100/apps-proto-cook-env/server";

import { resolveProtoCookFilesWorkerConfig } from "./config";

export function resolveProtoCookFilesWorkerConfigFromEnv() {
	return resolveProtoCookFilesWorkerConfig({
		concurrency: env.filesWorker.concurrency,
		pollIntervalMs: env.filesWorker.pollIntervalMs,
		queueDriver: env.filesWorker.queueDriver,
		redisKeyPrefix: env.filesWorker.redisKeyPrefix,
		redisUrl: env.filesWorker.redisUrl,
		staleAfterMs: env.filesWorker.staleAfterMs,
	});
}
