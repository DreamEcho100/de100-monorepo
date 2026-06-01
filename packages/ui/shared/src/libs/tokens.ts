export const sharedToneTokens = [
	"accent",
	"subtle",
	"success",
	"warning",
	"danger",
	"info",
] as const;

export type SharedToneToken = (typeof sharedToneTokens)[number];

export const sharedStyleTokens = {
	focusRingWidth: "--focus-ring-width",
	controlRadius2xs: "--control-radius-2xs",
	controlRadiusXs: "--control-radius-xs",
	controlRadiusSm: "--control-radius-sm",
	drawerHandleWidth: "--drawer-handle-width",
	tooltipTriggerOffset: "--tooltip-trigger-offset",
	tooltipContentOffset: "--tooltip-content-offset",
} as const;

export type SharedStyleTokenName = keyof typeof sharedStyleTokens;

export const sharedRadiusTokens = [
	sharedStyleTokens.controlRadius2xs,
	sharedStyleTokens.controlRadiusXs,
	sharedStyleTokens.controlRadiusSm,
] as const;
