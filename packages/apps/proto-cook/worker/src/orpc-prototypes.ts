import type { FilesQueueAdapter, FilesWorkerJobPayload } from "@de100/files-server/worker";

import type { ProtoCookFilesWorkerRunOnceResult } from "./runner";

export const protoCookFilesWorkerOrpcNamespaceValues = [
	"internal",
	"admin-lab",
	"public-lab",
] as const;
export type ProtoCookFilesWorkerOrpcNamespace =
	(typeof protoCookFilesWorkerOrpcNamespaceValues)[number];

export const protoCookFilesWorkerOrpcProcedureValues = ["enqueue", "getStatus", "runOnce"] as const;
export type ProtoCookFilesWorkerOrpcProcedure =
	(typeof protoCookFilesWorkerOrpcProcedureValues)[number];

export const protoCookFilesWorkerProductionOrpcNamespace = "internal" as const;

export type ProtoCookFilesWorkerOrpcPrototypeStatus = {
	namespace: ProtoCookFilesWorkerOrpcNamespace;
	productionRecommendedNamespace: typeof protoCookFilesWorkerProductionOrpcNamespace;
	queueDriver: "db" | "redis";
	running: boolean;
};

export type ProtoCookFilesWorkerOrpcPrototype = {
	enqueue(job: FilesWorkerJobPayload): Promise<{ accepted: boolean }>;
	getStatus(): Promise<ProtoCookFilesWorkerOrpcPrototypeStatus>;
	runOnce(): Promise<ProtoCookFilesWorkerRunOnceResult>;
};

export type CreateProtoCookFilesWorkerOrpcPrototypeInput = {
	enqueueQueue?: FilesQueueAdapter;
	getStatus(): Promise<
		Omit<ProtoCookFilesWorkerOrpcPrototypeStatus, "namespace" | "productionRecommendedNamespace">
	>;
	namespace: ProtoCookFilesWorkerOrpcNamespace;
	runOnce(): Promise<ProtoCookFilesWorkerRunOnceResult>;
};

const namespaceProcedurePolicy = {
	"admin-lab": new Set<ProtoCookFilesWorkerOrpcProcedure>(["getStatus", "runOnce"]),
	internal: new Set<ProtoCookFilesWorkerOrpcProcedure>(["enqueue", "getStatus", "runOnce"]),
	"public-lab": new Set<ProtoCookFilesWorkerOrpcProcedure>(["getStatus"]),
} satisfies Record<ProtoCookFilesWorkerOrpcNamespace, Set<ProtoCookFilesWorkerOrpcProcedure>>;

export function canExposeProtoCookFilesWorkerOrpcProcedure(input: {
	namespace: ProtoCookFilesWorkerOrpcNamespace;
	procedure: ProtoCookFilesWorkerOrpcProcedure;
}) {
	return namespaceProcedurePolicy[input.namespace].has(input.procedure);
}

export function createProtoCookFilesWorkerOrpcPrototype(
	input: CreateProtoCookFilesWorkerOrpcPrototypeInput,
): ProtoCookFilesWorkerOrpcPrototype {
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
				productionRecommendedNamespace: protoCookFilesWorkerProductionOrpcNamespace,
			};
		},
		async runOnce() {
			assertProcedureAllowed(input.namespace, "runOnce");
			return input.runOnce();
		},
	};
}

function assertProcedureAllowed(
	namespace: ProtoCookFilesWorkerOrpcNamespace,
	procedure: ProtoCookFilesWorkerOrpcProcedure,
) {
	if (!canExposeProtoCookFilesWorkerOrpcProcedure({ namespace, procedure })) {
		throw new Error(`Worker oRPC procedure ${procedure} is not exposed in ${namespace}.`);
	}
}
