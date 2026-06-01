import { describe, expect, it } from "vitest";

import { designSystemConfig } from "./design-system";
import { cn } from "./utils";

describe("ui utility exports", () => {
	it("merges and deduplicates utility classes", () => {
		const classes = cn("px-2 py-2", "px-4", "text-sm");

		expect(classes).toContain("px-4");
		expect(classes).toContain("py-2");
		expect(classes).toContain("text-sm");
		expect(classes).not.toContain("px-2");
	});

	it("exposes the expected design system baseline", () => {
		expect(designSystemConfig.primitive).toBe("kobalte");
		expect(designSystemConfig.style).toBe("vega");
		expect(designSystemConfig.baseColor).toBe("neutral");
	});
});
