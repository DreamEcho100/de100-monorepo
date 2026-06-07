// @ts-check

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFilePath), "..");

const forbiddenFilesStorageImports = new Set([
	"getFilesBucket",
	"getFilesBucketName",
	"getFilesStorageCapabilities",
	"getPublicFilesDirectUrl",
	"FilesBindingsUnavailableError",
	"FilesLocalStorageUnavailableError",
]);

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

function toRelativePath(filePath) {
	return path.relative(repoRoot, filePath);
}

function parseNamedSpecifiers(specifiers) {
	return specifiers
		.split(",")
		.map((rawSpecifier) => rawSpecifier.trim())
		.filter(Boolean)
		.map((rawSpecifier) => rawSpecifier.split(/\s+as\s+/)[0]?.trim())
		.filter(Boolean);
}

async function main() {
	const violations = [];
	const routersDirectory = path.join(repoRoot, "packages/apps/lms/api/src/routers");
	const routerFiles = (await walkFiles(routersDirectory)).filter((filePath) =>
		filePath.endsWith(".ts"),
	);

	for (const filePath of routerFiles) {
		const content = await readFile(filePath, "utf8");
		const namedImportExpression =
			/import\s+(?:type\s+)?\{([\s\S]*?)\}\s+from\s+["']\.\.\/files-storage["'];?/g;
		const namespaceImportExpression =
			/import\s+\*\s+as\s+\w+\s+from\s+["']\.\.\/files-storage["'];?/g;

		for (const match of content.matchAll(namedImportExpression)) {
			const specifiers = parseNamedSpecifiers(match[1] ?? "");

			for (const specifier of specifiers) {
				if (!forbiddenFilesStorageImports.has(specifier)) {
					continue;
				}

				violations.push({
					filePath,
					line: getLineNumber(content, match.index ?? 0),
					rule: "forbidden files-storage import",
					specifier,
				});
			}
		}

		for (const match of content.matchAll(namespaceImportExpression)) {
			violations.push({
				filePath,
				line: getLineNumber(content, match.index ?? 0),
				rule: "namespace import from files-storage",
				specifier: "*",
			});
		}
	}

	if (violations.length === 0) {
		console.log("Files router storage imports are constrained to provider-facing APIs.");
		return;
	}

	console.error("Found forbidden files-storage imports in API routers:");

	for (const violation of violations) {
		console.error(
			`- ${toRelativePath(violation.filePath)}:${violation.line} ${violation.rule}: ${violation.specifier}`,
		);
	}

	process.exitCode = 1;
}

await main();
