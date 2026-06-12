import { describe, expect, it, vi } from "vitest";

import type { I18nLocaleMessages } from "../types";
import { defineTranslation, generateI18nConfig } from "./index";

const sourceMessages = {
	cart: defineTranslation("{count:plural} in cart", {
		plural: {
			count: {
				one: "{?} item",
				other: "{?} items",
			},
		},
	}),
	due: "Due {date:date}",
	enumStatus: defineTranslation("Status: {status:enum}", {
		enum: {
			status: {
				draft: "Draft",
				published: "Published",
			},
		},
	}),
	greeting: "Hello {name}",
	list: "Selected {items:list}",
	missingPluralConfig: ["{count:plural}", {}],
	repeated: "{name} invited {name}",
	score: "Score {value:number}",
	updated: "Updated {value:relativeTime}",
} as const;

const sourceLocales = [
	{ code: "en", dir: "ltr", label: "English", messages: sourceMessages },
	{ code: "ar", dir: "rtl", label: "Arabic", messages: sourceMessages },
] as const;

function createTestConfig(options?: {
	fallbackLocale?: string | string[];
	locale?: string;
	onError?: Parameters<typeof generateI18nConfig>[0]["onError"];
	translations?: Record<string, I18nLocaleMessages<typeof sourceMessages>>;
}) {
	return generateI18nConfig({
		i18nLocales: sourceLocales,
		locale: options?.locale ?? "en",
		fallbackLocale: options?.fallbackLocale,
		onError: options?.onError,
		translations: options?.translations ?? {
			en: sourceMessages,
		},
	});
}

function runtimeT(config: ReturnType<typeof createTestConfig>) {
	return config.t as (key: string, args?: Record<string, unknown>) => string;
}

describe("generateI18nConfig", () => {
	it("formats plain string parameters", () => {
		const t = runtimeT(createTestConfig());

		expect(t("greeting", { name: "Ada" })).toBe("Hello Ada");
	});

	it("formats typed parameters", () => {
		const t = runtimeT(createTestConfig());

		expect(t("score", { value: 1234 })).toBe("Score 1,234");
		expect(t("due", { date: new Date(Date.UTC(2020, 0, 2)) })).toBe("Due 1/2/2020");
		expect(t("list", { items: ["A", "B", "C"] })).toBe("Selected A, B, and C");
		expect(t("updated", { value: { value: -1, unit: "day" } })).toBe("Updated 1 day ago");
	});

	it("uses defineTranslation plural and enum metadata", () => {
		const t = runtimeT(createTestConfig());

		expect(t("cart", { count: 1 })).toBe("1 item in cart");
		expect(t("cart", { count: 2 })).toBe("2 items in cart");
		expect(t("enumStatus", { status: "published" })).toBe("Status: Published");
	});

	it("replaces repeated placeholders", () => {
		const t = runtimeT(createTestConfig());

		expect(t("repeated", { name: "Ada" })).toBe("Ada invited Ada");
	});

	it("falls back through parent and configured fallback locales", () => {
		const parentConfig = createTestConfig({ locale: "en-GB" });
		const fallbackConfig = createTestConfig({
			locale: "ar",
			fallbackLocale: "en",
			translations: { en: sourceMessages },
		});

		expect(runtimeT(parentConfig)("greeting", { name: "Ada" })).toBe("Hello Ada");
		expect(runtimeT(fallbackConfig)("greeting", { name: "Ada" })).toBe("Hello Ada");
	});

	it("returns the key for missing translations", () => {
		const config = createTestConfig();

		expect(runtimeT(config)("missing.key")).toBe("missing.key");
	});

	it("reports runtime formatting errors through onError", () => {
		const onError = vi.fn();
		const config = createTestConfig({ onError });

		expect(runtimeT(config)("missingPluralConfig", { count: 1 })).toBe("missingPluralConfig");
		expect(onError).toHaveBeenCalledTimes(1);
		expect(String(onError.mock.calls[0]?.[0])).toContain("Missing plural configuration");
	});
});
