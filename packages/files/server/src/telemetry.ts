import type { FilesPlaybackEvent } from "@de100/files-shared";

import type { FilePlaybackEventRepository, FilesTelemetryAdapter } from "./operations";

export type RecordPlaybackEventInput = {
	event: FilesPlaybackEvent;
	repository?: FilePlaybackEventRepository;
	telemetry?: FilesTelemetryAdapter;
};

export type RecordPlaybackEventResult = {
	persisted: boolean;
	telemetryRecorded: boolean;
};

export async function recordFilesPlaybackEvent(
	input: RecordPlaybackEventInput,
): Promise<RecordPlaybackEventResult> {
	await input.repository?.createEvent(input.event);
	await input.telemetry?.recordPlaybackEvent(input.event);

	return {
		persisted: input.repository !== undefined,
		telemetryRecorded: input.telemetry !== undefined,
	};
}

export function createFilesPlaybackEvent(
	input: Omit<FilesPlaybackEvent, "id" | "occurredAt"> & {
		id?: string;
		occurredAt?: Date;
	},
): FilesPlaybackEvent {
	return {
		...input,
		id: input.id ?? crypto.randomUUID(),
		occurredAt: input.occurredAt ?? new Date(),
	};
}
