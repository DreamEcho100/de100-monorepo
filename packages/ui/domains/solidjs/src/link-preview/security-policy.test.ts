import { describe, expect, it } from "vitest";

import { evaluateLinkPreviewUrl, resolveLinkPreviewSecurityPolicy } from "./security-policy";

describe("link preview security policy", () => {
	it("normalizes allowlist and default safeguards", () => {
		expect(
			resolveLinkPreviewSecurityPolicy({
				allowlist: ["https://docs.example.com", "*.de100.app"],
			}),
		).toEqual({
			allowlist: [
				{
					allowSubdomains: false,
					host: "docs.example.com",
				},
				{
					allowSubdomains: true,
					host: "de100.app",
				},
			],
			blockedHostSuffixes: [],
			enforceAllowlist: true,
			enforceHttps: true,
			ssrfProtection: {
				blockLinkLocal: true,
				blockLocalhost: true,
				blockPrivateNetworks: true,
			},
		});
	});

	it("blocks non-allowlisted and private-network destinations by default", () => {
		expect(
			evaluateLinkPreviewUrl("https://internal.example.com", {
				allowlist: ["https://docs.example.com"],
			}),
		).toEqual({
			allowed: false,
			reason: "allowlist-blocked",
		});

		expect(
			evaluateLinkPreviewUrl("https://10.0.0.8/resource", {
				allowlist: ["https://10.0.0.8"],
			}),
		).toEqual({
			allowed: false,
			reason: "private-network-blocked",
		});

		expect(
			evaluateLinkPreviewUrl("https://localhost:3000", {
				allowlist: ["https://localhost:3000"],
			}),
		).toEqual({
			allowed: false,
			reason: "localhost-blocked",
		});
	});

	it("allows configured hosts and subdomains while enforcing protocol rules", () => {
		expect(
			evaluateLinkPreviewUrl("https://de100.app/docs", {
				allowlist: ["*.de100.app"],
			}),
		).toEqual({
			allowed: true,
			matchedRule: "*.de100.app",
			reason: "allowed",
			url: new URL("https://de100.app/docs"),
		});

		expect(
			evaluateLinkPreviewUrl("https://api.de100.app/docs", {
				allowlist: ["*.de100.app"],
			}),
		).toEqual({
			allowed: true,
			matchedRule: "*.de100.app",
			reason: "allowed",
			url: new URL("https://api.de100.app/docs"),
		});

		expect(
			evaluateLinkPreviewUrl("http://de100.app/docs", {
				allowlist: ["de100.app"],
			}),
		).toEqual({
			allowed: false,
			reason: "protocol-blocked",
		});
	});
});
