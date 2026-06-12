import type {
	FilesApiApproach,
	FilesStorageBackend,
	FilesUploadModeDecision,
	FilesUploadProtocol,
	FilesUploadTargetProtocol,
} from "@de100/files-shared";

export type FilesLabApproach = FilesApiApproach;
export type FilesLabTrack = "strict" | "practical" | "stress";

export const filesLabApproaches = ["hybrid", "http-native"] as const satisfies FilesLabApproach[];
export const filesLabTracks = ["strict", "practical", "stress"] as const satisfies FilesLabTrack[];
export const filesLabStorageBackends = [
	"local-fs",
	"minio-s3",
	"r2-s3",
] as const satisfies FilesStorageBackend[];
export const filesLabProtocolOptions = [
	"auto",
	"orpc-direct",
	"xhr",
	"tus",
	"s3-put",
	"s3-multipart",
	"custom",
] as const;

export type FilesLabProtocolOption = (typeof filesLabProtocolOptions)[number];

export function createFilesLabTargetDecision(
	protocol: FilesUploadTargetProtocol,
	approach: FilesLabApproach = "hybrid",
	storageBackend: FilesStorageBackend = "local-fs",
): FilesUploadModeDecision {
	return {
		approach,
		deliveryStrategy:
			protocol === "s3-put" || protocol === "s3-multipart"
				? "provider-url"
				: storageBackend === "local-fs"
					? "range-http"
					: "signed-url",
		integrations: [],
		mode: "upload-target",
		processingMode: "none",
		protocol,
		reason: "direct-disabled",
		storageBackend,
	};
}

export function resolveHttpFilesLabProtocol(options: {
	requiresResumable?: boolean;
	storageBackend?: FilesStorageBackend;
	track: FilesLabTrack;
}) {
	if (options.storageBackend === "minio-s3" || options.storageBackend === "r2-s3") {
		return options.track === "stress" || options.requiresResumable ? "s3-multipart" : "s3-put";
	}

	return options.track === "stress" && options.requiresResumable ? "tus" : "xhr";
}

export function createFilesLabForcedProtocolDecision(options: {
	approach: FilesLabApproach;
	protocol: Exclude<FilesUploadProtocol, "orpc-direct">;
	storageBackend: FilesStorageBackend;
}): FilesUploadModeDecision {
	return createFilesLabTargetDecision(options.protocol, options.approach, options.storageBackend);
}

export function createFilesLabOrpcDirectDecision(
	storageBackend: FilesStorageBackend = "local-fs",
): FilesUploadModeDecision {
	return {
		approach: "hybrid",
		deliveryStrategy: "orpc-blob",
		integrations: [],
		mode: "orpc-direct",
		processingMode: "none",
		protocol: "orpc-direct",
		reason: "direct-supported",
		storageBackend,
	};
}

export function createFilesLabGeneratedFiles() {
	return [
		new File([createSvgFixture()], "fixture-image.svg", { type: "image/svg+xml" }),
		new File(["file lab document fixture"], "fixture-document.txt", { type: "text/plain" }),
		new File([new Uint8Array([0, 1, 2, 3, 4, 5])], "fixture-audio.bin", {
			type: "audio/mpeg",
		}),
		new File([new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112])], "fixture-video.bin", {
			type: "video/mp4",
		}),
		new File([JSON.stringify({ fixture: true })], "fixture-generic.json", {
			type: "application/json",
		}),
	];
}

function createSvgFixture() {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
	<rect width="320" height="180" fill="#f8fafc"/>
	<circle cx="84" cy="88" r="44" fill="#14b8a6"/>
	<rect x="148" y="54" width="112" height="72" rx="10" fill="#334155"/>
	<text x="24" y="158" fill="#0f172a" font-family="Arial, sans-serif" font-size="18">Files lab fixture</text>
</svg>`;
}
