import { describe, expect, it } from "vitest";

import {
	createFilesArtifactPromotedPrefix,
	createFilesArtifactStagingPrefix,
	normalizeFilesWorkerConcurrency,
} from "./worker";

describe("files worker helpers", () => {
	it("creates deterministic staging and promoted artifact prefixes", () => {
		expect(
			createFilesArtifactStagingPrefix({
				attempt: 2,
				fileId: "file_1",
				groupId: "group_1",
				jobId: "job_1",
			}),
		).toBe("files/file_1/staging/job_1/attempt-2/group_1");
		expect(
			createFilesArtifactPromotedPrefix({
				fileId: "file_1",
				groupId: "group_1",
				revision: 3,
			}),
		).toBe("files/file_1/artifacts/group_1/rev-3");
	});

	it("defaults worker concurrency to one for local safety", () => {
		expect(normalizeFilesWorkerConcurrency(undefined)).toBe(1);
		expect(normalizeFilesWorkerConcurrency(0)).toBe(1);
		expect(normalizeFilesWorkerConcurrency(2.9)).toBe(2);
	});
});
