import type { SharedToneToken } from "@de100/ui-shared/libs/tokens";
import { sharedToneTokens } from "@de100/ui-shared/libs/tokens";
import { cva } from "class-variance-authority";

import type {
	ResolvedTypographyTone,
	ResolveTypographyToneInput,
	TypographyDirection,
	TypographyEnterpriseToneAlias,
	TypographyTextAlignment,
	TypographyTone,
	TypographyVariant,
} from "./contracts";

const toneClassMap: Record<SharedToneToken, string> = {
	accent: "text-primary",
	danger: "text-destructive",
	info: "text-sky-700 dark:text-sky-300",
	subtle: "text-muted-foreground",
	success: "text-emerald-700 dark:text-emerald-300",
	warning: "text-amber-700 dark:text-amber-300",
};

const enterpriseToneAliasMap: Record<TypographyEnterpriseToneAlias, SharedToneToken> = {
	brand: "accent",
	caution: "warning",
	critical: "danger",
	highlight: "info",
	"neutral-strong": "info",
	positive: "success",
};

export const typographyVariantsConfig = cva("z-typography max-w-full tracking-normal", {
	defaultVariants: {
		align: "start",
		variant: "body-md",
	},
	variants: {
		align: {
			center: "text-center",
			end: "text-end",
			justify: "text-justify",
			start: "text-start",
		},
		variant: {
			"body-md": "text-pretty text-base leading-7",
			"caption-sm": "text-sm leading-6",
			"display-xl": "text-balance font-semibold text-4xl leading-tight md:text-5xl",
			"title-lg": "text-balance font-semibold text-2xl leading-tight md:text-3xl",
		},
	},
});

function isSharedToneToken(value: TypographyTone): value is SharedToneToken {
	return (sharedToneTokens as readonly string[]).includes(value);
}

function assertValidClassName(value: string, field: string) {
	if (value.trim().length === 0) {
		throw new Error(`${field} cannot be empty.`);
	}
}

export function resolveTypographyTone(
	input: ResolveTypographyToneInput = {},
): ResolvedTypographyTone {
	const tone = input.tone ?? "subtle";
	const overrideClassName = input.toneClassName?.trim();

	if (overrideClassName) {
		return {
			className: overrideClassName,
			tone,
		};
	}

	const toneClassOverride = input.toneClassOverrides?.[tone]?.trim();
	if (toneClassOverride) {
		return {
			className: toneClassOverride,
			tone,
		};
	}

	if (isSharedToneToken(tone)) {
		return {
			className: toneClassMap[tone],
			tone,
		};
	}

	const aliasOf = enterpriseToneAliasMap[tone];
	return {
		aliasOf,
		className: toneClassMap[aliasOf],
		tone,
	};
}

export function resolveTypographyClasses(input: {
	align?: TypographyTextAlignment;
	dir?: TypographyDirection;
	tone?: TypographyTone;
	toneClassName?: string;
	toneClassOverrides?: ResolveTypographyToneInput["toneClassOverrides"];
	variant?: TypographyVariant;
}) {
	const resolvedTone = resolveTypographyTone({
		tone: input.tone,
		toneClassName: input.toneClassName,
		toneClassOverrides: input.toneClassOverrides,
	});

	assertValidClassName(resolvedTone.className, "Typography tone class");

	return {
		direction: input.dir,
		tone: resolvedTone,
		variantClassName: typographyVariantsConfig({
			align: input.align,
			variant: input.variant,
		}),
	};
}
