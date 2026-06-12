import type { enMessages } from "./messages/en.ts";

declare module "@de100/i18n-core/shared" {
	export interface I18nRegister {
		translations: typeof enMessages;
		locales: ["en", "ar"];
	}
}
