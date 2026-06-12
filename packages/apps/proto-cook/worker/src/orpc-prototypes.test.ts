import { describe, expect, it } from "vitest";

import {
	canExposeProtoCookFilesWorkerOrpcProcedure,
	createProtoCookFilesWorkerOrpcPrototype,
	protoCookFilesWorkerProductionOrpcNamespace,
} from "./orpc-prototypes";

describe("Proto Cook files worker oRPC prototypes", () => {
	it("keeps the production recommendation internal-only", () => {
		expect(protoCookFilesWorkerProductionOrpcNamespace).toBe("internal");
		expect(
			canExposeProtoCookFilesWorkerOrpcProcedure({
				namespace: "internal",
				procedure: "enqueue",
			}),
		).toBe(true);
		expect(
			canExposeProtoCookFilesWorkerOrpcProcedure({
				namespace: "admin-lab",
				procedure: "enqueue",
			}),
		).toBe(false);
		expect(
			canExposeProtoCookFilesWorkerOrpcProcedure({
				namespace: "public-lab",
				procedure: "runOnce",
			}),
		).toBe(false);
	});

	it("allows status in every prototype namespace", async () => {
		const prototype = createProtoCookFilesWorkerOrpcPrototype({
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
		const prototype = createProtoCookFilesWorkerOrpcPrototype({
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
