// @ts-check

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const targetFiles = [
	"apps/proto-cook-web/src/course-lesson-page.tsx",
	"apps/proto-cook-web/src/course-video-lab-page.tsx",
	"apps/proto-cook-web/src/files-approach-lab-page.tsx",
	"apps/proto-cook-web/src/files-scenario-lab-page.tsx",
];

const userFacingAttributes = ["aria-label", "placeholder", "title"];

/**
 * @param {string} content
 * @param {number} index
 */
function getLineNumber(content, index) {
	return content.slice(0, index).split("\n").length;
}

/**
 * @param {string} filePath
 */
function toRelativePath(filePath) {
	return path.relative(repoRoot, filePath);
}

/**
 * @param {string} value
 */
function hasAlphabeticText(value) {
	return /[A-Za-z]/.test(value.trim());
}

async function main() {
	const violations = [];

	for (const relativeFile of targetFiles) {
		const filePath = path.join(repoRoot, relativeFile);
		const content = await readFile(filePath, "utf8");

		for (const match of content.matchAll(/>([^<>{}\n]*[A-Za-z][^<>{}]*)</g)) {
			const text = match[1]?.trim();
			if (!text || !hasAlphabeticText(text)) continue;

			violations.push({
				filePath,
				line: getLineNumber(content, match.index ?? 0),
				rule: "raw JSX text",
				text,
			});
		}

		for (const attribute of userFacingAttributes) {
			const expression = new RegExp(`${attribute}=["']([^"']*[A-Za-z][^"']*)["']`, "g");

			for (const match of content.matchAll(expression)) {
				const text = match[1]?.trim();
				if (!text || !hasAlphabeticText(text)) continue;

				violations.push({
					filePath,
					line: getLineNumber(content, match.index ?? 0),
					rule: `raw ${attribute} attribute`,
					text,
				});
			}
		}
	}

	if (violations.length === 0) {
		console.log("No raw user-facing lab UI copy found in targeted Proto Cook pages.");
		return;
	}

	console.error("Found raw user-facing lab UI copy. Use i18n message keys instead:");

	for (const violation of violations) {
		console.error(
			`- ${toRelativePath(violation.filePath)}:${violation.line} ${violation.rule}: "${violation.text}"`,
		);
	}

	process.exitCode = 1;
}

await main();
