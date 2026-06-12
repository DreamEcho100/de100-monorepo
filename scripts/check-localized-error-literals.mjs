// @ts-check

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFilePath), "..");

/**
 * @param {string} directoryPath
 * @returns {Promise<string[]>}
 */
async function walkFiles(directoryPath) {
	const entries = await readdir(directoryPath, { withFileTypes: true });
	const filePaths = await Promise.all(
		entries.map(async (entry) => {
			const entryPath = path.join(directoryPath, entry.name);

			if (entry.isDirectory()) {
				return await walkFiles(entryPath);
			}

			return entryPath;
		}),
	);

	return filePaths.flat();
}

/**
 * @param {string} content
 * @param {number} index
 */
function getLineNumber(content, index) {
	return content.slice(0, index).split("\n").length;
}

/**
 * @param {string} content
 * @param {RegExp} expression
 */
function collectMatches(content, expression) {
	const matches = [];

	for (const match of content.matchAll(expression)) {
		const literal = match[1];
		if (typeof literal !== "string") continue;

		matches.push({
			index: match.index ?? 0,
			literal,
		});
	}

	return matches;
}

/** @param {string} filePath */
function toRelativePath(filePath) {
	return path.relative(repoRoot, filePath);
}

const routerPatterns = [
	{
		label: "literal message in .errors()",
		expression: /\.errors\(\s*\{[\s\S]{0,800}?message:\s*"([^"]+)"/g,
	},
	{
		label: "literal message in new ORPCError()",
		expression: /new\s+ORPCError\([\s\S]{0,800}?message:\s*"([^"]+)"/g,
	},
];

const validatorPattern = /message:\s*"([^"]+)"/g;

async function main() {
	const violations = [];
	const routerFiles = (
		await walkFiles(path.join(repoRoot, "packages/apps/proto-cook/api/src/routers"))
	).filter((filePath) => filePath.endsWith(".ts"));
	const validatorFiles = (
		await walkFiles(path.join(repoRoot, "packages/apps/proto-cook/validators/src/internal"))
	).filter((filePath) => filePath.endsWith(".ts"));

	for (const filePath of routerFiles) {
		const content = await readFile(filePath, "utf8");

		for (const pattern of routerPatterns) {
			for (const match of collectMatches(content, pattern.expression)) {
				violations.push({
					filePath,
					line: getLineNumber(content, match.index),
					literal: match.literal,
					rule: pattern.label,
				});
			}
		}
	}

	for (const filePath of validatorFiles) {
		const content = await readFile(filePath, "utf8");

		for (const match of collectMatches(content, validatorPattern)) {
			if (match.literal.startsWith("validation.")) {
				continue;
			}

			violations.push({
				filePath,
				line: getLineNumber(content, match.index),
				literal: match.literal,
				rule: "literal validator message",
			});
		}
	}

	if (violations.length === 0) {
		console.log("No raw localized-error literals found in targeted router/validator sites.");
		return;
	}

	console.error("Found raw localized-error literals in targeted router/validator sites:");

	for (const violation of violations) {
		console.error(
			`- ${toRelativePath(violation.filePath)}:${violation.line} ${violation.rule}: "${violation.literal}"`,
		);
	}

	process.exitCode = 1;
}

await main();
