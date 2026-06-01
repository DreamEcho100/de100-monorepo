import type {
	ForesightRegisterOptions,
	ForesightRegisterOptionsWithoutElement,
	ForesightRegisterResult,
	HitSlop,
	UpdateForsightManagerSettings,
} from "js.foresight";

import type { LinkPreviewTouchStrategy } from "./contracts";

type ForesightRuntime = {
	alterGlobalSettings: (settings?: Partial<UpdateForsightManagerSettings>) => void;
	initialize: (settings?: Partial<UpdateForsightManagerSettings>) => void;
	register: (options: ForesightRegisterOptions) => ForesightRegisterResult;
	unregister: (element: Element) => void;
};

type ForesightRuntimeLoader = () => Promise<ForesightRuntime>;

export type ForesightManagerOptions = {
	enableManagerLogging?: boolean;
	minimumConnectionType?: UpdateForsightManagerSettings["minimumConnectionType"];
	touchStrategy?: LinkPreviewTouchStrategy;
};

export type RegisterForesightLinkOptions = Pick<
	ForesightRegisterOptionsWithoutElement,
	"callback" | "hitSlop" | "meta" | "name"
> & {
	element: Element;
	reactivateAfterMs?: number;
};

export type ForesightRegistrationHandle = {
	isLimitedConnection: boolean;
	isRegistered: boolean;
	isTouchDevice: boolean;
	unregister: () => void;
};

let cachedLoaderPromise: Promise<ForesightRuntime> | null = null;

function toTouchDeviceStrategy(touchStrategy: LinkPreviewTouchStrategy | undefined) {
	if (touchStrategy === "none") {
		return "none";
	}

	if (touchStrategy === "viewport") {
		return "viewport";
	}

	return "onTouchStart";
}

async function loadDefaultRuntime(): Promise<ForesightRuntime> {
	const module = await import("js.foresight");
	return {
		alterGlobalSettings: (settings) =>
			module.ForesightManager.instance.alterGlobalSettings(settings),
		initialize: (settings) => {
			module.ForesightManager.initialize(settings);
		},
		register: (options) => module.ForesightManager.instance.register(options),
		unregister: (element) => {
			module.ForesightManager.instance.unregister(element, "apiCall");
		},
	};
}

async function resolveRuntime(loader?: ForesightRuntimeLoader) {
	if (loader) {
		return loader();
	}

	if (!cachedLoaderPromise) {
		cachedLoaderPromise = loadDefaultRuntime();
	}

	return cachedLoaderPromise;
}

function toForesightSettings(
	options: ForesightManagerOptions = {},
): Partial<UpdateForsightManagerSettings> {
	return {
		enableManagerLogging: options.enableManagerLogging,
		minimumConnectionType: options.minimumConnectionType,
		touchDeviceStrategy: toTouchDeviceStrategy(options.touchStrategy),
	};
}

function toForesightRegisterOptions(input: RegisterForesightLinkOptions): ForesightRegisterOptions {
	const options: ForesightRegisterOptions = {
		callback: input.callback,
		element: input.element,
	};

	if (input.hitSlop !== undefined) {
		options.hitSlop = input.hitSlop as HitSlop;
	}

	if (input.meta) {
		options.meta = input.meta;
	}

	if (input.name) {
		options.name = input.name;
	}

	if (input.reactivateAfterMs !== undefined) {
		options.reactivateAfter = input.reactivateAfterMs;
	}

	return options;
}

export async function initializeForesightManager(
	options: ForesightManagerOptions = {},
	runtimeLoader?: ForesightRuntimeLoader,
) {
	if (typeof window === "undefined" && !runtimeLoader) {
		return;
	}

	const runtime = await resolveRuntime(runtimeLoader);
	runtime.initialize(toForesightSettings(options));
}

export async function updateForesightManagerSettings(
	options: ForesightManagerOptions = {},
	runtimeLoader?: ForesightRuntimeLoader,
) {
	if (typeof window === "undefined" && !runtimeLoader) {
		return;
	}

	const runtime = await resolveRuntime(runtimeLoader);
	runtime.alterGlobalSettings(toForesightSettings(options));
}

export async function registerForesightLink(
	input: RegisterForesightLinkOptions,
	runtimeLoader?: ForesightRuntimeLoader,
): Promise<ForesightRegistrationHandle> {
	if (typeof window === "undefined" && !runtimeLoader) {
		return {
			isLimitedConnection: false,
			isRegistered: false,
			isTouchDevice: false,
			unregister: () => {},
		};
	}

	const runtime = await resolveRuntime(runtimeLoader);
	const result = runtime.register(toForesightRegisterOptions(input));

	return {
		isLimitedConnection: result.isLimitedConnection,
		isRegistered: result.isRegistered,
		isTouchDevice: result.isTouchDevice,
		unregister: () => {
			runtime.unregister(input.element);
		},
	};
}
