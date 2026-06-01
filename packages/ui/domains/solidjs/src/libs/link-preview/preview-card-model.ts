import type { LinkPreviewI18nConfig, LinkPreviewMetadataResponse } from "./contracts";
import { resolveLinkPreviewI18nConfig } from "./contracts";

export const linkPreviewActionKinds = [
	"copy",
	"dismiss",
	"open",
	"open-in-new-tab",
	"pin",
] as const;
export type LinkPreviewActionKind = (typeof linkPreviewActionKinds)[number];

export type LinkPreviewCardActionContext = {
	href: string;
	metadata: LinkPreviewMetadataResponse;
	pinned: boolean;
};

export type LinkPreviewCardAction = {
	kind: LinkPreviewActionKind;
	label: string;
	run: () => void;
};

export type LinkPreviewCardModel = {
	actions: LinkPreviewCardAction[];
	description: string | null;
	href: string;
	imageUrl: string | null;
	siteName: string | null;
	title: string;
};

export type LinkPreviewCardModelInput = {
	href: string;
	i18n?: Partial<LinkPreviewI18nConfig>;
	metadata: LinkPreviewMetadataResponse;
	onAction?: (action: LinkPreviewActionKind, context: LinkPreviewCardActionContext) => void;
	pinned?: boolean;
};

function actionLabel(kind: LinkPreviewActionKind, i18n: LinkPreviewI18nConfig, pinned: boolean) {
	if (kind === "open") {
		return i18n.openActionLabel;
	}

	if (kind === "open-in-new-tab") {
		return i18n.openInNewTabActionLabel;
	}

	if (kind === "copy") {
		return i18n.copyActionLabel;
	}

	if (kind === "pin") {
		return pinned ? i18n.saveActionLabel : i18n.pinActionLabel;
	}

	return i18n.dismissActionLabel;
}

export function createLinkPreviewCardModel(input: LinkPreviewCardModelInput): LinkPreviewCardModel {
	const i18n = resolveLinkPreviewI18nConfig(input.i18n);
	const pinned = input.pinned ?? false;
	const context: LinkPreviewCardActionContext = {
		href: input.href,
		metadata: input.metadata,
		pinned,
	};

	const runAction = (kind: LinkPreviewActionKind) => {
		input.onAction?.(kind, context);
	};

	return {
		actions: linkPreviewActionKinds.map((kind) => ({
			kind,
			label: actionLabel(kind, i18n, pinned),
			run: () => {
				runAction(kind);
			},
		})),
		description: input.metadata.description ?? null,
		href: input.href,
		imageUrl: input.metadata.images[0]?.url ?? null,
		siteName: input.metadata.siteName ?? null,
		title: input.metadata.title,
	};
}
