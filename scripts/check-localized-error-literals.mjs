import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFilePath), "..");

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

function getLineNumber(content, index) {
	return content.slice(0, index).split("\n").length;
}

function collectMatches(content, expression) {
	return Array.from(content.matchAll(expression)).map((match) => ({
		index: match.index ?? 0,
		literal: match[1],
	}));
}

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
		await walkFiles(path.join(repoRoot, "packages/apps/lms/api/src/routers"))
	).filter((filePath) => filePath.endsWith(".ts"));
	const validatorFiles = (
		await walkFiles(path.join(repoRoot, "packages/apps/lms/validators/src/internal"))
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
