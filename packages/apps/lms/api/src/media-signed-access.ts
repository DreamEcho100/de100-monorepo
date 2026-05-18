import { env } from "@de100/apps-lms-env/server";

const encoder = new TextEncoder();

type MediaSignedAccessPayload = {
	expiresAt: number;
	mediaId: string;
	purpose: "media-access";
	userId: string;
};

function encodeBase64Url(value: string | Uint8Array) {
	const bytes = typeof value === "string" ? encoder.encode(value) : value;
	let binary = "";

	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
	const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
	const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
	const binary = atob(`${normalized}${padding}`);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes;
}

async function importSigningKey() {
	const secret = env.APP_LMS_MEDIA_SIGNING_SECRET ?? env.APP_LMS_BETTER_AUTH_SECRET;
	if (!secret) {
		throw new Error("Missing media signing secret.");
	}

	return crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ hash: "SHA-256", name: "HMAC" },
		false,
		["sign", "verify"],
	);
}

async function signValue(value: string) {
	const key = await importSigningKey();
	const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));

	return encodeBase64Url(new Uint8Array(signature));
}

export async function issueSignedMediaAccessToken(options: {
	expiresInSeconds?: number;
	mediaId: string;
	userId: string;
}) {
	const expiresInSeconds = options.expiresInSeconds ?? env.APP_LMS_MEDIA_SIGNED_URL_TTL_SECONDS;
	const payload: MediaSignedAccessPayload = {
		expiresAt: Date.now() + expiresInSeconds * 1000,
		mediaId: options.mediaId,
		purpose: "media-access",
		userId: options.userId,
	};
	const payloadText = JSON.stringify(payload);
	const encodedPayload = encodeBase64Url(payloadText);
	const signature = await signValue(encodedPayload);

	return {
		expiresAt: new Date(payload.expiresAt),
		token: `${encodedPayload}.${signature}`,
	};
}

export async function verifySignedMediaAccessToken(token: string) {
	const [encodedPayload, signature] = token.split(".");
	if (!encodedPayload || !signature) {
		return null;
	}

	const key = await importSigningKey();
	const isValid = await crypto.subtle.verify(
		"HMAC",
		key,
		decodeBase64Url(signature),
		encoder.encode(encodedPayload),
	);

	if (!isValid) {
		return null;
	}

	const payloadText = new TextDecoder().decode(decodeBase64Url(encodedPayload));
	const payload = JSON.parse(payloadText) as MediaSignedAccessPayload;

	if (payload.purpose !== "media-access" || payload.expiresAt <= Date.now()) {
		return null;
	}

	return payload;
}

export function createSignedMediaAccessUrl(request: Request, token: string) {
	return new URL(`/api/media/signed/${token}`, request.url).toString();
}
