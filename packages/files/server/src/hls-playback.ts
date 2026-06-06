import type {
	FilesHlsProtectionMode,
	FilesPlaybackSessionStatus,
	FilesSignedHlsPlaybackSession,
} from "@de100/files-shared";

export type CreateSignedHlsPlaybackSessionInput = {
	artifactGroupId: string;
	expiresAt: Date;
	fileId: string;
	id?: string;
	issuedAt?: Date;
	metadata?: Record<string, unknown> | null;
	protectionMode?: FilesHlsProtectionMode;
	subjectId?: string | null;
	token?: string;
};

export function createSignedHlsPlaybackSession(
	input: CreateSignedHlsPlaybackSessionInput,
): FilesSignedHlsPlaybackSession {
	return {
		artifactGroupId: input.artifactGroupId,
		expiresAt: input.expiresAt,
		fileId: input.fileId,
		id: input.id ?? crypto.randomUUID(),
		issuedAt: input.issuedAt ?? new Date(),
		metadata: input.metadata ?? null,
		protectionMode: input.protectionMode ?? "signed-session",
		status: "active",
		subjectId: input.subjectId ?? null,
		token: input.token ?? createPlaybackToken(),
	};
}

export function isSignedHlsPlaybackSessionUsable(
	session: Pick<FilesSignedHlsPlaybackSession, "expiresAt" | "status">,
	now: Date = new Date(),
) {
	return session.status === "active" && session.expiresAt.getTime() > now.getTime();
}

export function createPlaybackToken() {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function normalizePlaybackSessionStatus(
	input: FilesPlaybackSessionStatus,
	now: Date,
	expiresAt: Date,
): FilesPlaybackSessionStatus {
	if (input === "active" && expiresAt.getTime() <= now.getTime()) {
		return "expired";
	}

	return input;
}
