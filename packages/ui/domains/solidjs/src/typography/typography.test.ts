import { renderToString } from "solid-js/web";
import { describe, expect, it } from "vitest";

import { H1, H6, P, Typography } from "../components/typography";
import {
	resolveTypographyClasses,
	resolveTypographyTone,
	typographyVariantsConfig,
} from "./variants";

describe("typography variants and tones", () => {
	it("maps variant and alignment classes deterministically", () => {
		const displayClasses = typographyVariantsConfig({ align: "center", variant: "display-xl" });
		const captionClasses = typographyVariantsConfig({ align: "end", variant: "caption-sm" });

		expect(displayClasses).toContain("text-4xl");
		expect(displayClasses).toContain("text-center");
		expect(captionClasses).toContain("text-sm");
		expect(captionClasses).toContain("text-end");
	});

	it("resolves shared and enterprise tones with alias support", () => {
		expect(resolveTypographyTone({ tone: "success" })).toEqual({
			className: "text-emerald-700 dark:text-emerald-300",
			tone: "success",
		});

		expect(resolveTypographyTone({ tone: "positive" })).toEqual({
			aliasOf: "success",
			className: "text-emerald-700 dark:text-emerald-300",
			tone: "positive",
		});
	});

	it("prefers explicit tone class overrides for custom tone slots", () => {
		expect(
			resolveTypographyTone({
				tone: "danger",
				toneClassName: "text-violet-500 dark:text-violet-300",
			}),
		).toEqual({
			className: "text-violet-500 dark:text-violet-300",
			tone: "danger",
		});

		expect(
			resolveTypographyTone({
				tone: "brand",
				toneClassOverrides: {
					brand: "text-cyan-600 dark:text-cyan-400",
				},
			}),
		).toEqual({
			className: "text-cyan-600 dark:text-cyan-400",
			tone: "brand",
		});
	});
});

describe("Typography components", () => {
	it("renders semantic tags with expected defaults", () => {
		const h1Markup = renderToString(() => H1({ children: "Dashboard" }));
		const h6Markup = renderToString(() => H6({ children: "Section label" }));
		const pMarkup = renderToString(() => P({ children: "Body copy" }));

		expect(h1Markup).toContain("<h1");
		expect(h1Markup).toContain('data-variant="display-xl"');
		expect(h6Markup).toContain("<h6");
		expect(h6Markup).toContain('data-variant="caption-sm"');
		expect(pMarkup).toContain("<p");
		expect(pMarkup).toContain('data-tone="subtle"');
	});

	it("supports explicit dir overrides and alignment", () => {
		const markup = renderToString(() =>
			Typography({
				align: "end",
				as: "h2",
				children: "RTL title",
				dir: "rtl",
				tone: "caution",
				variant: "title-lg",
			}),
		);

		expect(markup).toContain("<h2");
		expect(markup).toContain('dir="rtl"');
		expect(markup).toContain('data-align="end"');
		expect(markup).toContain('data-tone-alias="warning"');
	});

	it("allows custom tone class injection while preserving variant output", () => {
		const markup = renderToString(() =>
			Typography({
				children: "Custom tone",
				tone: "critical",
				toneClassName: "text-fuchsia-600 dark:text-fuchsia-300",
				variant: "body-md",
			}),
		);

		expect(markup).toContain("text-fuchsia-600");
		expect(markup).toContain("dark:text-fuchsia-300");
		expect(markup).toContain('data-tone="critical"');
		expect(markup).toContain('data-variant="body-md"');
		expect(markup).toContain("leading-7");
	});

	it("exposes resolved class metadata for app-level composition helpers", () => {
		const resolved = resolveTypographyClasses({
			align: "justify",
			dir: "ltr",
			tone: "highlight",
			variant: "title-lg",
		});

		expect(resolved.direction).toBe("ltr");
		expect(resolved.tone.aliasOf).toBe("info");
		expect(resolved.variantClassName).toContain("text-justify");
		expect(resolved.variantClassName).toContain("text-2xl");
	});
});
