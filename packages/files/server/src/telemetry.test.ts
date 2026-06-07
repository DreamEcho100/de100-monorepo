import { describe, expect, it } from "vitest";

import { createFilesPlaybackEvent, recordFilesPlaybackEvent } from "./telemetry";

describe("files telemetry helpers", () => {
	it("fans playback events out to persistence and telemetry adapters", async () => {
		const calls: string[] = [];
		const event = createFilesPlaybackEvent({
			artifactGroupId: "group_1",
			bufferedSeconds: 5,
			durationSeconds: 120,
			eventKind: "play",
			fileId: "file_1",
			metadata: null,
			playbackSessionId: "playback_1",
			positionSeconds: 0,
			renditionLabel: "720p",
			subjectId: "user_1",
		});
		const result = await recordFilesPlaybackEvent({
			event,
			repository: {
				async createEvent() {
					calls.push("repository");
					return event;
				},
				async listEvents() {
					return [];
				},
			},
			telemetry: {
				recordPlaybackEvent() {
					calls.push("telemetry");
				},
			},
		});

		expect(result).toEqual({ persisted: true, telemetryRecorded: true });
		expect(calls).toEqual(["repository", "telemetry"]);
	});
});
