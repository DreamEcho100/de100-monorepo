import { describe, expect, it } from "vitest";

import {
	parseLinkPreviewMetadataRequest,
	parseLinkPreviewMetadataResponse,
	resolveLinkPrefetchBehavior,
	resolveLinkPreviewI18nConfig,
} from "./contracts";

describe("link preview contracts", () => {
	it("resolves stable defaults for prefetch behavior and i18n", () => {
		expect(resolveLinkPrefetchBehavior()).toEqual({
			behavior: "intent",
			enabled: true,
			focusDelayMs: 0,
			intentDelayMs: 80,
			minimumConnectionType: "3g",
			reactivateAfterMs: Number.POSITIVE_INFINITY,
			touchStrategy: "onTouchStart",
		});

		expect(resolveLinkPreviewI18nConfig()).toEqual({
			copyActionLabel: "Copy",
			dismissActionLabel: "Dismiss",
			openActionLabel: "Open",
			openInNewTabActionLabel: "Open in new tab",
			pinActionLabel: "Pin",
			saveActionLabel: "Save",
			unavailableMessage: "Preview unavailable",
		});
	});

	it("validates behavior timings and i18n text", () => {
		expect(() =>
			resolveLinkPrefetchBehavior({
				focusDelayMs: -1,
			}),
		).toThrow("focusDelayMs must be a non-negative integer");

		expect(() =>
			resolveLinkPreviewI18nConfig({
				openActionLabel: "",
			}),
		).toThrow("i18n.openActionLabel cannot be empty");
	});

	it("parses metadata request and response schemas", () => {
		expect(
			parseLinkPreviewMetadataRequest({
				locale: "en",
				referrer: "https://app.example.com/dashboard",
				url: "https://docs.example.com/page",
			}),
		).toEqual({
			locale: "en",
			referrer: "https://app.example.com/dashboard",
			url: "https://docs.example.com/page",
		});

		expect(
			parseLinkPreviewMetadataResponse({
				description: "Preview body",
				images: [
					{
						height: 630,
						url: "https://cdn.example.com/preview.png",
						width: 1200,
					},
				],
				siteName: "Docs",
				title: "Intro",
				url: "https://docs.example.com/page",
			}),
		).toEqual({
			description: "Preview body",
			images: [
				{
					height: 630,
					url: "https://cdn.example.com/preview.png",
					width: 1200,
				},
			],
			siteName: "Docs",
			title: "Intro",
			url: "https://docs.example.com/page",
		});

		expect(() =>
			parseLinkPreviewMetadataResponse({
				title: "",
				url: "https://docs.example.com/page",
			}),
		).toThrow();
	});
});
