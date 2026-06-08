import type { FilesDrmPrototypeDescriptor, FilesDrmPrototypeKind } from "@de100/files-shared";

export type CreateFilesSelfOwnedR2ShakaDrmPrototypeInput = {
	enabled: boolean;
	licenseServerUrl?: string | null;
	manifestUrl?: string | null;
	protectionSystems?: Array<"fairplay" | "playready" | "widevine">;
};

export type CreateFilesCloudflareStreamDrmPrototypeInput = {
	enabled: boolean;
	playbackId?: string | null;
	signedTokenUrl?: string | null;
};

export function createFilesSelfOwnedR2ShakaDrmPrototype(
	input: CreateFilesSelfOwnedR2ShakaDrmPrototypeInput,
): FilesDrmPrototypeDescriptor {
	return {
		kind: "self-owned-r2-shaka",
		licenseServerUrl: input.licenseServerUrl ?? null,
		manifestUrl: input.manifestUrl ?? null,
		protectionSystems: input.protectionSystems ?? [],
		status: input.enabled ? "prototype" : "disabled",
	};
}

export function createFilesCloudflareStreamDrmPrototype(
	input: CreateFilesCloudflareStreamDrmPrototypeInput,
): FilesDrmPrototypeDescriptor {
	return {
		kind: "cloudflare-stream-managed",
		playbackId: input.playbackId ?? null,
		signedTokenUrl: input.signedTokenUrl ?? null,
		status: input.enabled ? "prototype" : "disabled",
	};
}

export function createDisabledFilesDrmPrototype(
	kind: FilesDrmPrototypeKind,
): FilesDrmPrototypeDescriptor {
	switch (kind) {
		case "self-owned-r2-shaka":
			return createFilesSelfOwnedR2ShakaDrmPrototype({ enabled: false });
		case "cloudflare-stream-managed":
			return createFilesCloudflareStreamDrmPrototype({ enabled: false });
		default: {
			const exhaustive: never = kind;
			throw new Error(`Unsupported DRM prototype kind: ${exhaustive}`);
		}
	}
}

export function summarizeFilesDrmPrototypeTradeoff(input: FilesDrmPrototypeDescriptor) {
	switch (input.kind) {
		case "self-owned-r2-shaka":
			return {
				operationalComplexity: "high",
				providerLockIn: "low",
				recommendation: "prototype-only",
			} as const;
		case "cloudflare-stream-managed":
			return {
				operationalComplexity: "medium",
				providerLockIn: "high",
				recommendation: "prototype-only",
			} as const;
		default: {
			const exhaustive: never = input;
			throw new Error(`Unsupported DRM prototype descriptor: ${exhaustive}`);
		}
	}
}
