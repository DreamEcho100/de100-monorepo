import { createLmsFilesRepositories } from "@de100/apps-lms-api/files-repositories";
import { getFilesStorageProvider } from "@de100/apps-lms-api/files-storage";
import { db } from "@de100/apps-lms-db";
import { isSignedHlsPlaybackSessionUsable } from "@de100/files-server/hls-playback";
import { findFilesHlsPlaybackArtifact } from "@de100/files-server/hls-playback-source";
import {
	findFilesHlsAes128KeyArtifact,
	isFilesHlsManifestArtifact,
	readFilesHlsAes128KeyRequestPath,
	rewriteFilesHlsAes128ManifestKeyUris,
} from "@de100/files-server/hls-protection";
import type { FileObject } from "@de100/files-server/storage";
import type { APIEvent } from "@solidjs/start/server";

import { createCorsPreflightResponse, withCorsAndLogging } from "~/libs/apis/cors";
import { createFilesObjectResponse } from "~/libs/server/files-object-response";

async function handler(event: APIEvent) {
	try {
		const token = event.params.token;
		const path = event.params.path;
		if (!token || !path) {
			return withCorsAndLogging(
				new Response("Missing playback token or path", { status: 400 }),
				event.request,
			);
		}

		const repositories = createLmsFilesRepositories(db);
		const session = await repositories.artifacts?.playbackSessions?.getSessionByToken(token);
		if (!session || !isSignedHlsPlaybackSessionUsable(session)) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		const artifactGroup = await repositories.artifacts?.groups.getGroup(session.artifactGroupId);
		if (!artifactGroup || artifactGroup.status !== "ready" || artifactGroup.deletedAt !== null) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		const artifacts = await repositories.artifacts?.items.listArtifacts(artifactGroup.id);
		const keyId = readFilesHlsAes128KeyRequestPath(path);
		if (keyId) {
			const keyArtifact = findFilesHlsAes128KeyArtifact({
				artifacts: artifacts ?? [],
				keyId,
			});
			if (!keyArtifact || session.protectionMode !== "aes-128") {
				return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
			}

			const provider = getFilesStorageProvider(event);
			const object = await provider.getObject({
				key: keyArtifact.key,
				visibility: artifactGroup.visibility,
			});
			if (!object) {
				return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
			}

			return withCorsAndLogging(
				await createFilesObjectResponse(
					event.request,
					{
						...(object as FileObject),
						httpMetadata: {
							...(object as FileObject).httpMetadata,
							cacheControl: "private, no-store, max-age=0",
							contentType: "application/octet-stream",
						},
						size: keyArtifact.size,
					},
					artifactGroup.visibility,
				),
				event.request,
			);
		}

		const artifact = findFilesHlsPlaybackArtifact({
			artifactGroup,
			artifacts: artifacts ?? [],
			path,
		});
		if (!artifact) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}
		if (artifact.kind === "hls-key") {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		const provider = getFilesStorageProvider(event);
		const object = await provider.getObject({
			key: artifact.key,
			visibility: artifactGroup.visibility,
		});
		if (!object) {
			return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
		}

		if (isFilesHlsManifestArtifact(artifact)) {
			const body = await readTextBody(object as FileObject);
			if (body === null) {
				return withCorsAndLogging(new Response("Not Found", { status: 404 }), event.request);
			}
			const rewrittenBody = rewriteFilesHlsAes128ManifestKeyUris({
				manifest: body,
				token,
			});

			return withCorsAndLogging(
				await createFilesObjectResponse(
					event.request,
					{
						...(object as FileObject),
						body: rewrittenBody,
						httpMetadata: {
							...(object as FileObject).httpMetadata,
							contentType: artifact.contentType,
						},
						size: new TextEncoder().encode(rewrittenBody).byteLength,
					},
					artifactGroup.visibility,
				),
				event.request,
			);
		}

		return withCorsAndLogging(
			await createFilesObjectResponse(
				event.request,
				{
					...(object as FileObject),
					httpMetadata: {
						...(object as FileObject).httpMetadata,
						contentType: artifact.contentType,
					},
					size: artifact.size,
				},
				artifactGroup.visibility,
			),
			event.request,
		);
	} catch (error) {
		console.error(error);
		return withCorsAndLogging(
			new Response("Failed to read HLS artifact", { status: 500 }),
			event.request,
		);
	}
}

export const GET = handler;
export const OPTIONS = (event: APIEvent) => createCorsPreflightResponse(event.request);

async function readTextBody(object: FileObject) {
	if (object.body === null) {
		return null;
	}

	return await new Response(object.body).text();
}
