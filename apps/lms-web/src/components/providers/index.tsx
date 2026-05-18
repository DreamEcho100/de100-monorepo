import { I18nProvider } from "@de100/apps-lms-i18n";
import { Toaster } from "@de100/ui-solidjs";
import { QueryClientProvider } from "@tanstack/solid-query";
import { SolidQueryDevtools } from "@tanstack/solid-query-devtools";
import type { ParentProps } from "solid-js";
import { getRequestEvent, isServer } from "solid-js/web";

import { getQueryClient } from "~/libs/@tanstack/query/query-client.js";

import { getClientAppI18nSnapshot } from "../../../i18n/client";
import { getServerAppI18nState } from "../../../i18n/server";
import { appLocales } from "../../../i18n/shared";

export default function Providers(props: ParentProps) {
	const queryClient = getQueryClient();
	const initialSnapshot = isServer
		? getServerAppI18nState(getRequestEvent()?.request).initialSnapshot
		: getClientAppI18nSnapshot();

	return (
		<I18nProvider initialSnapshot={initialSnapshot} locales={appLocales}>
			<QueryClientProvider client={queryClient}>
				{props.children}
				<SolidQueryDevtools />
				<Toaster />
			</QueryClientProvider>
		</I18nProvider>
	);
}
