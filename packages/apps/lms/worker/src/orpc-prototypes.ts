import type { FilesQueueAdapter, FilesWorkerJobPayload } from "@de100/files-server/worker";

import type { LmsFilesWorkerRunOnceResult } from "./runner";

export const lmsFilesWorkerOrpcNamespaceValues = ["internal", "admin-lab", "public-lab"] as const;
export type LmsFilesWorkerOrpcNamespace = (typeof lmsFilesWorkerOrpcNamespaceValues)[number];

export const lmsFilesWorkerOrpcProcedureValues = ["enqueue", "getStatus", "runOnce"] as const;
export type LmsFilesWorkerOrpcProcedure = (typeof lmsFilesWorkerOrpcProcedureValues)[number];

export const lmsFilesWorkerProductionOrpcNamespace = "internal" as const;

export type LmsFilesWorkerOrpcPrototypeStatus = {
	namespace: LmsFilesWorkerOrpcNamespace;
	productionRecommendedNamespace: typeof lmsFilesWorkerProductionOrpcNamespace;
	queueDriver: "db" | "redis";
	running: boolean;
};

export type LmsFilesWorkerOrpcPrototype = {
	enqueue(job: FilesWorkerJobPayload): Promise<{ accepted: boolean }>;
	getStatus(): Promise<LmsFilesWorkerOrpcPrototypeStatus>;
	runOnce(): Promise<LmsFilesWorkerRunOnceResult>;
};

export type CreateLmsFilesWorkerOrpcPrototypeInput = {
	enqueueQueue?: FilesQueueAdapter;
	getStatus(): Promise<
		Omit<LmsFilesWorkerOrpcPrototypeStatus, "namespace" | "productionRecommendedNamespace">
	>;
	namespace: LmsFilesWorkerOrpcNamespace;
	runOnce(): Promise<LmsFilesWorkerRunOnceResult>;
};

const namespaceProcedurePolicy = {
	"admin-lab": new Set<LmsFilesWorkerOrpcProcedure>(["getStatus", "runOnce"]),
	internal: new Set<LmsFilesWorkerOrpcProcedure>(["enqueue", "getStatus", "runOnce"]),
	"public-lab": new Set<LmsFilesWorkerOrpcProcedure>(["getStatus"]),
} satisfies Record<LmsFilesWorkerOrpcNamespace, Set<LmsFilesWorkerOrpcProcedure>>;

export function canExposeLmsFilesWorkerOrpcProcedure(input: {
	namespace: LmsFilesWorkerOrpcNamespace;
	procedure: LmsFilesWorkerOrpcProcedure;
}) {
	return namespaceProcedurePolicy[input.namespace].has(input.procedure);
}

export function createLmsFilesWorkerOrpcPrototype(
	input: CreateLmsFilesWorkerOrpcPrototypeInput,
): LmsFilesWorkerOrpcPrototype {
	return {
		async enqueue(job) {
			assertProcedureAllowed(input.namespace, "enqueue");
			if (!input.enqueueQueue) {
				throw new Error("The worker enqueue queue is not configured for this oRPC prototype.");
			}

			await input.enqueueQueue.enqueue(job);
			return { accepted: true };
		},
		async getStatus() {
			const status = await input.getStatus();
			return {
				...status,
				namespace: input.namespace,
				productionRecommendedNamespace: lmsFilesWorkerProductionOrpcNamespace,
			};
		},
		async runOnce() {
			assertProcedureAllowed(input.namespace, "runOnce");
			return input.runOnce();
		},
	};
}

function assertProcedureAllowed(
	namespace: LmsFilesWorkerOrpcNamespace,
	procedure: LmsFilesWorkerOrpcProcedure,
) {
	if (!canExposeLmsFilesWorkerOrpcProcedure({ namespace, procedure })) {
		throw new Error(`Worker oRPC procedure ${procedure} is not exposed in ${namespace}.`);
	}
}
