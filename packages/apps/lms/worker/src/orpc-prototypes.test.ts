import { describe, expect, it } from "vitest";

import {
	canExposeLmsFilesWorkerOrpcProcedure,
	createLmsFilesWorkerOrpcPrototype,
	lmsFilesWorkerProductionOrpcNamespace,
} from "./orpc-prototypes";

describe("LMS files worker oRPC prototypes", () => {
	it("keeps the production recommendation internal-only", () => {
		expect(lmsFilesWorkerProductionOrpcNamespace).toBe("internal");
		expect(
			canExposeLmsFilesWorkerOrpcProcedure({
				namespace: "internal",
				procedure: "enqueue",
			}),
		).toBe(true);
		expect(
			canExposeLmsFilesWorkerOrpcProcedure({
				namespace: "admin-lab",
				procedure: "enqueue",
			}),
		).toBe(false);
		expect(
			canExposeLmsFilesWorkerOrpcProcedure({
				namespace: "public-lab",
				procedure: "runOnce",
			}),
		).toBe(false);
	});

	it("allows status in every prototype namespace", async () => {
		const prototype = createLmsFilesWorkerOrpcPrototype({
			async getStatus() {
				return {
					queueDriver: "db",
					running: false,
				};
			},
			namespace: "public-lab",
			async runOnce() {
				return { status: "idle" };
			},
		});

		await expect(prototype.getStatus()).resolves.toEqual({
			namespace: "public-lab",
			productionRecommendedNamespace: "internal",
			queueDriver: "db",
			running: false,
		});
	});

	it("blocks public lab run controls", async () => {
		const prototype = createLmsFilesWorkerOrpcPrototype({
			async getStatus() {
				return {
					queueDriver: "db",
					running: false,
				};
			},
			namespace: "public-lab",
			async runOnce() {
				return { status: "idle" };
			},
		});

		await expect(prototype.runOnce()).rejects.toThrow("not exposed");
	});
});
