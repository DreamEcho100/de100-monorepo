import { sharedToneTokens } from "./tokens";

export type DesignSystemConfig = {
	primitive: "kobalte";
	style: "vega";
	baseColor: "neutral";
	theme: "neutral";
	font: "inter";
	radius: "default";
	menuAccent: "subtle";
	tones: readonly string[];
};

export const designSystemConfig: DesignSystemConfig = {
	primitive: "kobalte",
	style: "vega",
	baseColor: "neutral",
	theme: "neutral",
	font: "inter",
	radius: "default",
	menuAccent: "subtle",
	tones: sharedToneTokens,
};
