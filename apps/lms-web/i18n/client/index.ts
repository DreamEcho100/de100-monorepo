import { applyDocumentSnapshot, readDocumentSnapshot } from "@de100/apps-lms-i18n";

import { appI18nDefaultLocale, appI18nLocalCodeToDef, appI18nLocales } from "../shared";

export function getClientAppAppI18nSnapshot() {
	return readDocumentSnapshot({
		defaultLocale: appI18nDefaultLocale,
		locales: appI18nLocales,
		codeToAppI18nLocales: appI18nLocalCodeToDef,
	});
}

export function bootstrapClientI18n() {
	const snapshot = getClientAppAppI18nSnapshot();

	applyDocumentSnapshot(snapshot);

	return snapshot;
}
