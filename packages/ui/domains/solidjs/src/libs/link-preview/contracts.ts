import type { MinimumConnectionType } from "js.foresight";
import { z } from "zod";

export const linkPreviewPrefetchBehaviors = ["focus", "immediate", "intent"] as const;
export type LinkPreviewPrefetchBehavior = (typeof linkPreviewPrefetchBehaviors)[number];

export const linkPreviewTouchStrategies = ["none", "onTouchStart", "viewport"] as const;
export type LinkPreviewTouchStrategy = (typeof linkPreviewTouchStrategies)[number];

export const linkPreviewTriggerModes = ["focus", "immediate", "intent", "touch"] as const;
export type LinkPreviewTriggerMode = (typeof linkPreviewTriggerModes)[number];

export type LinkPreviewI18nConfig = {
	copyActionLabel: string;
	dismissActionLabel: string;
	openActionLabel: string;
	openInNewTabActionLabel: string;
	pinActionLabel: string;
	saveActionLabel: string;
	unavailableMessage: string;
};

export const linkPreviewI18nDefaults: LinkPreviewI18nConfig = {
	copyActionLabel: "Copy",
	dismissActionLabel: "Dismiss",
	openActionLabel: "Open",
	openInNewTabActionLabel: "Open in new tab",
	pinActionLabel: "Pin",
	saveActionLabel: "Save",
	unavailableMessage: "Preview unavailable",
};

export type LinkPrefetchBehaviorInput = {
	behavior?: LinkPreviewPrefetchBehavior;
	enabled?: boolean;
	focusDelayMs?: number;
	intentDelayMs?: number;
	minimumConnectionType?: MinimumConnectionType;
	reactivateAfterMs?: number;
	touchStrategy?: LinkPreviewTouchStrategy;
};

export type ResolvedLinkPrefetchBehavior = {
	behavior: LinkPreviewPrefetchBehavior;
	enabled: boolean;
	focusDelayMs: number;
	intentDelayMs: number;
	minimumConnectionType: MinimumConnectionType;
	reactivateAfterMs: number;
	touchStrategy: LinkPreviewTouchStrategy;
};

export const linkPreviewMetadataRequestSchema = z.object({
	locale: z.string().trim().min(2).max(24).optional(),
	referrer: z.string().url().optional(),
	url: z.string().url(),
});

export type LinkPreviewMetadataRequest = z.infer<typeof linkPreviewMetadataRequestSchema>;

export const linkPreviewMetadataImageSchema = z.object({
	alt: z.string().trim().min(1).optional(),
	height: z.number().int().positive().optional(),
	url: z.string().url(),
	width: z.number().int().positive().optional(),
});

export const linkPreviewMetadataResponseSchema = z.object({
	canonicalUrl: z.string().url().optional(),
	description: z.string().trim().min(1).optional(),
	expiresAt: z.string().datetime().optional(),
	images: z.array(linkPreviewMetadataImageSchema).default([]),
	locale: z.string().trim().min(2).max(24).optional(),
	publishedAt: z.string().datetime().optional(),
	siteName: z.string().trim().min(1).optional(),
	title: z.string().trim().min(1),
	url: z.string().url(),
});

export type LinkPreviewMetadataResponse = z.infer<typeof linkPreviewMetadataResponseSchema>;

export function parseLinkPreviewMetadataRequest(value: unknown): LinkPreviewMetadataRequest {
	return linkPreviewMetadataRequestSchema.parse(value);
}

export function parseLinkPreviewMetadataResponse(value: unknown): LinkPreviewMetadataResponse {
	return linkPreviewMetadataResponseSchema.parse(value);
}

function assertNonNegativeInteger(value: number, field: string) {
	if (!Number.isInteger(value) || value < 0) {
		throw new Error(`${field} must be a non-negative integer.`);
	}
}

function assertNonEmpty(value: string, field: string) {
	if (value.trim().length === 0) {
		throw new Error(`${field} cannot be empty.`);
	}
}

export function resolveLinkPreviewI18nConfig(
	input: Partial<LinkPreviewI18nConfig> = {},
): LinkPreviewI18nConfig {
	const resolved: LinkPreviewI18nConfig = {
		copyActionLabel: input.copyActionLabel ?? linkPreviewI18nDefaults.copyActionLabel,
		dismissActionLabel: input.dismissActionLabel ?? linkPreviewI18nDefaults.dismissActionLabel,
		openActionLabel: input.openActionLabel ?? linkPreviewI18nDefaults.openActionLabel,
		openInNewTabActionLabel:
			input.openInNewTabActionLabel ?? linkPreviewI18nDefaults.openInNewTabActionLabel,
		pinActionLabel: input.pinActionLabel ?? linkPreviewI18nDefaults.pinActionLabel,
		saveActionLabel: input.saveActionLabel ?? linkPreviewI18nDefaults.saveActionLabel,
		unavailableMessage: input.unavailableMessage ?? linkPreviewI18nDefaults.unavailableMessage,
	};

	assertNonEmpty(resolved.openActionLabel, "i18n.openActionLabel");
	assertNonEmpty(resolved.openInNewTabActionLabel, "i18n.openInNewTabActionLabel");
	assertNonEmpty(resolved.copyActionLabel, "i18n.copyActionLabel");
	assertNonEmpty(resolved.pinActionLabel, "i18n.pinActionLabel");
	assertNonEmpty(resolved.dismissActionLabel, "i18n.dismissActionLabel");
	assertNonEmpty(resolved.saveActionLabel, "i18n.saveActionLabel");
	assertNonEmpty(resolved.unavailableMessage, "i18n.unavailableMessage");

	return resolved;
}

export function resolveLinkPrefetchBehavior(
	input: LinkPrefetchBehaviorInput = {},
): ResolvedLinkPrefetchBehavior {
	const resolved: ResolvedLinkPrefetchBehavior = {
		behavior: input.behavior ?? "intent",
		enabled: input.enabled ?? true,
		focusDelayMs: input.focusDelayMs ?? 0,
		intentDelayMs: input.intentDelayMs ?? 80,
		minimumConnectionType: input.minimumConnectionType ?? "3g",
		reactivateAfterMs: input.reactivateAfterMs ?? Number.POSITIVE_INFINITY,
		touchStrategy: input.touchStrategy ?? "onTouchStart",
	};

	assertNonNegativeInteger(resolved.focusDelayMs, "focusDelayMs");
	assertNonNegativeInteger(resolved.intentDelayMs, "intentDelayMs");

	if (Number.isFinite(resolved.reactivateAfterMs)) {
		assertNonNegativeInteger(resolved.reactivateAfterMs, "reactivateAfterMs");
	}

	return resolved;
}
