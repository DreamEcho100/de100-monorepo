export type UploadTransportMode = "xhr" | "tus" | "auto";

export type UploadResolvedTransport = "xhr" | "tus";

export type NetworkQuality = "offline" | "slow-2g" | "2g" | "3g" | "4g" | "unknown";

export type UploaderAutoTransportConfig = {
	minNetworkQuality: NetworkQuality;
	preferTusWhenOnCellular: boolean;
	tusMinBytes: number;
};

export type UploadTransportResolutionContext = {
	fileBytes: number;
	isCellularConnection?: boolean;
	networkQuality: NetworkQuality;
	supportsTus: boolean;
	supportsXhr: boolean;
};

export type UploadTransportDecision = {
	reason: string;
	transport: UploadResolvedTransport;
};

const networkQualityRank: Record<NetworkQuality, number> = {
	"2g": 2,
	"3g": 3,
	"4g": 4,
	offline: 0,
	"slow-2g": 1,
	unknown: 2,
};

export function isNetworkQualityAtLeast(current: NetworkQuality, minimum: NetworkQuality): boolean {
	return networkQualityRank[current] >= networkQualityRank[minimum];
}

function resolveAutoTransport(
	context: UploadTransportResolutionContext,
	autoConfig: UploaderAutoTransportConfig,
): UploadTransportDecision {
	if (!context.supportsTus && !context.supportsXhr) {
		throw new Error("No supported upload transport is available.");
	}

	if (!context.supportsTus) {
		return {
			reason: "Tus transport is unavailable, using XHR.",
			transport: "xhr",
		};
	}

	if (!context.supportsXhr) {
		return {
			reason: "XHR transport is unavailable, using Tus.",
			transport: "tus",
		};
	}

	if (context.networkQuality === "offline") {
		return {
			reason: "Offline network quality forces XHR queue flow.",
			transport: "xhr",
		};
	}

	if (context.fileBytes < autoConfig.tusMinBytes) {
		return {
			reason: "File size is below Tus threshold, using XHR.",
			transport: "xhr",
		};
	}

	if (!isNetworkQualityAtLeast(context.networkQuality, autoConfig.minNetworkQuality)) {
		return {
			reason: "Network quality below Tus threshold, using XHR.",
			transport: "xhr",
		};
	}

	if (context.isCellularConnection && !autoConfig.preferTusWhenOnCellular) {
		return {
			reason: "Cellular connection prefers XHR by policy.",
			transport: "xhr",
		};
	}

	return {
		reason: "Auto policy selected Tus.",
		transport: "tus",
	};
}

export function selectUploadTransport(
	mode: UploadTransportMode,
	context: UploadTransportResolutionContext,
	autoConfig: UploaderAutoTransportConfig,
): UploadTransportDecision {
	if (mode === "xhr") {
		if (!context.supportsXhr) {
			throw new Error("XHR transport requested but unavailable.");
		}

		return {
			reason: "Explicit XHR transport mode.",
			transport: "xhr",
		};
	}

	if (mode === "tus") {
		if (!context.supportsTus) {
			throw new Error("Tus transport requested but unavailable.");
		}

		return {
			reason: "Explicit Tus transport mode.",
			transport: "tus",
		};
	}

	return resolveAutoTransport(context, autoConfig);
}
