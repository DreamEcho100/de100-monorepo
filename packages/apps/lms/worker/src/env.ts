import { env } from "@de100/apps-lms-env/server";

import { resolveLmsFilesWorkerConfig } from "./config";

export function resolveLmsFilesWorkerConfigFromEnv() {
	return resolveLmsFilesWorkerConfig({
		concurrency: env.filesWorker.concurrency,
		pollIntervalMs: env.filesWorker.pollIntervalMs,
		queueDriver: env.filesWorker.queueDriver,
		redisKeyPrefix: env.filesWorker.redisKeyPrefix,
		redisUrl: env.filesWorker.redisUrl,
		staleAfterMs: env.filesWorker.staleAfterMs,
	});
}
