import { z } from "zod/v4";

export const filesHlsAes128KeyUriScheme = "de100-hls-key" as const;

export const filesHlsAes128KeyReferenceSchema = z.object({
	algorithm: z.literal("AES-128"),
	ivHex: z.string().regex(/^[0-9a-f]{32}$/iu),
	keyId: z.string().min(1),
	keyUri: z.string().min(1),
});
export type FilesHlsAes128KeyReference = z.infer<typeof filesHlsAes128KeyReferenceSchema>;

export const filesDrmPrototypeKindValues = [
	"self-owned-r2-shaka",
	"cloudflare-stream-managed",
] as const;
export type FilesDrmPrototypeKind = (typeof filesDrmPrototypeKindValues)[number];

export const filesDrmPrototypeDescriptorSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("self-owned-r2-shaka"),
		licenseServerUrl: z.string().url().nullable(),
		manifestUrl: z.string().min(1).nullable(),
		protectionSystems: z.array(z.enum(["fairplay", "playready", "widevine"])).default([]),
		status: z.enum(["disabled", "prototype"]),
	}),
	z.object({
		kind: z.literal("cloudflare-stream-managed"),
		playbackId: z.string().min(1).nullable(),
		signedTokenUrl: z.string().min(1).nullable(),
		status: z.enum(["disabled", "prototype"]),
	}),
]);
export type FilesDrmPrototypeDescriptor = z.infer<typeof filesDrmPrototypeDescriptorSchema>;

export function createFilesHlsAes128KeyUri(keyId: string) {
	const normalizedKeyId = keyId.trim();
	if (!normalizedKeyId || normalizedKeyId.includes("/") || normalizedKeyId.includes("..")) {
		throw new Error("HLS AES-128 key id must be a single safe path segment.");
	}

	return `${filesHlsAes128KeyUriScheme}://${encodeURIComponent(normalizedKeyId)}`;
}

export function parseFilesHlsAes128KeyUri(uri: string) {
	const prefix = `${filesHlsAes128KeyUriScheme}://`;
	if (!uri.startsWith(prefix)) {
		return null;
	}

	const encodedKeyId = uri.slice(prefix.length);
	if (!encodedKeyId) {
		return null;
	}

	try {
		const keyId = decodeURIComponent(encodedKeyId);
		return keyId && !keyId.includes("/") && !keyId.includes("..") ? keyId : null;
	} catch {
		return null;
	}
}

export function normalizeFilesAes128Hex(input: string, expectedByteLength: 16) {
	const normalized = input.trim().toLowerCase();
	if (!new RegExp(`^[0-9a-f]{${expectedByteLength * 2}}$`, "u").test(normalized)) {
		throw new Error(`AES value must be ${expectedByteLength} bytes encoded as hexadecimal.`);
	}

	return normalized;
}
