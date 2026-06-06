import { describe, expect, it } from "vitest";

import {
	createSignedHlsPlaybackSession,
	isSignedHlsPlaybackSessionUsable,
	normalizePlaybackSessionStatus,
} from "./hls-playback";

describe("signed HLS playback sessions", () => {
	it("creates active signed-session tokens by default", () => {
		const session = createSignedHlsPlaybackSession({
			artifactGroupId: "group_1",
			expiresAt: new Date("2026-06-07T00:10:00Z"),
			fileId: "file_1",
			issuedAt: new Date("2026-06-07T00:00:00Z"),
			subjectId: "user_1",
		});

		expect(session.protectionMode).toBe("signed-session");
		expect(session.status).toBe("active");
		expect(session.token.length).toBe(64);
	});

	it("treats expired or revoked playback sessions as unusable", () => {
		expect(
			isSignedHlsPlaybackSessionUsable(
				{ expiresAt: new Date("2026-06-07T00:00:00Z"), status: "active" },
				new Date("2026-06-07T00:00:01Z"),
			),
		).toBe(false);
		expect(
			isSignedHlsPlaybackSessionUsable(
				{ expiresAt: new Date("2026-06-07T00:10:00Z"), status: "revoked" },
				new Date("2026-06-07T00:00:01Z"),
			),
		).toBe(false);
	});

	it("normalizes active sessions to expired after their TTL", () => {
		expect(
			normalizePlaybackSessionStatus(
				"active",
				new Date("2026-06-07T00:10:00Z"),
				new Date("2026-06-07T00:10:00Z"),
			),
		).toBe("expired");
	});
});
