import { describe, expect, it } from "vitest";

import { applyUploaderEvent, canApplyUploaderEvent, createUploaderItemState } from "./events";

describe("uploader event state transitions", () => {
	it("follows the happy-path lifecycle", () => {
		const queued = applyUploaderEvent(createUploaderItemState("file-1"), {
			fileId: "file-1",
			totalBytes: 100,
			type: "file-added",
		});
		expect(queued.status).toBe("queued");

		const uploading = applyUploaderEvent(queued, {
			fileId: "file-1",
			type: "upload-started",
		});
		expect(uploading.status).toBe("uploading");
		expect(uploading.attempts).toBe(1);

		const progressed = applyUploaderEvent(uploading, {
			bytesUploaded: 55,
			fileId: "file-1",
			type: "upload-progress",
		});
		expect(progressed.bytesUploaded).toBe(55);

		const succeeded = applyUploaderEvent(progressed, {
			fileId: "file-1",
			type: "upload-succeeded",
		});
		expect(succeeded.status).toBe("succeeded");
		expect(succeeded.bytesUploaded).toBe(100);

		const completedAt = new Date("2026-06-01T00:00:00.000Z");
		const completed = applyUploaderEvent(succeeded, {
			completedAt,
			fileId: "file-1",
			type: "upload-complete",
		});
		expect(completed.completedAt).toEqual(completedAt);
	});

	it("handles retry after recoverable failure", () => {
		const failed = applyUploaderEvent(
			applyUploaderEvent(
				applyUploaderEvent(createUploaderItemState("file-2"), {
					fileId: "file-2",
					totalBytes: 100,
					type: "file-added",
				}),
				{
					fileId: "file-2",
					type: "upload-started",
				},
			),
			{
				errorMessage: "timeout",
				fileId: "file-2",
				recoverable: true,
				type: "upload-failed",
			},
		);

		expect(failed.status).toBe("failed");
		expect(failed.isRecoverableFailure).toBe(true);

		const retried = applyUploaderEvent(failed, {
			fileId: "file-2",
			type: "retry-requested",
		});

		expect(retried.status).toBe("queued");
		expect(retried.retries).toBe(1);
		expect(retried.errorMessage).toBeNull();
	});

	it("rejects invalid transitions and mismatched file IDs", () => {
		const idle = createUploaderItemState("file-3");

		expect(canApplyUploaderEvent(idle.status, "upload-progress")).toBe(false);

		const unchangedForInvalidTransition = applyUploaderEvent(idle, {
			bytesUploaded: 30,
			fileId: "file-3",
			type: "upload-progress",
		});
		expect(unchangedForInvalidTransition).toEqual(idle);

		const unchangedForWrongFile = applyUploaderEvent(idle, {
			fileId: "other-file",
			totalBytes: 100,
			type: "file-added",
		});
		expect(unchangedForWrongFile).toEqual(idle);
	});

	it("clamps progress updates to valid bounds", () => {
		const uploading = applyUploaderEvent(
			applyUploaderEvent(createUploaderItemState("file-4"), {
				fileId: "file-4",
				totalBytes: 100,
				type: "file-added",
			}),
			{
				fileId: "file-4",
				type: "upload-started",
			},
		);

		const belowZero = applyUploaderEvent(uploading, {
			bytesUploaded: -20,
			fileId: "file-4",
			type: "upload-progress",
		});
		expect(belowZero.bytesUploaded).toBe(0);

		const aboveTotal = applyUploaderEvent(uploading, {
			bytesUploaded: 10_000,
			fileId: "file-4",
			type: "upload-progress",
		});
		expect(aboveTotal.bytesUploaded).toBe(100);
	});
});
