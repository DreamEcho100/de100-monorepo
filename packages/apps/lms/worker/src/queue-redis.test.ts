import { describe, expect, it } from "vitest";

import type { LmsFilesRedisQueueClient } from "./queue-redis";
import { createLmsFilesRedisQueueAdapter } from "./queue-redis";

const now = new Date("2026-06-07T10:00:00.000Z");

describe("LMS Redis files queue", () => {
	it("pushes ready jobs and returns them FIFO through Redis list order", async () => {
		const client = createFakeRedisClient();
		const queue = createLmsFilesRedisQueueAdapter({
			client,
			keyPrefix: "files",
			now: () => now,
		});

		await queue.enqueue(createPayload("job_1"));
		await queue.enqueue(createPayload("job_2"));

		expect(await queue.next()).toMatchObject({ processingJobId: "job_1" });
		expect(await queue.next()).toMatchObject({ processingJobId: "job_2" });
		expect(await queue.next()).toBeNull();
	});

	it("promotes delayed jobs only after they are due", async () => {
		const client = createFakeRedisClient();
		let currentTime = now;
		const queue = createLmsFilesRedisQueueAdapter({
			client,
			keyPrefix: "files",
			now: () => currentTime,
		});

		await queue.enqueue(createPayload("job_1"), {
			runAfter: new Date(now.getTime() + 1_000),
		});

		expect(await queue.next()).toBeNull();
		currentTime = new Date(now.getTime() + 1_001);
		expect(await queue.next()).toMatchObject({ processingJobId: "job_1" });
	});

	it("records completed and failed jobs in status hashes", async () => {
		const client = createFakeRedisClient();
		const queue = createLmsFilesRedisQueueAdapter({ client, keyPrefix: "files", now: () => now });

		await queue.ack("job_1");
		await queue.fail("job_2", { message: "failed" });

		expect(client.hashes.get("files:completed")?.has("job_1")).toBe(true);
		expect(client.hashes.get("files:failed")?.get("job_2")).toContain("failed");
	});
});

function createPayload(id: string) {
	return {
		fileId: id.replace("job", "file"),
		kind: "custom" as const,
		metadata: null,
		processingJobId: id,
	};
}

function createFakeRedisClient(): LmsFilesRedisQueueClient & {
	hashes: Map<string, Map<string, string>>;
	lists: Map<string, string[]>;
	zsets: Map<string, Array<{ score: number; value: string }>>;
} {
	const lists = new Map<string, string[]>();
	const zsets = new Map<string, Array<{ score: number; value: string }>>();
	const hashes = new Map<string, Map<string, string>>();

	return {
		hashes,
		lists,
		zsets,
		async hset(key, field, value) {
			const hash = hashes.get(key) ?? new Map<string, string>();
			hash.set(field, value);
			hashes.set(key, hash);
			return 1;
		},
		async lpush(key, value) {
			const list = lists.get(key) ?? [];
			list.unshift(value);
			lists.set(key, list);
			return list.length;
		},
		async rpop(key) {
			const list = lists.get(key) ?? [];
			return list.pop() ?? null;
		},
		async zadd(key, score, value) {
			const zset = zsets.get(key) ?? [];
			zset.push({ score, value });
			zsets.set(key, zset);
			return 1;
		},
		async zrangebyscore(key, _min, max, _limitKeyword, offset, count) {
			const maxScore = typeof max === "number" ? max : Number(max);
			return (zsets.get(key) ?? [])
				.filter((entry) => entry.score <= maxScore)
				.sort((a, b) => a.score - b.score)
				.slice(Number(offset), Number(offset) + Number(count))
				.map((entry) => entry.value);
		},
		async zrem(key, ...members) {
			const memberSet = new Set(members);
			zsets.set(
				key,
				(zsets.get(key) ?? []).filter((entry) => !memberSet.has(entry.value)),
			);
			return members.length;
		},
	};
}
