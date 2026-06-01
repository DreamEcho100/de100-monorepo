export type LinkPreviewAllowlistRule = {
	allowSubdomains: boolean;
	host: string;
};

export type LinkPreviewSecurityPolicyInput = {
	allowlist?: string[];
	blockedHostSuffixes?: string[];
	enforceAllowlist?: boolean;
	enforceHttps?: boolean;
	ssrfProtection?: {
		blockLinkLocal?: boolean;
		blockLocalhost?: boolean;
		blockPrivateNetworks?: boolean;
	};
};

export type ResolvedLinkPreviewSecurityPolicy = {
	allowlist: LinkPreviewAllowlistRule[];
	blockedHostSuffixes: string[];
	enforceAllowlist: boolean;
	enforceHttps: boolean;
	ssrfProtection: {
		blockLinkLocal: boolean;
		blockLocalhost: boolean;
		blockPrivateNetworks: boolean;
	};
};

export type LinkPreviewSecurityDecision =
	| {
			allowed: true;
			matchedRule?: string;
			reason: "allowed";
			url: URL;
	  }
	| {
			allowed: false;
			reason:
				| "allowlist-blocked"
				| "blocked-host-suffix"
				| "invalid-url"
				| "link-local-address"
				| "localhost-blocked"
				| "private-network-blocked"
				| "protocol-blocked";
	  };

const localhostNames = new Set(["localhost", "localhost.localdomain"]);

function normalizeHost(value: string) {
	return value.trim().toLowerCase();
}

function isIPv4Literal(host: string) {
	const parts = host.split(".");
	if (parts.length !== 4) {
		return false;
	}

	for (const part of parts) {
		if (!/^\d+$/.test(part)) {
			return false;
		}

		const numeric = Number(part);
		if (numeric < 0 || numeric > 255) {
			return false;
		}
	}

	return true;
}

function isPrivateIPv4(host: string) {
	if (!isIPv4Literal(host)) {
		return false;
	}

	const [first, second] = host.split(".").map((part) => Number(part));
	if (first === undefined || second === undefined) {
		return false;
	}

	if (first === 10 || first === 127 || first === 0) {
		return true;
	}

	if (first === 169 && second === 254) {
		return true;
	}

	if (first === 172 && second >= 16 && second <= 31) {
		return true;
	}

	if (first === 192 && second === 168) {
		return true;
	}

	return false;
}

function isIPv6Literal(host: string) {
	return host.includes(":");
}

function isPrivateIPv6(host: string) {
	const normalized = host.toLowerCase();
	if (normalized === "::1") {
		return true;
	}

	if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
		return true;
	}

	if (
		normalized.startsWith("fe8") ||
		normalized.startsWith("fe9") ||
		normalized.startsWith("fea")
	) {
		return true;
	}

	if (normalized.startsWith("feb")) {
		return true;
	}

	return false;
}

function normalizeAllowlistRule(rule: string): LinkPreviewAllowlistRule {
	const trimmed = rule.trim();
	if (trimmed.length === 0) {
		throw new Error("allowlist entries cannot be empty.");
	}

	const hostCandidate = trimmed.includes("://") ? new URL(trimmed).hostname : trimmed;
	const host = normalizeHost(
		hostCandidate.startsWith("*.") ? hostCandidate.slice(2) : hostCandidate,
	);
	if (host.length === 0) {
		throw new Error("allowlist host cannot be empty.");
	}

	return {
		allowSubdomains: hostCandidate.startsWith("*."),
		host,
	};
}

function normalizeBlockedSuffix(value: string) {
	const suffix = normalizeHost(value.replace(/^\./, ""));
	if (suffix.length === 0) {
		throw new Error("blocked host suffix entries cannot be empty.");
	}

	return suffix;
}

export function resolveLinkPreviewSecurityPolicy(
	input: LinkPreviewSecurityPolicyInput = {},
): ResolvedLinkPreviewSecurityPolicy {
	return {
		allowlist: (input.allowlist ?? []).map(normalizeAllowlistRule),
		blockedHostSuffixes: (input.blockedHostSuffixes ?? []).map(normalizeBlockedSuffix),
		enforceAllowlist: input.enforceAllowlist ?? true,
		enforceHttps: input.enforceHttps ?? true,
		ssrfProtection: {
			blockLinkLocal: input.ssrfProtection?.blockLinkLocal ?? true,
			blockLocalhost: input.ssrfProtection?.blockLocalhost ?? true,
			blockPrivateNetworks: input.ssrfProtection?.blockPrivateNetworks ?? true,
		},
	};
}

function hostMatchesRule(host: string, rule: LinkPreviewAllowlistRule) {
	if (host === rule.host) {
		return true;
	}

	return rule.allowSubdomains && host.endsWith(`.${rule.host}`);
}

function hostIsLocalhost(host: string) {
	if (localhostNames.has(host)) {
		return true;
	}

	return host.endsWith(".localhost") || host.endsWith(".localdomain");
}

function hostIsLinkLocal(host: string) {
	if (host.endsWith(".local")) {
		return true;
	}

	return host.startsWith("169.254.") || host.startsWith("fe80:");
}

export function evaluateLinkPreviewUrl(
	input: string | URL,
	policyInput: LinkPreviewSecurityPolicyInput = {},
): LinkPreviewSecurityDecision {
	const policy = resolveLinkPreviewSecurityPolicy(policyInput);
	const parsed = (() => {
		try {
			return input instanceof URL ? input : new URL(input);
		} catch {
			return null;
		}
	})();

	if (!parsed) {
		return {
			allowed: false,
			reason: "invalid-url",
		};
	}

	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		return {
			allowed: false,
			reason: "protocol-blocked",
		};
	}

	if (policy.enforceHttps && parsed.protocol !== "https:") {
		return {
			allowed: false,
			reason: "protocol-blocked",
		};
	}

	const host = normalizeHost(parsed.hostname);

	for (const suffix of policy.blockedHostSuffixes) {
		if (host === suffix || host.endsWith(`.${suffix}`)) {
			return {
				allowed: false,
				reason: "blocked-host-suffix",
			};
		}
	}

	if (policy.ssrfProtection.blockLocalhost && hostIsLocalhost(host)) {
		return {
			allowed: false,
			reason: "localhost-blocked",
		};
	}

	if (policy.ssrfProtection.blockLinkLocal && hostIsLinkLocal(host)) {
		return {
			allowed: false,
			reason: "link-local-address",
		};
	}

	if (policy.ssrfProtection.blockPrivateNetworks) {
		if (isPrivateIPv4(host) || (isIPv6Literal(host) && isPrivateIPv6(host))) {
			return {
				allowed: false,
				reason: "private-network-blocked",
			};
		}
	}

	if (policy.enforceAllowlist) {
		const matchedRule = policy.allowlist.find((rule) => hostMatchesRule(host, rule));
		if (!matchedRule) {
			return {
				allowed: false,
				reason: "allowlist-blocked",
			};
		}

		return {
			allowed: true,
			matchedRule: matchedRule.allowSubdomains ? `*.${matchedRule.host}` : matchedRule.host,
			reason: "allowed",
			url: parsed,
		};
	}

	return {
		allowed: true,
		reason: "allowed",
		url: parsed,
	};
}
