import { describe, expect, it } from "vitest";

import { filesPlaybackEventSchema } from "./analytics";

describe("files playback analytics", () => {
	it("accepts QoE playback events with optional telemetry fields", () => {
		const event = filesPlaybackEventSchema.parse({
			artifactGroupId: "group_1",
			bufferedSeconds: 12,
			durationSeconds: 120,
			eventKind: "rendition-change",
			fileId: "file_1",
			id: "event_1",
			metadata: { bandwidth: 2_800_000 },
			occurredAt: new Date("2026-06-07T00:00:00Z"),
			playbackSessionId: "session_1",
			positionSeconds: 10,
			renditionLabel: "720p",
			subjectId: "user_1",
		});

		expect(event.eventKind).toBe("rendition-change");
	});
});
