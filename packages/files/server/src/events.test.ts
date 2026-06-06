import { describe, expect, it } from "vitest";

import { createFilesEventBus } from "./events";

describe("createFilesEventBus", () => {
	it("delivers upload events to matching session subscribers", async () => {
		const eventBus = createFilesEventBus();
		const iterator = eventBus.watchUpload({ sessionId: "session_1" })[Symbol.asyncIterator]();
		const nextEvent = iterator.next();

		eventBus.publishUpload({
			id: "event_1",
			payload: {
				status: "active",
			},
			sessionId: "session_1",
			type: "upload",
		});

		await expect(nextEvent).resolves.toEqual({
			done: false,
			value: {
				id: "event_1",
				payload: {
					status: "active",
				},
				type: "upload",
			},
		});

		await iterator.return?.();
	});
});
