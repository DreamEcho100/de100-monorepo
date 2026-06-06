import { env } from "@de100/apps-lms-env/server";
import {
	issueFilesSignedAccessToken,
	verifyFilesSignedAccessToken,
} from "@de100/files-server/signed-access";

export async function issueSignedFilesAccessToken(options: {
	expiresInSeconds?: number;
	fileId: string;
	userId: string | null;
}) {
	return issueFilesSignedAccessToken({
		expiresInSeconds: options.expiresInSeconds ?? env.APP_LMS_FILES_SIGNED_URL_TTL_SECONDS,
		fileId: options.fileId,
		secret: getFilesSigningSecret(),
		userId: options.userId,
	});
}

export async function verifySignedFilesAccessToken(token: string) {
	return verifyFilesSignedAccessToken({
		secret: getFilesSigningSecret(),
		token,
	});
}

export function createSignedFilesAccessUrl(request: Request, token: string) {
	return new URL(`/api/files/signed/${token}`, request.url).toString();
}

function getFilesSigningSecret() {
	return env.APP_LMS_FILES_SIGNING_SECRET ?? env.APP_LMS_BETTER_AUTH_SECRET;
}
