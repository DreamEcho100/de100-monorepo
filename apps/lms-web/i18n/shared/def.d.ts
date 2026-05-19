import type { enMessages } from "./messages/en.ts";

declare module "@de100/apps-lms-i18n" {
	export interface AppI18nRegister {
		translations: typeof enMessages;
		locales: ["en", "ar"];
	}
}
