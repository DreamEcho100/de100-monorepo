import { describe, expect, it } from "vitest";

import { createServerI18nState } from "./index";

describe("createServerI18nState", () => {
	it("resolves snapshot and active locale from request cookies", () => {
		const locales = [
			{
				code: "en",
				dir: "ltr",
				label: "English",
				messages: { common: { hello: "Hello" } },
			},
			{
				code: "ar",
				dir: "rtl",
				label: "Arabic",
				messages: { common: { hello: "Marhaban" } },
			},
		] as const;

		const request = new Request("https://example.dev", {
			headers: {
				cookie: "locale=ar; theme=dark",
			},
		});

		const state = createServerI18nState({
			defaultLocale: locales[0].code,
			locales,
			request,
		} as never);

		expect(state.initialSnapshot.locale).toBe("ar");
		expect(state.initialSnapshot.resolvedTheme).toBe("dark");
		expect(state.initialSnapshot.dir).toBe("rtl");
		expect(state.activeLocale?.code).toBe("ar");
	});
});
