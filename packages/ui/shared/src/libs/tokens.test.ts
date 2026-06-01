import { describe, expect, it } from "vitest";

import { sharedRadiusTokens, sharedStyleTokens, sharedToneTokens } from "./tokens";

describe("shared token contracts", () => {
	it("defines the expected tone token baseline", () => {
		expect(sharedToneTokens).toEqual(["accent", "subtle", "success", "warning", "danger", "info"]);
	});

	it("tracks the expected baseline variable keys", () => {
		expect(sharedStyleTokens).toEqual({
			focusRingWidth: "--focus-ring-width",
			controlRadius2xs: "--control-radius-2xs",
			controlRadiusXs: "--control-radius-xs",
			controlRadiusSm: "--control-radius-sm",
			drawerHandleWidth: "--drawer-handle-width",
			tooltipTriggerOffset: "--tooltip-trigger-offset",
			tooltipContentOffset: "--tooltip-content-offset",
		});
	});

	it("keeps the radius token tuple aligned with style token sources", () => {
		expect(sharedRadiusTokens).toEqual([
			sharedStyleTokens.controlRadius2xs,
			sharedStyleTokens.controlRadiusXs,
			sharedStyleTokens.controlRadiusSm,
		]);
	});
});
