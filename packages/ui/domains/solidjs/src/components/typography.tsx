import type { JSX } from "solid-js";
import { mergeProps, splitProps } from "solid-js";

import type {
	TypographyDirection,
	TypographySemanticTag,
	TypographyTextAlignment,
	TypographyTone,
	TypographyToneClassOverrides,
	TypographyVariant,
} from "../libs/typography/contracts";
import { resolveTypographyClasses } from "../libs/typography/variants";
import { cn } from "#libs/utils";

type TypographySharedProps = {
	align?: TypographyTextAlignment;
	children?: JSX.Element;
	class?: string | undefined;
	dir?: TypographyDirection;
	tone?: TypographyTone;
	toneClassName?: string;
	toneClassOverrides?: TypographyToneClassOverrides;
	variant?: TypographyVariant;
};

type TypographyProps = TypographySharedProps &
	JSX.HTMLAttributes<HTMLElement> & {
		as?: TypographySemanticTag;
	};

const Typography = (rawProps: TypographyProps) => {
	const props = mergeProps(
		{
			align: "start" as const,
			as: "p" as const,
			tone: "subtle" as const,
			variant: "body-md" as const,
		},
		rawProps,
	);

	const [local, others] = splitProps(props, [
		"align",
		"as",
		"class",
		"dir",
		"tone",
		"toneClassName",
		"toneClassOverrides",
		"variant",
	]);

	const resolvedClasses = resolveTypographyClasses({
		align: local.align,
		dir: local.dir,
		tone: local.tone,
		toneClassName: local.toneClassName,
		toneClassOverrides: local.toneClassOverrides,
		variant: local.variant,
	});

	const commonProps = {
		class: cn(resolvedClasses.variantClassName, resolvedClasses.tone.className, local.class),
		"data-align": local.align,
		"data-slot": "typography",
		"data-tone": resolvedClasses.tone.tone,
		"data-tone-alias": resolvedClasses.tone.aliasOf,
		"data-variant": local.variant,
		dir: resolvedClasses.direction,
	};

	if (local.as === "p") {
		return <p {...commonProps} {...(others as JSX.HTMLAttributes<HTMLParagraphElement>)} />;
	}

	if (local.as === "h1") {
		return <h1 {...commonProps} {...(others as JSX.HTMLAttributes<HTMLHeadingElement>)} />;
	}

	if (local.as === "h2") {
		return <h2 {...commonProps} {...(others as JSX.HTMLAttributes<HTMLHeadingElement>)} />;
	}

	if (local.as === "h3") {
		return <h3 {...commonProps} {...(others as JSX.HTMLAttributes<HTMLHeadingElement>)} />;
	}

	if (local.as === "h4") {
		return <h4 {...commonProps} {...(others as JSX.HTMLAttributes<HTMLHeadingElement>)} />;
	}

	if (local.as === "h5") {
		return <h5 {...commonProps} {...(others as JSX.HTMLAttributes<HTMLHeadingElement>)} />;
	}

	return <h6 {...commonProps} {...(others as JSX.HTMLAttributes<HTMLHeadingElement>)} />;
};

type HeadingProps = Omit<TypographyProps, "as">;
type ParagraphProps = Omit<TypographyProps, "as">;

const H1 = (props: HeadingProps) => (
	<Typography as="h1" variant="display-xl" tone="info" {...props} />
);
const H2 = (props: HeadingProps) => (
	<Typography as="h2" variant="title-lg" tone="info" {...props} />
);
const H3 = (props: HeadingProps) => (
	<Typography as="h3" variant="title-lg" tone="info" {...props} />
);
const H4 = (props: HeadingProps) => <Typography as="h4" variant="body-md" tone="info" {...props} />;
const H5 = (props: HeadingProps) => <Typography as="h5" variant="body-md" tone="info" {...props} />;
const H6 = (props: HeadingProps) => (
	<Typography as="h6" variant="caption-sm" tone="info" {...props} />
);
const P = (props: ParagraphProps) => (
	<Typography as="p" variant="body-md" tone="subtle" {...props} />
);

export type { TypographyProps };
export { H1, H2, H3, H4, H5, H6, P, Typography };
