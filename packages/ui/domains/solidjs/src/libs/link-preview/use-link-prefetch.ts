import { createMemo, createSignal, onCleanup, onMount } from "solid-js";

import type { LinkPreviewTriggerMode } from "./contracts";
import { resolveLinkPrefetchBehavior } from "./contracts";
import type { ForesightManagerOptions, ForesightRegistrationHandle } from "./foresight-manager";
import { initializeForesightManager, registerForesightLink } from "./foresight-manager";

export type LinkPrefetchInvocation = {
	href: string;
	timestamp: Date;
	trigger: LinkPreviewTriggerMode;
};

export type LinkPrefetchInput = {
	behavior?: "focus" | "immediate" | "intent";
	elementName?: string;
	enabled?: boolean;
	focusDelayMs?: number;
	hitSlop?: number | { bottom: number; left: number; right: number; top: number };
	href: string;
	intentDelayMs?: number;
	minimumConnectionType?: ForesightManagerOptions["minimumConnectionType"];
	onPrefetch: (event: LinkPrefetchInvocation) => Promise<void> | void;
	reactivateAfterMs?: number;
	touchStrategy?: "none" | "onTouchStart" | "viewport";
};

export type LinkPrefetchControllerSnapshot = {
	lastTrigger: LinkPreviewTriggerMode | null;
	prefetched: boolean;
	registered: boolean;
};

export type LinkPrefetchControllerDependencies = {
	initializeManager?: (options?: ForesightManagerOptions) => Promise<void> | void;
	now?: () => Date;
	registerForesight?: (
		options: Parameters<typeof registerForesightLink>[0],
	) => Promise<ForesightRegistrationHandle>;
	schedule?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
	unschedule?: (id: ReturnType<typeof setTimeout>) => void;
};

export type LinkPrefetchController = {
	getSnapshot: () => LinkPrefetchControllerSnapshot;
	handleFocus: () => void;
	handleTouchStart: () => void;
	register: (element: Element | null) => Promise<void>;
	reset: () => void;
	unregister: () => void;
};

export function createLinkPrefetchController(
	input: LinkPrefetchInput,
	dependencies: LinkPrefetchControllerDependencies = {},
): LinkPrefetchController {
	const resolved = resolveLinkPrefetchBehavior({
		behavior: input.behavior,
		enabled: input.enabled,
		focusDelayMs: input.focusDelayMs,
		intentDelayMs: input.intentDelayMs,
		minimumConnectionType: input.minimumConnectionType,
		reactivateAfterMs: input.reactivateAfterMs,
		touchStrategy: input.touchStrategy,
	});
	const initializeManager = dependencies.initializeManager ?? initializeForesightManager;
	const registerForesight = dependencies.registerForesight ?? registerForesightLink;
	const now = dependencies.now ?? (() => new Date());
	const schedule = dependencies.schedule ?? ((callback, delayMs) => setTimeout(callback, delayMs));
	const unschedule = dependencies.unschedule ?? ((id) => clearTimeout(id));

	let prefetched = false;
	let lastTrigger: LinkPreviewTriggerMode | null = null;
	let registered = false;
	let foresightHandle: ForesightRegistrationHandle | null = null;
	let scheduledPrefetch: ReturnType<typeof setTimeout> | null = null;

	const clearScheduledPrefetch = () => {
		if (scheduledPrefetch) {
			unschedule(scheduledPrefetch);
			scheduledPrefetch = null;
		}
	};

	const invokePrefetch = (trigger: LinkPreviewTriggerMode) => {
		if (prefetched || !resolved.enabled) {
			return;
		}

		prefetched = true;
		lastTrigger = trigger;
		void input.onPrefetch({
			href: input.href,
			timestamp: now(),
			trigger,
		});
	};

	const schedulePrefetch = (trigger: LinkPreviewTriggerMode, delayMs: number) => {
		clearScheduledPrefetch();
		scheduledPrefetch = schedule(() => {
			invokePrefetch(trigger);
			scheduledPrefetch = null;
		}, delayMs);
	};

	const triggerFromForesight = () => {
		if (resolved.behavior === "intent") {
			schedulePrefetch("intent", resolved.intentDelayMs);
		}
	};

	return {
		getSnapshot: () => ({
			lastTrigger,
			prefetched,
			registered,
		}),
		handleFocus: () => {
			if (!registered) {
				return;
			}

			if (resolved.behavior === "focus" || resolved.behavior === "intent") {
				schedulePrefetch("focus", resolved.focusDelayMs);
			}
		},
		handleTouchStart: () => {
			if (!registered || resolved.touchStrategy !== "onTouchStart") {
				return;
			}

			schedulePrefetch("touch", 0);
		},
		register: async (element) => {
			if (!resolved.enabled || !element || registered) {
				return;
			}

			registered = true;

			if (resolved.behavior === "immediate") {
				invokePrefetch("immediate");
				return;
			}

			await initializeManager({
				minimumConnectionType: resolved.minimumConnectionType,
				touchStrategy: resolved.touchStrategy,
			});

			foresightHandle = await registerForesight({
				callback: triggerFromForesight,
				element,
				hitSlop: input.hitSlop,
				name: input.elementName ?? `link:${input.href}`,
				meta: {
					href: input.href,
				},
				reactivateAfterMs: resolved.reactivateAfterMs,
			});
		},
		reset: () => {
			prefetched = false;
			lastTrigger = null;
		},
		unregister: () => {
			clearScheduledPrefetch();
			foresightHandle?.unregister();
			foresightHandle = null;
			registered = false;
		},
	};
}

export function useLinkPrefetch(
	input: LinkPrefetchInput,
	dependencies: LinkPrefetchControllerDependencies = {},
) {
	const controller = createLinkPrefetchController(input, dependencies);
	const [element, setElement] = createSignal<Element | null>(null);
	const [snapshot, setSnapshot] = createSignal<LinkPrefetchControllerSnapshot>(
		controller.getSnapshot(),
	);

	const syncSnapshot = () => {
		setSnapshot(controller.getSnapshot());
	};

	const registerElement = async () => {
		await controller.register(element());
		syncSnapshot();
	};

	onMount(() => {
		void registerElement();
	});

	onCleanup(() => {
		controller.unregister();
		syncSnapshot();
	});

	return {
		controller,
		handleFocus: () => {
			controller.handleFocus();
			syncSnapshot();
		},
		handleTouchStart: () => {
			controller.handleTouchStart();
			syncSnapshot();
		},
		registerElement: setElement,
		snapshot: createMemo(snapshot),
	};
}
