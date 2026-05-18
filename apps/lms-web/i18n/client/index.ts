import { applyDocumentSnapshot, readDocumentSnapshot } from "@de100/apps-lms-i18n";

import { appLocales, defaultLocale } from "../shared";

export function getClientAppI18nSnapshot() {
	return readDocumentSnapshot({
		defaultLocale,
		locales: appLocales,
	});
}

export function bootstrapClientI18n() {
	const snapshot = getClientAppI18nSnapshot();

	applyDocumentSnapshot(snapshot);

	return snapshot;
}
