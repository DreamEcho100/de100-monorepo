import { describe, expect, it } from "vitest";

import {
	createFilesAudioProcessingPlan,
	getFilesAudioPreviewContentType,
	getFilesAudioWaveformContentType,
} from "./index";

describe("audio processing planning", () => {
	it("plans metadata, normalized preview, waveform, and transcript hooks", () => {
		const plan = createFilesAudioProcessingPlan({
			preset: {
				metadata: true,
				normalizePreview: true,
				preview: { durationSeconds: 45, format: "opus" },
				transcript: "adapter",
				waveform: { format: "png" },
			},
			storagePrefix: "files/audio-1/",
		});

		expect(plan.preview).toEqual({
			contentType: "audio/ogg",
			durationSeconds: 45,
			format: "opus",
			key: "files/audio-1/preview.ogg",
			normalize: true,
		});
		expect(plan.waveform).toEqual({
			contentType: "image/png",
			format: "png",
			key: "files/audio-1/waveform.png",
		});
		expect(plan.transcript).toEqual({
			key: "files/audio-1/transcript.vtt",
			mode: "adapter",
		});
		expect(plan.requiredDependencies).toEqual(["music-metadata", "ffmpeg", "ffprobe"]);
	});

	it("keeps disabled output paths out of the plan", () => {
		const plan = createFilesAudioProcessingPlan({
			preset: { metadata: false, preview: false, transcript: "none", waveform: false },
			storagePrefix: "files/audio-2",
		});

		expect(plan).toEqual({
			metadata: false,
			requiredDependencies: [],
		});
	});

	it("validates preview duration and maps content types", () => {
		expect(() =>
			createFilesAudioProcessingPlan({
				preset: {
					metadata: false,
					preview: { durationSeconds: 0 },
					waveform: false,
				},
				storagePrefix: "files/audio-3",
			}),
		).toThrow("durationSeconds");
		expect(getFilesAudioPreviewContentType("aac")).toBe("audio/aac");
		expect(getFilesAudioWaveformContentType("json")).toBe("application/json");
	});
});
