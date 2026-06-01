import type { SharedToneToken } from "@de100/ui-shared/libs/tokens";

export const typographySemanticTags = ["h1", "h2", "h3", "h4", "h5", "h6", "p"] as const;
export type TypographySemanticTag = (typeof typographySemanticTags)[number];

export const typographyVariants = ["display-xl", "title-lg", "body-md", "caption-sm"] as const;
export type TypographyVariant = (typeof typographyVariants)[number];

export const typographyTextAlignments = ["start", "center", "end", "justify"] as const;
export type TypographyTextAlignment = (typeof typographyTextAlignments)[number];

export const typographyDirections = ["auto", "ltr", "rtl"] as const;
export type TypographyDirection = (typeof typographyDirections)[number];

export const typographyEnterpriseToneAliases = [
	"brand",
	"neutral-strong",
	"positive",
	"caution",
	"critical",
	"highlight",
] as const;
export type TypographyEnterpriseToneAlias = (typeof typographyEnterpriseToneAliases)[number];

export type TypographyTone = SharedToneToken | TypographyEnterpriseToneAlias;

export type TypographyToneClassOverrides = Partial<Record<TypographyTone, string>>;

export type ResolveTypographyToneInput = {
	tone?: TypographyTone;
	toneClassName?: string;
	toneClassOverrides?: TypographyToneClassOverrides;
};

export type ResolvedTypographyTone = {
	aliasOf?: SharedToneToken;
	className: string;
	tone: TypographyTone;
};
