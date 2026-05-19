import { applyDocumentSnapshot, readDocumentSnapshot } from "@de100/i18n-core/client";

import { i18nDefaultLocale, i18nLocalCodeToDef, i18nLocales } from "../shared";

export function getClientAppI18nSnapshot() {
	return readDocumentSnapshot({
		defaultLocale: i18nDefaultLocale,
		locales: i18nLocales,
		codeToI18nLocales: i18nLocalCodeToDef,
	});
}

export function bootstrapClientI18n() {
	const snapshot = getClientAppI18nSnapshot();

	applyDocumentSnapshot(snapshot);

	return snapshot;
}
