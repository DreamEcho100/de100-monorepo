import { describe, expect, it } from "vitest";

import { arMessages } from "./ar";
import { enMessages } from "./en";

type PlaceholderMap = Map<string, readonly string[]>;

function getMessageText(value: unknown) {
	if (typeof value === "string") return value;
	if (Array.isArray(value) && typeof value[0] === "string") return value[0];
	return undefined;
}

function extractPlaceholderTokens(message: string) {
	const tokens: string[] = [];
	const placeholderPattern = /\{([^:}]+)(?::([^}]+))?\}/g;

	for (const match of message.matchAll(placeholderPattern)) {
		const name = match[1];
		const type = match[2];
		if (!name) continue;
		tokens.push(type ? `${name}:${type}` : name);
	}

	return tokens.sort();
}

function collectMessagePlaceholders(
	node: unknown,
	path: string[] = [],
	entries: PlaceholderMap = new Map(),
) {
	const messageText = getMessageText(node);

	if (messageText !== undefined) {
		entries.set(path.join("."), extractPlaceholderTokens(messageText));
		return entries;
	}

	if (node === null || typeof node !== "object" || Array.isArray(node)) return entries;

	for (const [key, value] of Object.entries(node)) {
		collectMessagePlaceholders(value, [...path, key], entries);
	}

	return entries;
}

function sortedKeys(entries: PlaceholderMap) {
	return [...entries.keys()].sort();
}

describe("Proto Cook locale message parity", () => {
	it("keeps Arabic keys and placeholders aligned with the English source locale", () => {
		const sourceMessages = collectMessagePlaceholders(enMessages);
		const translatedMessages = collectMessagePlaceholders(arMessages);

		expect(sortedKeys(translatedMessages)).toEqual(sortedKeys(sourceMessages));

		for (const [key, sourcePlaceholders] of sourceMessages) {
			expect(translatedMessages.get(key), key).toEqual(sourcePlaceholders);
		}
	});
});
