import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("ui shared package resolution", () => {
	it("resolves the package root export", () => {
		const resolved = require.resolve("@de100/ui-shared");
		expect(resolved.endsWith("packages/ui/shared/src/index.ts")).toBe(true);
	});

	it("resolves the token subpath export", () => {
		const resolved = require.resolve("@de100/ui-shared/libs/tokens");
		expect(resolved.endsWith("packages/ui/shared/src/libs/tokens.ts")).toBe(true);
	});

	it("resolves the shared base stylesheet export", () => {
		const resolved = require.resolve("@de100/ui-shared/styles/base.css");
		expect(resolved.endsWith("packages/ui/shared/src/styles/base.css")).toBe(true);
	});
});
