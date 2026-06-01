import { describe, expect, it, vi } from "vitest";

import { createLinkPreviewCardModel } from "./preview-card-model";

const metadata = {
	description: "API reference for LMS routes",
	images: [{ url: "https://cdn.de100.app/preview.png" }],
	siteName: "Docs",
	title: "LMS API",
	url: "https://docs.de100.app/api",
};

describe("createLinkPreviewCardModel", () => {
	it("builds a stable card model with action labels", () => {
		const model = createLinkPreviewCardModel({
			href: "https://docs.de100.app/api",
			metadata,
		});

		expect(model.title).toBe("LMS API");
		expect(model.description).toBe("API reference for LMS routes");
		expect(model.siteName).toBe("Docs");
		expect(model.imageUrl).toBe("https://cdn.de100.app/preview.png");
		expect(model.actions.map((action) => action.kind)).toEqual([
			"copy",
			"dismiss",
			"open",
			"open-in-new-tab",
			"pin",
		]);
	});

	it("invokes action callbacks with the right action context", () => {
		const onAction = vi.fn();
		const model = createLinkPreviewCardModel({
			href: "https://docs.de100.app/api",
			metadata,
			onAction,
			pinned: true,
		});

		const pinAction = model.actions.find((action) => action.kind === "pin");
		expect(pinAction?.label).toBe("Save");
		pinAction?.run();

		expect(onAction).toHaveBeenCalledWith("pin", {
			href: "https://docs.de100.app/api",
			metadata,
			pinned: true,
		});
	});
});
