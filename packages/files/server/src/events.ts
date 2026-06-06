import type { FilesEventIteratorEvent } from "./orpc";

type FilesEventSubscriber = {
	push(event: FilesEventIteratorEvent): void;
};

type FilesEventTopicType = "processing" | "upload";

export type FilesUploadEventInput = FilesEventIteratorEvent & {
	sessionId: string;
	type: "upload";
};

export type FilesProcessingEventInput = FilesEventIteratorEvent & {
	fileId: string;
	type: "processing";
};

export type FilesEventBus = {
	publishProcessing(event: FilesProcessingEventInput): void;
	publishUpload(event: FilesUploadEventInput): void;
	watchProcessing(input: { fileId: string }): AsyncIterable<FilesEventIteratorEvent>;
	watchUpload(input: { sessionId: string }): AsyncIterable<FilesEventIteratorEvent>;
};

export function createFilesEventBus(): FilesEventBus {
	const subscribers = new Map<string, Set<FilesEventSubscriber>>();

	function publish(
		topicType: FilesEventTopicType,
		topicId: string,
		event: FilesEventIteratorEvent,
	) {
		const topicSubscribers = subscribers.get(createTopicKey(topicType, topicId));
		if (!topicSubscribers) {
			return;
		}

		for (const subscriber of topicSubscribers) {
			subscriber.push(event);
		}
	}

	function subscribe(
		topicType: FilesEventTopicType,
		topicId: string,
	): AsyncIterable<FilesEventIteratorEvent> {
		return {
			[Symbol.asyncIterator]() {
				const topicKey = createTopicKey(topicType, topicId);
				const queue: FilesEventIteratorEvent[] = [];
				const pending: Array<(result: IteratorResult<FilesEventIteratorEvent>) => void> = [];
				let closed = false;

				const subscriber: FilesEventSubscriber = {
					push(event) {
						const resolve = pending.shift();
						if (resolve) {
							resolve({ done: false, value: event });
							return;
						}

						queue.push(event);
					},
				};

				const topicSubscribers = subscribers.get(topicKey) ?? new Set<FilesEventSubscriber>();
				topicSubscribers.add(subscriber);
				subscribers.set(topicKey, topicSubscribers);

				function unsubscribe() {
					if (closed) {
						return;
					}

					closed = true;
					topicSubscribers.delete(subscriber);
					if (topicSubscribers.size === 0) {
						subscribers.delete(topicKey);
					}

					for (const resolve of pending.splice(0)) {
						resolve({ done: true, value: undefined });
					}
				}

				return {
					next() {
						const event = queue.shift();
						if (event) {
							return Promise.resolve({ done: false, value: event });
						}

						if (closed) {
							return Promise.resolve({ done: true, value: undefined });
						}

						return new Promise<IteratorResult<FilesEventIteratorEvent>>((resolve) => {
							pending.push(resolve);
						});
					},
					return() {
						unsubscribe();
						return Promise.resolve({ done: true, value: undefined });
					},
				};
			},
		};
	}

	return {
		publishProcessing(event) {
			const iteratorEvent = {
				id: event.id,
				payload: event.payload,
				type: event.type,
			};
			publish(event.type, event.fileId, iteratorEvent);
		},
		publishUpload(event) {
			const iteratorEvent = {
				id: event.id,
				payload: event.payload,
				type: event.type,
			};
			publish(event.type, event.sessionId, iteratorEvent);
		},
		watchProcessing(input) {
			return subscribe("processing", input.fileId);
		},
		watchUpload(input) {
			return subscribe("upload", input.sessionId);
		},
	};
}

function createTopicKey(topicType: FilesEventTopicType, topicId: string) {
	return `${topicType}:${topicId}`;
}
