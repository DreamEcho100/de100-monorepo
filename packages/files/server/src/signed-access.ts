import { FilesError, filesErrorCodes } from "@de100/files-shared";

const encoder = new TextEncoder();

export type FilesSignedAccessPayload = {
	expiresAt: number;
	fileId: string;
	purpose: "files-access";
	userId: string | null;
};

export async function issueFilesSignedAccessToken(input: {
	expiresInSeconds: number;
	fileId: string;
	secret: string;
	userId: string | null;
}) {
	if (input.secret.length < 32) {
		throw new FilesError(filesErrorCodes.signedAccessInvalid, "Signed access secret is too short.");
	}

	const payload: FilesSignedAccessPayload = {
		expiresAt: Date.now() + input.expiresInSeconds * 1000,
		fileId: input.fileId,
		purpose: "files-access",
		userId: input.userId,
	};
	const encodedPayload = encodeBase64Url(JSON.stringify(payload));
	const signature = await signValue(encodedPayload, input.secret);

	return {
		expiresAt: new Date(payload.expiresAt),
		token: `${encodedPayload}.${signature}`,
	};
}

export async function verifyFilesSignedAccessToken(input: { secret: string; token: string }) {
	const [encodedPayload, signature] = input.token.split(".");
	if (!encodedPayload || !signature) {
		return null;
	}

	const key = await importSigningKey(input.secret);
	const valid = await crypto.subtle.verify(
		"HMAC",
		key,
		decodeBase64Url(signature),
		encoder.encode(encodedPayload),
	);

	if (!valid) {
		return null;
	}

	const payload = JSON.parse(
		new TextDecoder().decode(decodeBase64Url(encodedPayload)),
	) as FilesSignedAccessPayload;

	if (payload.purpose !== "files-access" || payload.expiresAt <= Date.now()) {
		return null;
	}

	return payload;
}

async function signValue(value: string, secret: string) {
	const key = await importSigningKey(secret);
	const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
	return encodeBase64Url(new Uint8Array(signature));
}

async function importSigningKey(secret: string) {
	return crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ hash: "SHA-256", name: "HMAC" },
		false,
		["sign", "verify"],
	);
}

function encodeBase64Url(value: string | Uint8Array) {
	const bytes = typeof value === "string" ? encoder.encode(value) : value;
	return btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
	const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
	const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
	const binary = atob(`${normalized}${padding}`);
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
