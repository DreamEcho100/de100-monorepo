import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("ui domains package resolution", () => {
	it("resolves the package root export", () => {
		const resolved = require.resolve("@de100/ui-domains-solidjs");
		expect(resolved.endsWith("packages/ui/domains/solidjs/src/index.ts")).toBe(true);
	});

	it("resolves a key subpath export", () => {
		const resolved = require.resolve("@de100/ui-domains-solidjs/libs/utils.ts");
		expect(resolved.endsWith("packages/ui/domains/solidjs/src/libs/utils.ts")).toBe(true);
	});

	it("resolves the shared base stylesheet export", () => {
		const resolved = require.resolve("@de100/ui-domains-solidjs/styles/base.css");
		expect(resolved.endsWith("packages/ui/domains/solidjs/src/styles/base.css")).toBe(true);
	});

	it("resolves the ui-shared base stylesheet export", () => {
		const resolved = require.resolve("@de100/ui-shared/styles/base.css");
		expect(resolved.endsWith("packages/ui/shared/src/styles/base.css")).toBe(true);
	});

	it("resolves image component exports for Phase 5 adoption", () => {
		const imageComponent = require.resolve("@de100/ui-domains-solidjs/components/image.tsx");
		const artDirectedComponent = require.resolve(
			"@de100/ui-domains-solidjs/components/art-directed-image.tsx",
		);
		const imageContracts = require.resolve("@de100/ui-domains-solidjs/image/contracts.ts");

		expect(imageComponent.endsWith("packages/ui/domains/solidjs/src/components/image.tsx")).toBe(
			true,
		);
		expect(
			artDirectedComponent.endsWith(
				"packages/ui/domains/solidjs/src/components/art-directed-image.tsx",
			),
		).toBe(true);
		expect(imageContracts.endsWith("packages/ui/domains/solidjs/src/image/contracts.ts")).toBe(
			true,
		);
	});

	it("resolves link preview contract exports for Phase 6 adoption", () => {
		const linkPreviewContracts = require.resolve(
			"@de100/ui-domains-solidjs/link-preview/contracts.ts",
		);
		const linkPreviewSecurity = require.resolve(
			"@de100/ui-domains-solidjs/link-preview/security-policy.ts",
		);
		const linkPreviewSecurityLib = require.resolve(
			"@de100/ui-domains-solidjs/libs/link-preview/security-policy.ts",
		);

		expect(
			linkPreviewContracts.endsWith("packages/ui/domains/solidjs/src/link-preview/contracts.ts"),
		).toBe(true);
		expect(
			linkPreviewSecurity.endsWith(
				"packages/ui/domains/solidjs/src/link-preview/security-policy.ts",
			),
		).toBe(true);
		expect(
			linkPreviewSecurityLib.endsWith(
				"packages/ui/domains/solidjs/src/libs/link-preview/security-policy.ts",
			),
		).toBe(true);
	});

	it("resolves typography exports for Phase 7 adoption", () => {
		const typographyComponent = require.resolve(
			"@de100/ui-domains-solidjs/components/typography.tsx",
		);
		const typographyContracts = require.resolve(
			"@de100/ui-domains-solidjs/typography/contracts.ts",
		);
		const typographyContractsLib = require.resolve(
			"@de100/ui-domains-solidjs/libs/typography/contracts.ts",
		);
		const typographyVariants = require.resolve("@de100/ui-domains-solidjs/typography/variants.ts");

		expect(
			typographyComponent.endsWith("packages/ui/domains/solidjs/src/components/typography.tsx"),
		).toBe(true);
		expect(
			typographyContracts.endsWith("packages/ui/domains/solidjs/src/typography/contracts.ts"),
		).toBe(true);
		expect(
			typographyContractsLib.endsWith(
				"packages/ui/domains/solidjs/src/libs/typography/contracts.ts",
			),
		).toBe(true);
		expect(
			typographyVariants.endsWith("packages/ui/domains/solidjs/src/typography/variants.ts"),
		).toBe(true);
	});

	it("resolves uploader exports through transitional and libs paths", () => {
		const uploaderComponent = require.resolve("@de100/ui-domains-solidjs/components/uploader.tsx");
		const uploaderContracts = require.resolve("@de100/ui-domains-solidjs/uploader/contracts.ts");
		const uploaderContractsLib = require.resolve(
			"@de100/ui-domains-solidjs/libs/uploader/contracts.ts",
		);

		expect(
			uploaderComponent.endsWith("packages/ui/domains/solidjs/src/components/uploader.tsx"),
		).toBe(true);
		expect(
			uploaderContracts.endsWith("packages/ui/domains/solidjs/src/uploader/contracts.ts"),
		).toBe(true);
		expect(
			uploaderContractsLib.endsWith("packages/ui/domains/solidjs/src/libs/uploader/contracts.ts"),
		).toBe(true);
	});
});
