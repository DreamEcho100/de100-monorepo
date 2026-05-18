// @refresh reload
import { MetaProvider } from "@solidjs/meta";
import { mount, StartClient } from "@solidjs/start/client";

import { bootstrapClientI18n } from "../i18n/client";

const appElem = document.getElementById("app");
if (!appElem) {
	throw new Error("app element not found");
}

bootstrapClientI18n();

mount(
	() => (
		<MetaProvider>
			<StartClient />
		</MetaProvider>
	),
	appElem,
);
