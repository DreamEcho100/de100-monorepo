import { describe, expect, it } from "vitest";

import {
	createFilesLabGeneratedFiles,
	createFilesLabOrpcDirectDecision,
	createFilesLabTargetDecision,
	resolveHttpFilesLabProtocol,
} from "./files-lab-policy";

describe("files lab policy", () => {
	it("routes HTTP stress resumable uploads through Tus and normal uploads through XHR", () => {
		expect(resolveHttpFilesLabProtocol({ requiresResumable: true, track: "stress" })).toBe("tus");
		expect(resolveHttpFilesLabProtocol({ requiresResumable: false, track: "stress" })).toBe("xhr");
		expect(resolveHttpFilesLabProtocol({ requiresResumable: true, track: "practical" })).toBe(
			"xhr",
		);
	});

	it("routes S3-compatible labs through provider-native protocols", () => {
		expect(
			resolveHttpFilesLabProtocol({
				storageBackend: "minio-s3",
				track: "practical",
			}),
		).toBe("s3-put");
		expect(
			resolveHttpFilesLabProtocol({
				storageBackend: "r2-s3",
				track: "stress",
			}),
		).toBe("s3-multipart");
	});

	it("creates target-mode decisions for non-RPC binary approaches", () => {
		expect(createFilesLabTargetDecision("xhr")).toMatchObject({
			approach: "hybrid",
			mode: "upload-target",
			protocol: "xhr",
			reason: "direct-disabled",
			storageBackend: "local-fs",
		});
	});

	it("keeps orpc-direct as a Hybrid capability instead of a top-level approach", () => {
		expect(createFilesLabOrpcDirectDecision()).toMatchObject({
			approach: "hybrid",
			mode: "orpc-direct",
			protocol: "orpc-direct",
		});
	});

	it("generates image, document, audio, video, and generic fixtures", () => {
		const files = createFilesLabGeneratedFiles();

		expect(files.map((file) => file.type)).toEqual([
			"image/svg+xml",
			"text/plain",
			"audio/mpeg",
			"video/mp4",
			"application/json",
		]);
	});
});
