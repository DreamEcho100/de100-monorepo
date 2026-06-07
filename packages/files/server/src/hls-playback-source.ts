import type {
	FilesArtifactGroupRecord,
	FilesArtifactRecord,
	FilesSignedHlsPlaybackSession,
} from "@de100/files-shared";

export type FilesHlsCaptionTrack = {
	default: boolean;
	kind: "captions" | "chapters" | "descriptions" | "metadata" | "subtitles";
	label: string;
	language: string;
	src: string;
};

export type FilesHlsPlaybackSource = {
	captionTracks: FilesHlsCaptionTrack[];
	masterArtifactId: string;
	masterUrl: string;
	sessionId: string;
	token: string;
};

export type CreateFilesHlsPlaybackSourceInput = {
	artifactGroup: FilesArtifactGroupRecord;
	artifacts: readonly FilesArtifactRecord[];
	basePath?: string;
	session: Pick<FilesSignedHlsPlaybackSession, "id" | "token">;
};

export type FindFilesHlsPlaybackArtifactInput = {
	artifactGroup: Pick<FilesArtifactGroupRecord, "storagePrefix">;
	artifacts: readonly FilesArtifactRecord[];
	path: string;
};

const defaultHlsPlaybackBasePath = "/api/files/playback/hls";

export function createFilesHlsPlaybackSource(input: CreateFilesHlsPlaybackSourceInput) {
	const masterArtifact = selectReadyHlsPlaybackArtifacts(input.artifacts).find(
		(artifact) => artifact.kind === "hls-master-manifest",
	);
	if (!masterArtifact) {
		return null;
	}

	const basePath = normalizePlaybackBasePath(input.basePath ?? defaultHlsPlaybackBasePath);

	return {
		captionTracks: createCaptionTracks({
			artifactGroup: input.artifactGroup,
			artifacts: input.artifacts,
			basePath,
			token: input.session.token,
		}),
		masterArtifactId: masterArtifact.id,
		masterUrl: createPlaybackArtifactUrl({
			artifact: masterArtifact,
			artifactGroup: input.artifactGroup,
			basePath,
			token: input.session.token,
		}),
		sessionId: input.session.id,
		token: input.session.token,
	} satisfies FilesHlsPlaybackSource;
}

export function findFilesHlsPlaybackArtifact(input: FindFilesHlsPlaybackArtifactInput) {
	const requestedPath = normalizePlaybackRequestPath(input.path);
	if (!requestedPath) {
		return null;
	}

	return (
		selectReadyHlsPlaybackArtifacts(input.artifacts).find(
			(artifact) => createArtifactRelativePath(input.artifactGroup, artifact) === requestedPath,
		) ?? null
	);
}

export function createArtifactRelativePath(
	artifactGroup: Pick<FilesArtifactGroupRecord, "storagePrefix">,
	artifact: Pick<FilesArtifactRecord, "key">,
) {
	const normalizedPrefix = stripSlashes(artifactGroup.storagePrefix);
	const normalizedKey = stripSlashes(artifact.key);
	const prefixWithSlash = `${normalizedPrefix}/`;

	return normalizedKey.startsWith(prefixWithSlash)
		? normalizedKey.slice(prefixWithSlash.length)
		: normalizedKey;
}

function createCaptionTracks(input: {
	artifactGroup: FilesArtifactGroupRecord;
	artifacts: readonly FilesArtifactRecord[];
	basePath: string;
	token: string;
}) {
	return selectReadyHlsPlaybackArtifacts(input.artifacts)
		.filter((artifact) => artifact.kind === "caption")
		.map((artifact) => {
			const metadata = readCaptionMetadata(artifact.metadata);

			return {
				default: metadata.default,
				kind: metadata.kind,
				label: metadata.label ?? artifact.renditionLabel ?? "Captions",
				language: metadata.language ?? "und",
				src: createPlaybackArtifactUrl({
					artifact,
					artifactGroup: input.artifactGroup,
					basePath: input.basePath,
					token: input.token,
				}),
			} satisfies FilesHlsCaptionTrack;
		});
}

function createPlaybackArtifactUrl(input: {
	artifact: FilesArtifactRecord;
	artifactGroup: FilesArtifactGroupRecord;
	basePath: string;
	token: string;
}) {
	const relativePath = createArtifactRelativePath(input.artifactGroup, input.artifact)
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");

	return `${input.basePath}/${encodeURIComponent(input.token)}/${relativePath}`;
}

function normalizePlaybackBasePath(basePath: string) {
	return `/${stripSlashes(basePath)}`;
}

function normalizePlaybackRequestPath(path: string) {
	const normalized = stripSlashes(path);
	if (!normalized || normalized.split("/").some((segment) => segment === "..")) {
		return null;
	}

	return normalized;
}

function selectReadyHlsPlaybackArtifacts(artifacts: readonly FilesArtifactRecord[]) {
	return artifacts
		.filter((artifact) => artifact.status === "ready" && artifact.deletedAt === null)
		.sort((left, right) => left.sortOrder - right.sortOrder);
}

function readCaptionMetadata(metadata: Record<string, unknown> | null) {
	return {
		default: metadata?.default === true,
		kind: readCaptionKind(metadata?.kind),
		label: typeof metadata?.label === "string" && metadata.label ? metadata.label : null,
		language:
			typeof metadata?.language === "string" && metadata.language ? metadata.language : null,
	};
}

function readCaptionKind(value: unknown): FilesHlsCaptionTrack["kind"] {
	switch (value) {
		case "chapters":
		case "descriptions":
		case "metadata":
		case "subtitles":
			return value;
		default:
			return "captions";
	}
}

function stripSlashes(value: string) {
	return value.replace(/^\/+|\/+$/g, "");
}
