import { describe, expect, it } from "vitest";

import { createHlsVideoPlayerQoeEvent } from "./hls-video-player";

describe("HLS video player QoE events", () => {
	it("normalizes finite playback numbers and buffered ranges", () => {
		const event = createHlsVideoPlayerQoeEvent({
			eventKind: "progress",
			metadata: { source: "test" },
			video: {
				buffered: createTimeRanges([0, 12]),
				currentTime: 5,
				duration: 30,
			},
		});

		expect(event).toEqual({
			bufferedSeconds: 12,
			durationSeconds: 30,
			eventKind: "progress",
			metadata: { source: "test" },
			positionSeconds: 5,
			renditionLabel: null,
		});
	});

	it("uses null for unavailable media metrics", () => {
		const event = createHlsVideoPlayerQoeEvent({
			eventKind: "error",
			video: {
				buffered: createTimeRanges(),
				currentTime: Number.NaN,
				duration: Number.POSITIVE_INFINITY,
			},
		});

		expect(event).toMatchObject({
			bufferedSeconds: null,
			durationSeconds: null,
			positionSeconds: null,
		});
	});
});

function createTimeRanges(...ranges: Array<[number, number]>): TimeRanges {
	return {
		end: (index: number) => ranges[index]?.[1] ?? 0,
		length: ranges.length,
		start: (index: number) => ranges[index]?.[0] ?? 0,
	};
}
