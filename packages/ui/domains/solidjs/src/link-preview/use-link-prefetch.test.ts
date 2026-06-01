import { afterEach, describe, expect, it, vi } from "vitest";

import type { LinkPrefetchControllerDependencies } from "./use-link-prefetch";
import { createLinkPrefetchController } from "./use-link-prefetch";

type RegisterForesight = NonNullable<LinkPrefetchControllerDependencies["registerForesight"]>;

describe("createLinkPrefetchController", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("registers and unregisters foresight lifecycle for intent behavior", async () => {
		vi.useFakeTimers();
		const onPrefetch = vi.fn();
		const unregister = vi.fn();
		const initializeManager = vi.fn();
		const registerForesightSpy = vi.fn(async (_options: unknown) => {
			return {
				isLimitedConnection: false,
				isRegistered: true,
				isTouchDevice: false,
				unregister,
			};
		});
		const registerForesight: RegisterForesight = registerForesightSpy;

		const controller = createLinkPrefetchController(
			{
				href: "https://docs.de100.app/api",
				intentDelayMs: 40,
				onPrefetch,
			},
			{
				initializeManager,
				registerForesight,
			},
		);

		await controller.register({} as Element);
		expect(initializeManager).toHaveBeenCalledTimes(1);
		expect(registerForesightSpy).toHaveBeenCalledTimes(1);
		expect(controller.getSnapshot().registered).toBe(true);

		const registerOptions = registerForesightSpy.mock.calls[0]?.[0] as
			| {
					callback: (element?: unknown) => void;
			  }
			| undefined;
		if (!registerOptions?.callback) {
			throw new Error("Expected intent registration callback to be available.");
		}

		registerOptions.callback({});
		vi.advanceTimersByTime(39);
		expect(onPrefetch).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(onPrefetch).toHaveBeenCalledWith(
			expect.objectContaining({
				href: "https://docs.de100.app/api",
				trigger: "intent",
			}),
		);
		expect(controller.getSnapshot().lastTrigger).toBe("intent");

		controller.unregister();
		expect(unregister).toHaveBeenCalledTimes(1);
		expect(controller.getSnapshot().registered).toBe(false);
	});

	it("switches trigger behavior across immediate, focus, and touch modes", async () => {
		vi.useFakeTimers();
		const immediatePrefetch = vi.fn();
		const immediateController = createLinkPrefetchController({
			behavior: "immediate",
			href: "https://docs.de100.app/immediate",
			onPrefetch: immediatePrefetch,
		});
		await immediateController.register({} as Element);
		expect(immediatePrefetch).toHaveBeenCalledWith(
			expect.objectContaining({
				trigger: "immediate",
			}),
		);

		const focusPrefetch = vi.fn();
		const focusController = createLinkPrefetchController({
			behavior: "focus",
			focusDelayMs: 15,
			href: "https://docs.de100.app/focus",
			onPrefetch: focusPrefetch,
		});
		await focusController.register({} as Element);
		focusController.handleFocus();
		vi.advanceTimersByTime(14);
		expect(focusPrefetch).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(focusPrefetch).toHaveBeenCalledWith(
			expect.objectContaining({
				trigger: "focus",
			}),
		);

		const touchPrefetch = vi.fn();
		const touchController = createLinkPrefetchController({
			href: "https://docs.de100.app/touch",
			onPrefetch: touchPrefetch,
			touchStrategy: "onTouchStart",
		});
		await touchController.register({} as Element);
		touchController.handleTouchStart();
		vi.runAllTimers();
		expect(touchPrefetch).toHaveBeenCalledWith(
			expect.objectContaining({
				trigger: "touch",
			}),
		);
	});
});
