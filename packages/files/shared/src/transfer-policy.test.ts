import { describe, expect, it } from "vitest";

import {
	defaultDirectOrpcUploadMaxBytes,
	inferFileKindFromContentType,
	selectFilesUploadMode,
} from "./transfer-policy";

describe("files transfer policy", () => {
	it("uses direct oRPC for non-resumable files within the direct limit", () => {
		expect(
			selectFilesUploadMode({
				contentType: "image/png",
				fileSize: defaultDirectOrpcUploadMaxBytes,
			}),
		).toEqual({
			approach: "hybrid",
			deliveryStrategy: "orpc-blob",
			integrations: [],
			mode: "orpc-direct",
			processingMode: "none",
			protocol: "orpc-direct",
			reason: "direct-supported",
			storageBackend: "local-fs",
		});
	});

	it("routes local large video and audio to resumable or server targets", () => {
		expect(
			selectFilesUploadMode({
				contentType: "video/mp4",
				fileSize: defaultDirectOrpcUploadMaxBytes + 1,
			}),
		).toMatchObject({
			mode: "upload-target",
			reason: "size-exceeds-direct-limit",
			protocol: "tus",
		});

		expect(
			selectFilesUploadMode({
				contentType: "audio/mpeg",
				fileSize: defaultDirectOrpcUploadMaxBytes + 1,
				routeProtocols: ["s3-multipart", "xhr"],
			}),
		).toMatchObject({
			protocol: "s3-multipart",
		});
	});

	it("uses single-part and multipart protocols for S3-compatible storage", () => {
		expect(
			selectFilesUploadMode({
				contentType: "image/png",
				fileSize: 1024,
				storageBackend: "r2-s3",
			}),
		).toMatchObject({
			deliveryStrategy: "provider-url",
			protocol: "s3-put",
			reason: "s3-compatible-single-part",
		});

		expect(
			selectFilesUploadMode({
				contentType: "video/mp4",
				fileSize: 200 * 1024 * 1024,
				storageBackend: "minio-s3",
			}),
		).toMatchObject({
			protocol: "s3-multipart",
			reason: "s3-compatible-multipart",
		});
	});

	it("routes explicitly resumable uploads to upload targets", () => {
		expect(
			selectFilesUploadMode({
				contentType: "application/pdf",
				fileSize: 1024,
				requiresResumable: true,
				routeProtocols: ["s3-put", "xhr"],
			}),
		).toMatchObject({
			mode: "upload-target",
			reason: "resumable-required",
			protocol: "s3-put",
		});
	});

	it("honors disabled direct oRPC transfer", () => {
		expect(
			selectFilesUploadMode({
				allowDirectOrpc: false,
				fileSize: 1024,
				routeProtocols: ["xhr"],
			}),
		).toMatchObject({
			mode: "upload-target",
			reason: "direct-disabled",
			protocol: "xhr",
		});
	});

	it("treats Transloadit as an integration-driven processing path", () => {
		expect(
			selectFilesUploadMode({
				enabledIntegrations: ["transloadit"],
				fileSize: 1024,
				processingMode: "transloadit-assembly",
			}),
		).toMatchObject({
			integrations: ["transloadit"],
			processingMode: "transloadit-assembly",
			protocol: "custom",
			reason: "processing-integration-required",
		});
	});

	it("infers common media kinds from content type", () => {
		expect(inferFileKindFromContentType("video/webm")).toBe("video");
		expect(inferFileKindFromContentType("audio/wav")).toBe("audio");
		expect(inferFileKindFromContentType("application/pdf")).toBe("document");
		expect(inferFileKindFromContentType("application/octet-stream")).toBe("file");
	});
});
